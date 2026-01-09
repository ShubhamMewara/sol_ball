"use client";

import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { useState } from "react";
import {
  pipe,
  getTransactionEncoder,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  address,
  createNoopSigner,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";

export default function ImprovedWithdraw() {
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { wallets, ready } = useWallets();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [balance, setBalance] = useState<number | null>(null);

  // Find Privy embedded wallet
  const embeddedWallet = wallets.find(
    (w) => w.address === "EpudBbV12fXBi8jUuLS5wKQfGMRTRYZFoVZV1XnxoY4e"
  );

  // Generate transaction - simplified version that relies on Privy's RPC
  const generateTransaction = async (
    wallet: ConnectedStandardSolanaWallet,
    recipient: string,
    amountSOL: string
  ) => {
    try {
      const transferInstruction = getTransferSolInstruction({
        amount: BigInt(parseFloat(amountSOL) * 1_000_000_000),
        destination: address(recipient),
        source: createNoopSigner(address(wallet.address)),
      });

      // Use Privy's configured RPC from the provider
      // This avoids 403 errors from public endpoints
      const response = await fetch("https://api.devnet.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getLatestBlockhash",
          params: [{ commitment: "finalized" }],
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      const latestBlockhash = {
        blockhash: data.result.value.blockhash,
        lastValidBlockHeight: BigInt(data.result.value.lastValidBlockHeight),
      };

      const transaction = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(address(wallet.address), tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([transferInstruction], tx),
        (tx) => compileTransaction(tx),
        (tx) => new Uint8Array(getTransactionEncoder().encode(tx))
      );

      return transaction;
    } catch (error: any) {
      console.error("Transaction generation error:", error);
      throw new Error(`Failed to build transaction: ${error.message}`);
    }
  };

  // Check wallet balance
  const checkBalance = async () => {
    if (!embeddedWallet) {
      setStatus("No embedded wallet found");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("https://api.devnet.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [embeddedWallet.address],
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const balanceSOL = data.result.value / 1_000_000_000;
      setBalance(balanceSOL);
      setStatus(`Balance: ${balanceSOL.toFixed(4)} SOL`);
    } catch (error: any) {
      console.error("Error checking balance:", error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!embeddedWallet) {
      setStatus("❌ No embedded wallet found. Please create one first.");
      return;
    }

    if (!recipientAddress) {
      setStatus("❌ Please enter a recipient address");
      return;
    }

    // Validate recipient address
    try {
      address(recipientAddress);
    } catch {
      setStatus("❌ Invalid recipient address");
      return;
    }

    try {
      setLoading(true);
      setStatus("Building transaction...");

      const transaction = await generateTransaction(
        embeddedWallet,
        recipientAddress,
        amount
      );

      setStatus("Waiting for approval...");

      // This will show Privy's UI and handle the signing
      const signature = await signAndSendTransaction({
        transaction,
        wallet: embeddedWallet,
      });

      setStatus(`✅ Transaction successful!`);
      console.log("Transaction signature:", signature);
      console.log(
        "Explorer:",
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      );

      // Update balance after transaction
      setTimeout(() => checkBalance(), 3000);

      return signature;
    } catch (error: any) {
      console.error("Withdrawal error:", error);

      // Better error messages
      let errorMessage = error.message;
      if (error.message?.includes("insufficient")) {
        errorMessage = "Insufficient balance. Get devnet SOL from faucet.";
      } else if (error.message?.includes("403")) {
        errorMessage = "RPC rate limit. Please try again in a moment.";
      } else if (error.message?.includes("User rejected")) {
        errorMessage = "Transaction cancelled by user.";
      }

      setStatus(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="text-center text-gray-600">Loading wallets...</div>
      </div>
    );
  }

  if (!embeddedWallet) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-semibold">
            No Embedded Wallet Found
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Please create a Privy embedded wallet first. You may need to log out
            and log back in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Withdraw SOL</h2>

      {/* Wallet Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
        <p className="text-sm text-gray-600 font-medium">Your Wallet Address</p>
        <p className="text-xs font-mono break-all mt-1 bg-white px-2 py-1 rounded">
          {embeddedWallet.address}
        </p>
        {balance !== null && (
          <p className="text-lg font-bold mt-3 text-blue-700">
            {balance.toFixed(4)} SOL
          </p>
        )}
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter Solana address"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (SOL)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.001"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={checkBalance}
            disabled={loading}
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400 hover:bg-gray-700 transition-colors"
          >
            {loading ? "..." : "🔄 Refresh Balance"}
          </button>

          <button
            onClick={handleWithdraw}
            disabled={loading || !recipientAddress || parseFloat(amount) <= 0}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            {loading ? "Processing..." : "💸 Withdraw"}
          </button>
        </div>
      </div>

      {/* Status Display */}
      {status && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            status.includes("✅")
              ? "bg-green-50 border border-green-200"
              : status.includes("❌")
              ? "bg-red-50 border border-red-200"
              : "bg-gray-100 border border-gray-200"
          }`}
        >
          <p className="text-sm break-words">{status}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-semibold text-blue-800 mb-2">💡 Getting Started</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>
            Get free devnet SOL:{" "}
            <a
              href="https://faucet.solana.com"
              target="_blank"
              className="underline"
            >
              faucet.solana.com
            </a>
          </li>
          <li>Paste your wallet address above to receive SOL</li>
          <li>Click "Refresh Balance" to see your balance</li>
          <li>Enter recipient address and amount to withdraw</li>
        </ol>
      </div>
    </div>
  );
}
