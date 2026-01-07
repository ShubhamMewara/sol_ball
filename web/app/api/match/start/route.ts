import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/supabase/admin";
import { Solball } from "@/compiled/solball";
import { BN, Program } from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import IDL from "@/compiled/solball.json";
import { MatchStartBody } from "@/lib/schemas";
import { parseJson } from "@/lib/http";

export const runtime = "nodejs";

function toLamports(sol: number): number {
  // Avoid NaN, round to nearest lamport
  return Math.max(0, Math.round(sol * 1_000_000_000));
}

export async function POST(req: NextRequest) {
  console.log("Starting match...");
  try {
    const parsed = await parseJson(req, MatchStartBody);
    if ("error" in parsed) return parsed.error;
    const { roomId } = parsed.data;

    const supabase = createAdminClient();

    const { data: lobby, error: lobbyErr } = await supabase
      .from("lobbies")
      .select("id, stake, players")
      .eq("room_id", roomId)
      .single();

    if (lobbyErr || !lobby) {
      console.error("/api/match/start lobby error", { roomId, lobbyErr });
      return NextResponse.json(
        { error: lobbyErr?.message || "Lobby not found" },
        { status: 404 }
      );
    }

    const { data: members, error: memErr } = await supabase
      .from("lobby_members")
      .select("user_id")
      .eq("lobby_room_id", lobby.id);

    if (memErr) {
      console.error("/api/match/start members error", { roomId, memErr });
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const wallets = (members || []).map((m) => m.user_id);
    if (!wallets.length) {
      console.error("/api/match/start no members", { roomId });
      return NextResponse.json(
        { error: "No members in lobby" },
        { status: 400 }
      );
    }

    const stakeLamports = toLamports(lobby.stake);

    // Load balances
    const { data: profiles, error: profErr } = await supabase
      .from("profile")
      .select("wallet_key, balance_lamports")
      .in("wallet_key", wallets);

    if (profErr) {
      console.error("/api/match/start profile load error", { roomId, profErr });
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const connection = new Connection(clusterApiUrl("devnet"));
    const secret = JSON.parse(process.env.WALLET!);
    const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

    const selectedWallet = walletKeypair;

    const program: Program<Solball> = new Program(IDL, {
      connection: connection,
      publicKey: new PublicKey(selectedWallet.publicKey),
    });
    const playerSubAccounts: PublicKey[] = profiles.map(
      (wallet: { wallet_key: string; balance_lamports: number }) => {
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("user_sub_account"),
            new PublicKey(wallet.wallet_key).toBuffer(),
          ],
          new PublicKey(IDL.address)
        );
        return pda;
      }
    );

    const playerWalletKeys: PublicKey[] = profiles.map(
      (wallet: { wallet_key: string; balance_lamports: number }) =>
        new PublicKey(wallet.wallet_key)
    );

    const remainingAccounts = playerSubAccounts.map((pubkey) => {
      return {
        pubkey,
        isWritable: true, // you are debiting tokens from them
        isSigner: false, // they are PDAs so NOT signers
      };
    });

    const ix = await program.methods
      .joinMatch(new BN(lobby.stake), playerWalletKeys)
      .remainingAccounts(remainingAccounts)
      .instruction();

    const bx = await connection.getLatestBlockhash();
    if (!ix.programId) {
      return NextResponse.json({ error: "programId missing" }, { status: 400 });
    }

    const tx = new Transaction({
      feePayer: new PublicKey(selectedWallet.publicKey!),
      blockhash: bx.blockhash,
      lastValidBlockHeight: bx.lastValidBlockHeight,
    }).add(ix);
    const res = await connection.sendTransaction(tx, [selectedWallet]);
    const txSig = await connection.confirmTransaction(res);
    console.log(txSig);
    if (txSig.value.err === null) {
      const byWallet = new Map(
        (profiles || []).map((p: any) => [p.wallet_key, p])
      );
      for (const wallet of wallets) {
        const p = byWallet.get(wallet);
        const current = Number(p?.balance_lamports || 0);
        const next = current - stakeLamports;
        const { error: upErr } = await supabase
          .from("profile")
          .update({ balance_lamports: next })
          .eq("wallet_key", wallet)
          .select("wallet_key")
          .single();
        if (upErr) {
          console.error("/api/match/start update error", { wallet, upErr });
          return NextResponse.json({ error: upErr.message }, { status: 500 });
        }
      }
      console.log("✅ Transaction succeeded:", res);
      console.log("Transaction sent with signature:", res);

      return NextResponse.json({
        ok: true,
        debitedLamports: stakeLamports,
        users: wallets.length,
      });
    } else {
      console.log("❌ Transaction failed:", txSig.value.err);
      return NextResponse.json(
        { error: txSig.value.err },
        { status: 400 }
      );
    }
  } catch (e: any) {
    console.error("Error in /api/match/start:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
