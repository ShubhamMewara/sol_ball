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

export const runtime = "nodejs";

function toLamports(sol: number): number {
  return Math.max(0, Math.round(sol * 1_000_000_000));
}

export async function POST(req: NextRequest) {
  console.log("Settling match...");
  try {
    const { roomId, winner } = await req.json();
    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { error: "roomId is required" },
        { status: 400 }
      );
    }
    if (winner !== "red" && winner !== "blue") {
      return NextResponse.json(
        { error: "winner must be 'red' or 'blue'" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: lobby, error: lobbyErr } = await supabase
      .from("lobbies")
      .select("id, stake, players")
      .eq("room_id", roomId)
      .single();

    if (lobbyErr || !lobby) {
      console.error("/api/match/settle lobby error", { roomId, lobbyErr });
      return NextResponse.json(
        { error: lobbyErr?.message || "Lobby not found" },
        { status: 404 }
      );
    }

    const { data: members, error: memErr } = await supabase
      .from("lobby_members")
      .select("user_id, team")
      .eq("lobby_room_id", lobby.id);

    if (memErr) {
      console.error("/api/match/settle members error", { roomId, memErr });
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const winners = (members || [])
      .filter((m) => m.team === winner)
      .map((m) => m.user_id); // wallet addresses
    const losers = (members || [])
      .filter((m) => m.team !== winner)
      .map((m) => m.user_id);

    if (!winners.length) {
      console.error("/api/match/settle no winners", { roomId, winner });
      return NextResponse.json(
        { error: "No winners found for this lobby" },
        { status: 400 }
      );
    }

    const stakeLamports = toLamports(lobby.stake);
    const totalPlayers = (members || []).length;
    const pot = stakeLamports * totalPlayers;
    const perWinner = Math.floor(pot / winners.length);

    // Load current balances for winners
    const { data: winnerProfiles, error: winErr } = await supabase
      .from("profile")
      .select("wallet_key, balance_lamports")
      .in("wallet_key", winners);

    if (winErr) {
      console.error("/api/match/settle profile load error", {
        roomId,
        winners,
        winErr,
      });
      return NextResponse.json({ error: winErr.message }, { status: 500 });
    }

    // Only Credit each winner
    // Credit each winner by wallet_key
    for (const p of winnerProfiles || []) {
      const wallet = (p as any).wallet_key as string;
      const current = Number((p as any).balance_lamports || 0);
      const next = current + perWinner;
      const { error: upErr } = await supabase
        .from("profile")
        .update({ balance_lamports: next })
        .eq("wallet_key", wallet)
        .select("wallet_key")
        .single();
      if (upErr) {
        console.error("/api/match/settle update error", { wallet, upErr });
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    const connection = new Connection(clusterApiUrl("devnet"));
    const secret = JSON.parse(process.env.WALLET!);
    const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

    const selectedWallet = walletKeypair;

    const program: Program<Solball> = new Program(IDL, {
      connection: connection,
      publicKey: new PublicKey(selectedWallet.publicKey),
    });
    const playerSubAccounts: PublicKey[] = winnerProfiles.map(
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
    const remainingAccounts = playerSubAccounts.map((pubkey) => {
      return {
        pubkey,
        isWritable: true, // you are debiting tokens from them
        isSigner: false, // they are PDAs so NOT signers
      };
    });
    const ix = await program.methods
      .settleMatch(new BN(lobby.stake))
      .remainingAccounts(remainingAccounts)
      .instruction();

    const bx = await connection.getLatestBlockhash();
    if (!ix.programId) throw new Error("❌ programId missing from instruction");

    const tx = new Transaction({
      feePayer: new PublicKey(selectedWallet.publicKey!),
      blockhash: bx.blockhash,
      lastValidBlockHeight: bx.lastValidBlockHeight,
    }).add(ix);
    const res = await connection.sendTransaction(tx, [selectedWallet]);
    const txSig = await connection.confirmTransaction(res);
    console.log(txSig);

    console.log("Transaction sent with signature:", res);

    return NextResponse.json({
      ok: true,
      pot,
      perWinner,
      winners: winners.length,
      losers: losers.length,
    });
  } catch (e: any) {
    console.error("Error in /api/match/settle:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
