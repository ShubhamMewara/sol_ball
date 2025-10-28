"use client";
import { Solball } from "@/compiled/solball";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useEffect, useRef, useState } from "react";
import { Program, BN } from "@coral-xyz/anchor";
import IDL from "@/compiled/solball.json";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";

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
    const ix = await program.methods
      .deposit(new BN(Number(amount) * LAMPORTS_PER_SOL))
      .instruction();

    const bx = await connection.getLatestBlockhash();
    if (!ix.programId) throw new Error("❌ programId missing from instruction");

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
