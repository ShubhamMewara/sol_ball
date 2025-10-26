"use client";
import { Solball } from "@/compiled/solball";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { useEffect, useRef, useState } from "react";
import { Program, BN, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import IDL from "@/compiled/solball.json";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const modalContentRef = useRef(null);
  const wallet = usePrivy();
  const { wallets, ready } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        modalContentRef.current &&
        // @ts-ignore
        !modalContentRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const confirmDeposit = async () => {
    // replace with hook
    const selectedWallet = wallets[0];
    console.log(ready);
    console.log(wallet);
    console.log(wallets);

    console.log(selectedWallet.address);
    const connection = new Connection(clusterApiUrl("devnet"));
    const program: Program<Solball> = new Program(IDL, {
      connection: connection,
      publicKey: new PublicKey(selectedWallet.address!),
    });
    const ix = await program.methods
      .deposit(new BN(Number(amount) * LAMPORTS_PER_SOL))
      .instruction();

    const bx = await connection.getLatestBlockhash();
    const tx = new Transaction({
      blockhash: bx.blockhash,
      lastValidBlockHeight: bx.lastValidBlockHeight,
      feePayer: new PublicKey(selectedWallet.address),
    }).add(ix);
    const dt = await connection.simulateTransaction(tx);
    console.log(dt);
    // const web3Instruction = {
    //   programAddress: address(ix.programId.toBase58()),
    //   accounts: ix.keys.map((meta) => ({
    //     address: address(meta.pubkey.toBase58()),
    //     role: meta.isSigner
    //       ? meta.isWritable
    //         ? 2
    //         : 0 // 2 = signer+writable, 0 = signer only
    //       : meta.isWritable
    //       ? 1
    //       : 3, // 1 = writable, 3 = readonly
    //   })),
    //   data: new Uint8Array(ix.data),
    // };

    // const { getLatestBlockhash } = createSolanaRpc(clusterApiUrl("devnet")); // Replace with your Solana RPC endpoint
    // const { value: latestBlockhash } = await getLatestBlockhash().send();

    // // Create a transaction using @solana/kit
    // const transaction = pipe(
    //   createTransactionMessage({ version: 0 }),
    //   (tx) =>
    //     setTransactionMessageFeePayer(address(selectedWallet.address!), tx), // Set the message fee payer
    //   (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx), // Set recent blockhash
    //   (tx) => appendTransactionMessageInstructions([web3Instruction], tx), // Add your instructions to the transaction
    //   (tx) => compileTransaction(tx), // Compile the transaction
    //   (tx) => new Uint8Array(getTransactionEncoder().encode(tx)) // Finally encode the transaction
    // );
    // // Send the transaction
    // const result = await signAndSendTransaction({
    //   transaction: transaction,
    //   wallet: selectedWallet,
    // });
    // console.log("Transaction sent with signature:", result.signature);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-8 shadow-lg shadow-[#7ACD54]/20 w-full max-w-md transform transition-all duration-300"
        ref={modalContentRef}
        style={{
          animation: isOpen
            ? "slideUp 0.3s ease-out"
            : "slideDown 0.3s ease-in",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes slideDown {
            from {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
            to {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
          }
        `}</style>

        <h2 className="text-white font-bold text-2xl mb-6 text-center">
          DEPOSIT
        </h2>

        {/* Amount Input */}
        <div className="mb-6">
          <p className="text-[#DDD9C7] text-sm mb-2">Amount (SOL)</p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#7ACD54]"
          />
        </div>

        {/* Info */}
        <div className="mb-8 bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] text-sm">
          <p className="mb-2">Wallet: 7xK9mQ2pL5nR8vW3jH6bF4cD1eG9sT2uY5</p>
          <p>Fee: 0.001 SOL</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            className="w-full bg-[#7ACD54] text-[#14151C] py-3 rounded-lg font-bold hover:bg-[#6ab844] transition-all shadow-lg shadow-[#7ACD54]/30"
            onClick={confirmDeposit}
          >
            CONFIRM DEPOSIT
          </button>
          <button
            onClick={onClose}
            className="w-full bg-[#2a2b34] text-[#DDD9C7] py-3 rounded-lg font-bold hover:bg-[#3a3b44] transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
