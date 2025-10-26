"use client";

import { useState } from "react";
import DepositModal from "./deposit-model";
import WithdrawModal from "./withdraw-model";

export default function ProfileTab() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  return (
    <div className="flex gap-6 px-6 pb-8">
      {/* Left Card - Profile */}
      <div className="flex-1 bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-8 shadow-lg shadow-[#7ACD54]/10">
        <h2 className="text-white font-bold text-2xl mb-8 text-center">
          PROFILE
        </h2>

        {/* Username */}
        <div className="mb-6">
          <p className="text-[#DDD9C7] text-sm mb-2">Username</p>
          <div className="bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7]">
            Enter username
          </div>
        </div>

        {/* Discord */}
        <div className="mb-6">
          <p className="text-[#DDD9C7] text-sm mb-2">Discord</p>
          <button className="w-full bg-[#2a2b34] rounded-lg px-4 py-3 text-[#7ACD54] font-bold hover:bg-[#3a3b44] transition-all">
            CONNECT
          </button>
        </div>

        {/* Redeem Code */}
        <div className="mb-6">
          <button className="w-full text-[#DDD9C7] font-bold hover:text-[#7ACD54] transition-all py-2">
            Redeem a code
          </button>
        </div>

        {/* Wallet Address */}
        <div className="mb-8">
          <p className="text-[#DDD9C7] text-sm mb-2">Wallet address</p>
          <div className="bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] text-sm break-all">
            7xK9mQ2pL5nR8vW3jH6bF4cD1eG9sT2uY5
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 mb-6">
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
        </div>

        {/* Balance */}
        <div className="text-center text-[#DDD9C7] font-bold text-lg">
          BALANCE: 30SOL
        </div>
      </div>

      {/* Right Card - Referral */}
      <div className="flex-1 bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-8 shadow-lg shadow-[#7ACD54]/10">
        <h2 className="text-white font-bold text-2xl mb-8 text-center">
          REFERRAL
        </h2>

        {/* Your Referral Link */}
        <div className="mb-8">
          <p className="text-[#DDD9C7] text-sm mb-3 text-center font-bold">
            YOUR REFERRAL LINK
          </p>
          <div className="bg-[#2a2b34] rounded-lg px-4 py-3 text-[#7ACD54] text-sm text-center break-all">
            https://game.com/ref/abc123xyz789
          </div>
        </div>

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
