"use client";

import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
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
import IDL from "../compiled/solball.json";
import { BN, Program } from "@coral-xyz/anchor";
import { Solball } from "@/compiled/solball";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const { wallets, ready } = useWallets();
  const { balance, setBalance } = useAuth();
  const [isConfirming, setisConfirming] = useState(false);

  const modalContentRef = useRef(null);
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

  const withdrawFunds = async () => {
    const connection = new Connection(clusterApiUrl("devnet"));
    // replace with hook
    const selectedWallet = wallets[0];
    try {
      setisConfirming(true);
      const [user_sub_account] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_sub_account"),
          new PublicKey(selectedWallet.address).toBuffer(),
        ],
        new PublicKey(IDL.address)
      );
      const balance = await connection.getBalance(user_sub_account);
      console.log(balance);
      if (balance < Number(amount) * LAMPORTS_PER_SOL) {
        toast("Cannot withdraw more than available balance");
        setisConfirming(false);
        return;
      }
      const program: Program<Solball> = new Program(IDL, {
        connection: connection,
        publicKey: new PublicKey(selectedWallet.address!),
      });
      const ix = await program.methods
        .withdraw(new BN(Number(amount) * LAMPORTS_PER_SOL))
        .instruction();

      const bx = await connection.getLatestBlockhash();

      if (!ix.programId)
        throw new Error("❌ programId missing from instruction");

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
      const addedBalance = Number(
        (Number(amount) * LAMPORTS_PER_SOL).toFixed(4)
      );
      setBalance(balance - addedBalance);
      setisConfirming(false);
      onClose();
      toast("Successfully Withdrawn SOL");
    } catch (error) {
      setisConfirming(false);
      toast("Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={modalContentRef}
        className="bg-[#1a1b24] rounded-lg border-b-4 border-[#FF6B6B] p-8 shadow-lg shadow-[#FF6B6B]/20 w-full max-w-md transform transition-all duration-300"
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
          WITHDRAW
        </h2>

        {/* Amount Input */}
        <div className="mb-6">
          <p className="text-[#DDD9C7] text-sm mb-2">Amount (SOL)</p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step={0.0001}
            placeholder="Enter amount"
            className="w-full bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
          />
        </div>

        {/* Info */}
        <div className="mb-8 bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] text-sm">
          <p className="mb-2">
            Available: {balance ? (balance / LAMPORTS_PER_SOL).toFixed(4) : "0"}{" "}
            SOL
          </p>
          <p>Fee: 0.001 SOL</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            className="w-full bg-[#FF6B6B] text-white py-3 rounded-lg font-bold hover:bg-[#ff5252] transition-all shadow-lg shadow-[#FF6B6B]/30"
            disabled={isConfirming}
            onClick={withdrawFunds}
          >
            {isConfirming ? "WITHDRAWING..." : " CONFIRM WITHDRAW"}
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
