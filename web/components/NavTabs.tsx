"use client";
import { usePathname, useRouter } from "next/navigation";
import { playHapticFeedback } from "./home-page";
import { Button } from "./ui/button";
import { Logo } from "./logo";
import { usePrivy } from "@privy-io/react-auth";
import { useMemo, useState } from "react";
import WalletModal from "./wallet-modal";
import { useAuth } from "@/store/auth";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const NavTabs = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, login } = usePrivy();
  const { balance = 0 } = useAuth();
  const [walletDialog, setWalletDialog] = useState<{
    open: boolean;
    tab: "deposit" | "withdraw";
  }>({
    open: false,
    tab: "deposit",
  });
  const shortAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";
  const formattedBalance = useMemo(() => balance ?? 0, [balance]);

  const openWalletModal = (tab: "deposit" | "withdraw") => {
    if (!authenticated) {
      login({ loginMethods: ["wallet"] });
      return;
    }
    setWalletDialog({ open: true, tab });
  };

  return (
    <div
      className={`flex items-center justify-between pt-8 pb-8 px-4 ${
        pathname === "/" && "hidden"
      }`}
    >
      <Logo />
      {pathname !== "/" && (
        <div className="flex gap-6">
          <Button
            onClick={() => {
              router.push("/profile"), playHapticFeedback();
            }}
            variant={"secondary"}
            className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
              pathname === "/profile"
                ? "border-b-[#00BFFF] bg-[#1a1b24] shadow-lg shadow-[#00BFFF]/20"
                : "bg-[#2a2b34] border-b-transparent"
            }`}
          >
            PROFILE
          </Button>
          <Button
            onClick={() => {
              router.push("/main"), playHapticFeedback();
            }}
            variant={"secondary"}
            className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
              pathname === "/main"
                ? "border-b-[#7ACD54] bg-[#1a1b24] shadow-lg shadow-[#7ACD54]/20"
                : "bg-[#2a2b34] border-b-transparent"
            }`}
          >
            MAIN
          </Button>
          <Button
            onClick={() => {
              router.push("/leaderboard"), playHapticFeedback();
            }}
            variant={"secondary"}
            className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
              pathname === "/leaderboard"
                ? "border-b-[#FF1493] bg-[#1a1b24] shadow-lg shadow-[#FF1493]/20"
                : "bg-[#2a2b34] border-b-transparent"
            }`}
          >
            LEADERBOARD
          </Button>
        </div>
      )}

      {/* Wallet actions (replaces decorative circle) */}
      <div className="flex items-center gap-3">
        {authenticated && (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 border-r border-white/10 pr-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">
                Balance
              </span>
              <span className="text-sm font-semibold text-white">
                {formattedBalance} SOL
              </span>
            </div>
            <Button
              size="sm"
              variant={"secondary"}
              onClick={() => openWalletModal("deposit")}
              className="rounded-full bg-[#7ACD54] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-black transition hover:bg-emerald-400/30"
            >
              Deposit
            </Button>
            <Button
              size="sm"
              variant={"secondary"}
              onClick={() => openWalletModal("withdraw")}
              className="rounded-full bg-rose-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-rose-200 transition hover:bg-rose-400/30"
            >
              Withdraw
            </Button>
          </div>
        )}
        <Button
          onClick={() =>
            authenticated ? null : login({ loginMethods: ["wallet"] })
          }
          className="relative rounded-full px-5 py-2.5 font-bold  text-white bg-gray-300/10 text-xs hover:bg-transparent"
          title={authenticated ? user?.wallet?.address : "Connect Wallet"}
        >
          {authenticated ? shortAddress(user?.wallet?.address) : "Connect"}
        </Button>
      </div>
      {/* <Logo username="Jacked Nerd" height={150} width={150} /> */}
      <WalletModal
        embeddedWalletAddress={null}
        isOpen={walletDialog.open}
        initialTab={walletDialog.tab}
        onClose={() => setWalletDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};
