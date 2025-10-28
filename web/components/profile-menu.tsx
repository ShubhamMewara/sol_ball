"use client";

import { useEffect, useState } from "react";
import DepositModal from "./deposit-model";
import WithdrawModal from "./withdraw-model";
import { Button } from "./ui/button";
import { supabase } from "@/supabase/client";
import { UserProfile } from "@/lib/types";
import { usePrivy } from "@privy-io/react-auth";
import { LogOut } from "lucide-react";

export default function ProfileTab() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [User, setUser] = useState<UserProfile | null>(null);
  const [isFetchingStatus, setisFetchingStatus] = useState(false);
  const { authenticated, user, ready, login, logout } = usePrivy();
  const connectDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });
  };

  // 1432703257611997225

  useEffect(() => {
    const isLoggedIn = async () => {
      setisFetchingStatus(true);
      const { data, error } = await supabase.auth.getSession();
      console.log(data.session?.user);
      setUser((data.session?.user as UserProfile) ?? null);
      setisFetchingStatus(false);
    };
    isLoggedIn();
  }, []);

  return (
    <div className="flex gap-6 px-6 pb-8">
      {/* Left Card - Profile */}
      <div className="flex-1 bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-8 shadow-lg shadow-[#7ACD54]/10">
        <h2 className="text-white font-bold text-2xl mb-8 text-center">
          Wallet Balance
        </h2>

        {/* Wallet Address */}
        {!ready ? (
          <div>Fetching Wallet Status</div>
        ) : !authenticated ? (
          <div>
            <button
              className="w-full my-20 bg-[#7ACD54] text-[#14151C] py-3 rounded-lg font-bold hover:bg-[#6ab844] transition-all shadow-[4px_4px_0_0_#65ab44]"
              onClick={() => login({ loginMethods: ["wallet"] })}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-[#DDD9C7] text-sm mb-2">Wallet address</p>
              <div
                className="bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] text-sm break-all select-none"
                aria-readonly
              >
                {authenticated && user?.wallet?.address}
              </div>
            </div>

            {/* Buttons */}
            <div className=" mb-6 flex items-center gap-4">
              <button
                className="w-full bg-[#7ACD54] text-[#14151C] py-3 rounded-lg font-bold hover:bg-[#6ab844] transition-all shadow-[4px_4px_0_0_#65ab44]"
                onClick={() => setIsDepositOpen(true)}
              >
                DEPOSIT
              </button>
              <button
                className="w-full bg-[#e83838] text-white py-3 rounded-lg font-bold hover:bg-[#ff5252] transition-all shadow-[4px_4px_0_0_#ff6b8b]"
                onClick={() => setIsWithdrawOpen(true)}
              >
                WITHDRAW
              </button>
              {/* Balance */}
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="text-center text-[#DDD9C7] font-bold text-lg">
                BALANCE: 30SOL
              </div>
              <div>
                <LogOut
                  size={18}
                  color="#e83838"
                  className=" cursor-pointer"
                  onClick={() => logout()}
                />
              </div>
            </div>
          </>
        )}

        {/* SECTION 2 */}
        <h2 className="text-white font-bold text-2xl mt-8 text-center">
          PROFILE
        </h2>
        {/* Username */}
        <div className="mb-6">
          <p className="text-[#DDD9C7] text-sm mb-2">Username</p>
          <div className="  px-4 py-3 text-[#DDD9C7] flex items-center gap-2 bg-black/20 rounded-xl">
            <div className="h-6 w-6 rounded-full ">
              <img
                src={User?.user_metadata.avatar_url}
                className="h-full w-full rounded-full"
                alt=""
              />
            </div>{" "}
            {User?.user_metadata.full_name ?? "username"}
          </div>
        </div>

        {/* Discord */}

        <div className="mb-6">
          <p className="text-[#DDD9C7] text-sm mb-2">Discord</p>
          <Button
            disabled={isFetchingStatus || User !== null}
            className="w-full bg-[#2a2b34] rounded-lg px-4 py-6 text-[#7ACD54] font-bold hover:bg-[#3a3b44] transition-all"
            onClick={connectDiscord}
          >
            {isFetchingStatus
              ? "Fetching status.."
              : User
              ? "Connected"
              : "Connect"}
          </Button>
        </div>
      </div>

      {/* Right Card - Referral */}
      <div className="flex-1 bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-8 shadow-lg shadow-[#7ACD54]/10">
        <h2 className="text-white font-bold text-2xl mb-8 text-center">
          REFERRAL
        </h2>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-center">
            <p className="text-[#DDD9C7] font-bold mb-2">EARNINGS</p>
            <p className="text-[#7ACD54] font-bold text-xl">2.5 SOL</p>
          </div>
          <div className="text-center">
            <p className="text-[#DDD9C7] font-bold mb-2">REFERRALS</p>
            <p className="text-[#7ACD54] font-bold text-xl">12</p>
          </div>
        </div>
        {/* Your Referral Link */}
        <div className="mb-8">
          <p className="text-[#DDD9C7] text-sm mb-3 text-center font-bold">
            YOUR REFERRAL LINK
          </p>
          <div className="bg-[#2a2b34] rounded-lg px-4 py-3 text-[#7ACD54] text-sm text-center break-all">
            https://game.com/ref/abc123xyz789
          </div>
        </div>
        {/* Referral List */}
        <div className="mb-8">
          <p className="text-[#DDD9C7] text-sm mb-4 text-center font-bold">
            REFERRAL LIST
          </p>
          <div className="bg-[#2a2b34] rounded-lg px-4 py-8 text-center text-[#DDD9C7] text-sm">
            <div className="space-y-2">
              <p>Player1 - 0.5 SOL</p>
              <p>Player2 - 0.3 SOL</p>
              <p>Player3 - 0.2 SOL</p>
            </div>
          </div>
        </div>

        {/* Referred By */}
        <div className="text-center text-[#DDD9C7] font-bold text-sm">
          REFFERED BY: NICKNAME
        </div>
      </div>

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
}
