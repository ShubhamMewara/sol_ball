"use client";

import { useAuth } from "@/store/auth";
import IDL from "@/compiled/solball.json";
import { Solball } from "@/compiled/solball";
import { cn } from "@/lib/utils";
import { Program, BN } from "@coral-xyz/anchor";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type WalletModalProps = {
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
      "bg-emerald-500/90 text-gray-900 hover:bg-emerald-400 focus-visible:ring-emerald-500/40",
    description: "Add SOL to your Solball balance instantly.",
    toast: "Successfully deposited SOL",
  },
  withdraw: {
    label: "Withdraw",
    accent: "from-rose-400/60 to-rose-500/20",
    buttonClass:
      "bg-rose-500/90 text-white hover:bg-rose-400 focus-visible:ring-rose-500/40",
    description: "Cash out to your connected wallet.",
    toast: "Successfully withdrew SOL",
  },
};

export default function WalletModal({
  isOpen,
  onClose,
  initialTab = "deposit",
}: WalletModalProps) {
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">(initialTab);
  const [amount, setAmount] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { user } = usePrivy();
  const { balance = 0, setBalance } = useAuth();

  const shortAddress = useMemo(() => {
    const address = user?.wallet?.address;
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [user?.wallet?.address]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setAmount("");
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setAmount("");
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalContentRef.current &&
        !modalContentRef.current.contains(event.target as Node)
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

  const formattedBalance = useMemo(
    () => ((balance ?? 0) / LAMPORTS_PER_SOL).toFixed(4),
    [balance]
  );

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast("Enter a valid amount");
      return;
    }

    if (!wallets.length) {
      toast("Connect your wallet to continue");
      return;
    }

    const lamports = Math.round(numericAmount * LAMPORTS_PER_SOL);
    if (lamports <= 0) {
      toast("Enter a larger amount");
      return;
    }

    const selectedWallet = wallets[0];
    const connection = new Connection(clusterApiUrl("devnet"));

    try {
      setIsConfirming(true);

      const [userSubAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_sub_account"),
          new PublicKey(selectedWallet.address).toBuffer(),
        ],
        new PublicKey(IDL.address)
      );

      const remoteBalance = await connection.getBalance(userSubAccount);

      if (activeTab === "withdraw" && remoteBalance < lamports) {
        toast("Cannot withdraw more than available balance");
        setIsConfirming(false);
        return;
      }

      const program: Program<Solball> = new Program(IDL, {
        connection,
        publicKey: new PublicKey(selectedWallet.address!),
      });

      const ix =
        activeTab === "deposit"
          ? await program.methods.deposit(new BN(lamports)).instruction()
          : await program.methods.withdraw(new BN(lamports)).instruction();

      if (!ix.programId) {
        throw new Error("Program ID missing from instruction");
      }

      const blockhash = await connection.getLatestBlockhash();

      const msg = new TransactionMessage({
        payerKey: new PublicKey(selectedWallet.address!),
        recentBlockhash: blockhash.blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const versionedTx = new VersionedTransaction(msg);

      await signAndSendTransaction({
        transaction: versionedTx.serialize(),
        wallet: selectedWallet,
      });

      const nextBalance =
        activeTab === "deposit"
          ? remoteBalance + lamports
          : remoteBalance - lamports;

      setBalance(nextBalance);
      toast(TAB_META[activeTab].toast);
      setAmount("");
      onClose();
    } catch (error) {
      console.error(error);
      toast("Something went wrong");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
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
            <p className="text-3xl font-semibold text-white">{formattedBalance} SOL</p>
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
              className="mt-2 text-xs font-medium text-white/60 transition hover:text-white"
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
                  "mt-5 rounded-2xl border border-white/5 bg-linear-to-br p-5",
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
                <div className="mt-6 grid gap-3">
                  <Button
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className={cn(
                      "w-full rounded-2xl py-6 text-base font-extrabold uppercase tracking-[0.3em] shadow-lg shadow-black/20 transition focus-visible:outline-none focus-visible:ring-2",
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

