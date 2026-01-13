"use client";

import {
  useHeadlessDelegatedActions,
  usePrivy,
  useSigners,
} from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useState } from "react";

export default function DelegateWalletButton() {
  const { user } = usePrivy();
  const { addSigners } = useSigners();
  const { delegateWallet } = useHeadlessDelegatedActions();
  const [isLoading, setIsLoading] = useState(false);

  const solanaWallet = user?.linkedAccounts.find(
    (account) =>
      account.type === "wallet" &&
      account.chainType === "solana" &&
      account.walletClientType === "privy" &&
      account.delegated == false
  );
  const smartWallet = useWallets();

  const handleDelegate = async () => {
    if (!solanaWallet) return;

    setIsLoading(true);
    try {
      await delegateWallet({
        address: smartWallet.wallets[0].address,
        chainType: "solana",
      });

      alert("✅ Wallet delegated! You can now join matches.");
    } catch (error) {
      console.error("Delegation failed:", error);
      alert("Failed to delegate wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    // setLoading(true);
    try {
      await addSigners({
        address: smartWallet.wallets[0].address,
        signers: [{ signerId: "gtxlu2vw9ef8hnepnby6gtr4" }],
      });

      alert("✅ Server signing enabled for this session");
    } catch (e) {
      console.error(e);
      alert("Failed to enable signing");
    } finally {
      //   setLoading(false);
    }
  };

  if (!solanaWallet) {
    return <div className="text-red-500">No Solana wallet found</div>;
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
      <p className="text-yellow-400 mb-3">
        ⚠️ Delegate your wallet to enable automatic match payments
      </p>
      <button
        onClick={handleEnable}
        disabled={isLoading}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded"
      >
        {isLoading ? "Delegating..." : "Delegate Wallet"}
      </button>
    </div>
  );
}
