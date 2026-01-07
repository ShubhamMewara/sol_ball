import { Solball } from "@/compiled/solball";
import { BN, Program } from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import IDL from "@/compiled/solball.json";
import { JoinMatchBody } from "@/lib/schemas";
import { parseJson } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJson(req, JoinMatchBody);
    if ("error" in parsed) return parsed.error;
    const { pubKeys, match_fees } = parsed.data;

    const connection = new Connection(clusterApiUrl("devnet"));
    const secret = JSON.parse(process.env.WALLET!);
    const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

    const selectedWallet = walletKeypair;

    const program: Program<Solball> = new Program(IDL, {
      connection: connection,
      publicKey: new PublicKey(selectedWallet.publicKey),
    });
    const playerSubAccounts: PublicKey[] = pubKeys.map((wallet: string) => {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_sub_account"), new PublicKey(wallet).toBuffer()],
        new PublicKey(IDL.address)
      );
      return pda;
    });

    const playerWalletKeys: PublicKey[] = pubKeys.map(
      (key: string) => new PublicKey(key)
    );
    const remainingAccounts = playerSubAccounts.map((pubkey) => {
      return {
        pubkey,
        isWritable: true, // you are debiting tokens from them
        isSigner: false, // they are PDAs so NOT signers
      };
    });
    const ix = await program.methods
      .joinMatch(new BN(match_fees), playerWalletKeys)
      .remainingAccounts(remainingAccounts)
      .instruction();

    const bx = await connection.getLatestBlockhash();
    if (!ix.programId) throw new Error("❌ programId missing from instruction");

    const tx = new Transaction({
      feePayer: new PublicKey(selectedWallet.publicKey!),
      blockhash: bx.blockhash,
      lastValidBlockHeight: bx.lastValidBlockHeight,
    }).add(ix);
    const res = await connection.simulateTransaction(tx);
    return NextResponse.json({ ok: true, simulation: res });
  } catch (error) {
    return NextResponse.json({ error: String((error as any)?.message || error) }, { status: 500 });
  }
}
