"use client";
import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import React from "react";
import IDL from "../../compiled/solball.json";
import { BN, Program } from "@coral-xyz/anchor";
import { Solball } from "@/compiled/solball";

const page = () => {
  const { wallets, ready } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const join_match = async () => {
    const connection = new Connection(clusterApiUrl("devnet"));
    // replace with hook
    const selectedWallet = wallets[0];

    const [user_sub_account] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_sub_account"),
        new PublicKey(selectedWallet.address).toBuffer(),
      ],
      new PublicKey(IDL.address)
    );
    const balance = await connection.getBalance(user_sub_account);
    console.log(balance);
    const program: Program<Solball> = new Program(IDL, {
      connection: connection,
      publicKey: new PublicKey(selectedWallet.address!),
    });

    const [myKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_sub_account"),
        new PublicKey(
          "5NHvrqoZk4ov5GvKzDpsmEeW4URwLuG6P4HrmSDTqHc7"
        ).toBuffer(),
      ],
      new PublicKey(IDL.address)
    );
    const [bank_account] = PublicKey.findProgramAddressSync(
      [Buffer.from("bank_account")],
      new PublicKey(IDL.address)
    );
    console.log(`bank acc`, bank_account.toString());
    const bank_balance = await connection.getBalance(bank_account);
    console.log(`Bank balance`, bank_balance);
    const playerSubAccounts = [myKey];
    const remainingAccounts = playerSubAccounts.map((pubkey) => {
      return {
        pubkey,
        isWritable: true, // you are debiting tokens from them
        isSigner: false, // they are PDAs so NOT signers
      };
    });
    const ix = await program.methods
      .settleMatch(new BN(8000))
      .remainingAccounts(remainingAccounts)
      .instruction();

    const bx = await connection.getLatestBlockhash();
    if (!ix.programId) throw new Error("❌ programId missing from instruction");

    const tx = new Transaction({
      feePayer: new PublicKey(selectedWallet.address!),
      blockhash: bx.blockhash,
      lastValidBlockHeight: bx.lastValidBlockHeight,
    }).add(ix);
    const res = await connection.simulateTransaction(tx);
    console.log(res);
    const msg = new TransactionMessage({
      payerKey: new PublicKey(selectedWallet.address!),
      recentBlockhash: bx.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(msg);
    // Send the transaction
    const result = await signAndSendTransaction({
      transaction: versionedTx.serialize(),
      wallet: selectedWallet,
    });
    console.log(
      "Transaction sent with signature:",
      result.signature.toString()
    );
  };

  return (
    <div className="h-screen w-full mx-auto flex items-center justify-center">
      <button onClick={() => join_match()}>Settle Match</button>
    </div>
  );
};

export default page;
