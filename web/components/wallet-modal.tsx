"use client";

import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";
import { usePrivy, useSigners } from "@privy-io/react-auth";
import {
  useFundWallet,
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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

type WalletModalProps = {
  embeddedWalletAddress: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "deposit" | "withdraw";
};

const quickAmounts = ["0.1", "0.25", "0.5", "1"];

const TAB_META = {
  deposit: {
    label: "Deposit",
    accent: "from-emerald-400/60 to-emerald-500/20",
    buttonClass:
      "bg-[#7ACD54] text-gray-900 hover:bg-emerald-400 focus-visible:ring-emerald-500/40",
    description: "Add SOL to your Solball balance instantly.",
    toast: "Successfully deposited SOL",
  },
  withdraw: {
    label: "Withdraw",
    accent: "from-rose-400/60 to-rose-500/20",
    buttonClass:
      "bg-red-500/90 text-white hover:bg-rose-400 focus-visible:ring-rose-500/40",
    description: "Cash out to your connected wallet.",
    toast: "Successfully withdrew SOL",
  },
};

export default function WalletModal({
  embeddedWalletAddress,
  isOpen,
  onClose,
  initialTab = "deposit",
}: WalletModalProps) {
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">(
    initialTab
  );
  const [amount, setAmount] = useState("");
  const [Status, setStatus] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [recipientAddress, setRecipientAddress] = useState(
    user?.wallet?.address
  );

  const {
    balance = 0,
    embedded_wallet_address,
    embedded_wallet_id,
  } = useAuth();
  const shortAddress = useMemo(() => {
    const address = user?.wallet?.address;
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [user?.wallet?.address]);

  const { fundWallet } = useFundWallet();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setAmount("");
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setAmount("");
  }, [activeTab]);

  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (
  //       modalContentRef.current &&
  //       !modalContentRef.current.contains(event.target as Node)
  //     ) {
  //       onClose();
  //     }
  //   };

  //   if (isOpen) {
  //     document.addEventListener("mousedown", handleClickOutside);
  //   }

  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //   };
  // }, [isOpen, onClose]);

  const formattedBalance = useMemo(
    () => ((balance ?? 0) / LAMPORTS_PER_SOL).toFixed(4),
    [balance]
  );

  if (!isOpen) return null;

  // const embedded_wallet = wallets.find((data)=>data.address == embedded_wallet_address)
  const handleConfirm = async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      toast("Enter a valid amount");
      return;
    }

    if (!embeddedWalletAddress || !user?.wallet?.address) {
      console.log(embeddedWalletAddress);
      console.log(user?.wallet?.address);

      toast("Wallet not initialized");
      return;
    }

    const lamports = Math.floor(numericAmount * LAMPORTS_PER_SOL);
    if (lamports <= 0) {
      toast("Enter a larger amount");
      return;
    }
    const wallet = wallets[0]; // Phantom via Privy
    try {
      setIsConfirming(true);

      if (activeTab === "deposit") {
        console.log(`embeeded`, embeddedWalletAddress);
        console.log(user?.wallet?.address);

        await fundWallet({
          address: embeddedWalletAddress,
          options: {
            amount: String(numericAmount),
            defaultFundingMethod: "wallet",
            chain: "solana:devnet",
          },
        });
      }

      if (activeTab === "withdraw") {
        try {
          const embeddedWallet = wallets.find(
            (w) => w.address === embedded_wallet_address
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
                lastValidBlockHeight: BigInt(
                  data.result.value.lastValidBlockHeight
                ),
              };

              const transaction = pipe(
                createTransactionMessage({ version: 0 }),
                (tx) =>
                  setTransactionMessageFeePayer(address(wallet.address), tx),
                (tx) =>
                  setTransactionMessageLifetimeUsingBlockhash(
                    latestBlockhash,
                    tx
                  ),
                (tx) =>
                  appendTransactionMessageInstructions(
                    [transferInstruction],
                    tx
                  ),
                (tx) => compileTransaction(tx),
                (tx) => new Uint8Array(getTransactionEncoder().encode(tx))
              );

              return transaction;
            } catch (error: any) {
              console.error("Transaction generation error:", error);
              throw new Error(`Failed to build transaction: ${error.message}`);
            }
          };

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

            return signature;
          } catch (error: any) {
            console.error("Withdrawal error:", error);

            // Better error messages
            let errorMessage = error.message;
            if (error.message?.includes("insufficient")) {
              errorMessage =
                "Insufficient balance. Get devnet SOL from faucet.";
            } else if (error.message?.includes("403")) {
              errorMessage = "RPC rate limit. Please try again in a moment.";
            } else if (error.message?.includes("User rejected")) {
              errorMessage = "Transaction cancelled by user.";
            }

            setStatus(`❌ ${errorMessage}`);
          }
        } catch (err: any) {
          console.error("❌ Cash out failed:", err);
          // setError(err.message || 'Failed to cash out');
        } finally {
          // setLoading(false);
        }
      }
      setAmount("");
      onClose();
    } catch (err) {
      console.error(err);
      toast("Transaction failed");
    } finally {
      setIsConfirming(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        ref={modalContentRef}
        className={cn(
          "relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#12131b] p-6 shadow-2xl shadow-black/40"
        )}
      >
        <div className="absolute inset-0 -z-1 rounded-3xl bg-linear-to-br from-white/5 to-transparent" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">
              Wallet balance
            </p>
            <p className="text-3xl font-semibold text-white">
              {formattedBalance} SOL
            </p>
            <p className="text-xs text-white/50">Available on Solball</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
              Connected
            </p>
            <p className="text-sm font-semibold text-white">
              {shortAddress || "—"}
            </p>
            <button
              onClick={onClose}
              className="mt-2 text-xs font-medium text-red-500 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "deposit" | "withdraw")
          }
          className="mt-6"
        >
          <TabsList className="w-full justify-between bg-white/5 p-1">
            {(["deposit", "withdraw"] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "flex-1 rounded-2xl py-2 text-sm font-semibold uppercase tracking-[0.2em]",
                  "data-[state=active]:bg-[#1f2029] data-[state=active]:text-white",
                  "text-white/60"
                )}
              >
                {TAB_META[tab].label}
              </TabsTrigger>
            ))}
          </TabsList>

          {(["deposit", "withdraw"] as const).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div
                className={cn(
                  "mt-5 rounded-2xl border border-white/5 bg-black p-5",
                  TAB_META[tab].accent
                )}
              >
                <p className="text-sm text-white/70">
                  {TAB_META[tab].description}
                </p>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                    Amount (SOL)
                  </p>
                  <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/30 px-4">
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={tab === activeTab ? amount : ""}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent py-4 text-2xl font-semibold text-white placeholder:text-white/30 focus:outline-none"
                    />
                    <span className="text-white/60">SOL</span>
                  </div>
                  {activeTab == "withdraw" && (
                    <>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60 mt-6">
                        Recipient Address
                      </p>
                      <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/30 px-4">
                        <input
                          type="string"
                          min="0"
                          step="0.0001"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                          placeholder="0x"
                          className="w-full bg-transparent py-4 text-sm font-semibold text-white/90 placeholder:text-white/30 focus:outline-none"
                        />
                        <span className="text-white/60">Address</span>
                      </div>
                    </>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        onClick={() => setAmount(value)}
                        className={cn(
                          "rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/70 transition",
                          amount === value && tab === activeTab
                            ? "bg-white/10 text-white"
                            : "hover:bg-white/5"
                        )}
                        type="button"
                      >
                        {value} SOL
                      </button>
                    ))}
                  </div>
                </div>
                <div>{Status}</div>
                <div className="mt-6 grid gap-3">
                  <Button
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className={cn(
                      "w-full bg-[] rounded-2xl py-6 text-base font-extrabold uppercase tracking-[0.3em] shadow-lg shadow-black/20 transition focus-visible:outline-none focus-visible:ring-2",
                      TAB_META[tab].buttonClass,
                      activeTab !== tab && "pointer-events-none opacity-0"
                    )}
                  >
                    {isConfirming
                      ? tab === "deposit"
                        ? "Processing..."
                        : "Processing..."
                      : tab === "deposit"
                      ? "Confirm Deposit"
                      : "Confirm Withdraw"}
                  </Button>
                  <button
                    onClick={onClose}
                    className="rounded-2xl border border-white/10 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
