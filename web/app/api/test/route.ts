import { AuthorizationContext, PrivyClient } from "@privy-io/node";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { NextResponse } from "next/server";

export async function GET() {
  // Initialize Privy client
  const privy = new PrivyClient({
    appId: process.env.APP_ID!,
    appSecret: process.env.APP_SECRET!,
  });

  try {
    const user = await privy.users().list();
    // Find DELEGATED wallet
    const solanaWallet = user.data.filter((data) =>
      data.linked_accounts.find(
        (account) =>
          account.type === "wallet" &&
          account.chain_type === "solana" &&
          account.wallet_client === "privy" &&
          account.delegated === true // ✅ Check delegation
      )
    );

    // TRANSACTION BUILDER
    const connection = new Connection(clusterApiUrl("devnet"));
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    const data = solanaWallet[0].linked_accounts.filter(
      (Data) => Data.wallet_client_type == "privy"
    )[0];
    const walletId = data?.id;
    const fromAddress = "BNJr8zEXhNt2qY1RvqBcpk5MECYcJQ1MiqbKchnDrsnT";
    const DESTINATION_ADDRESS = "6zEcWxdZaBVJ6EpL4vii5DKzhLkUKYogxQzMfZqAveGy";

    const tx = new Transaction({
      blockhash, // 🔹 must set
      lastValidBlockHeight, // optional but recommended
      feePayer: new PublicKey(fromAddress),
    }).add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(DESTINATION_ADDRESS),
        lamports: LAMPORTS_PER_SOL / 2,
      })
    );

    const serializedTx = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64");

    // transaction.feePayer = new PublicKey(fromAddress);

    const PRIVY_AUTHORIZATION_PRIVATE_KEY =
      process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY!;
    const authorizationContext: AuthorizationContext = {
      authorization_private_keys: [PRIVY_AUTHORIZATION_PRIVATE_KEY],
    };
    // console.log(`env`, PRIVY_AUTHORIZATION_PRIVATE_KEY);
    const walletDetails = await privy.wallets().get(walletId);
    const txHash = await privy
      .wallets()
      .solana()
      .signAndSendTransaction(walletId, {
        caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        authorization_context: authorizationContext,
        transaction: serializedTx,
      });

    return NextResponse.json({
      success: true,
      solanaWallet,
      walletDetails,
      txHash,
      from: fromAddress,
      to: DESTINATION_ADDRESS,
      lamports: LAMPORTS_PER_SOL / 2,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error });
  }
}
