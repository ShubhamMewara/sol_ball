"use client";
import { usePathname, useRouter } from "next/navigation";
import { playHapticFeedback } from "./home-page";
import { Button } from "./ui/button";
import { Logo } from "./logo";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import DepositModal from "./deposit-model";
import WithdrawModal from "./withdraw-model";

export const NavTabs = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, login } = usePrivy();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const shortAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";

  return (
    <div className="flex items-center justify-between pt-8 pb-8 px-4">
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
          <>
            <Button
              onClick={() =>
                authenticated
                  ? setIsWithdrawOpen(true)
                  : login({ loginMethods: ["wallet"] })
              }
              className="px-5 py-2.5 rounded-full font-bold text-sm tracking-wider bg-[#2a2b34] text-[#DDD9C7] shadow-[2px_2px_0_0_#fffff] hover:bg-[#343541] transition-colors"
            >
              WITHDRAW
            </Button>
            <Button
              onClick={() =>
                authenticated
                  ? setIsDepositOpen(true)
                  : login({ loginMethods: ["wallet"] })
              }
              className="px-5 py-2.5 rounded-full font-bold text-sm tracking-wider bg-[#7ACD54] text-white hover:bg-[#6ab844] transition-colors shadow-[2px_2px_0_0_#65ab44]"
            >
              DEPOSIT
            </Button>
          </>
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
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
      />
    </div>
  );
};
