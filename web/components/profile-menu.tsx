"use client";

import { useEffect, useState } from "react";
import DepositModal from "./deposit-model";
import WithdrawModal from "./withdraw-model";
import { Button } from "./ui/button";
import { supabase } from "@/supabase/client";
import { UserProfile } from "@/lib/types";
import { usePrivy } from "@privy-io/react-auth";
import { LogOut, Trash } from "lucide-react";
import { useAuth } from "@/store/auth";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import ChatSidebar from "./chat-sidebar";
import { Input } from "./ui/input";
import { toast } from "sonner";

export function ProfilePage() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [userName, setuserName] = useState<string | null>(null);
  const { authenticated, user, ready, login, logout } = usePrivy();
  const { balance, user: user_profile, setUser } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isAvatarUploading, setisAvatarUploading] = useState(false);
  const [isSettingUsername, setisSettingUsername] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);

    const imgURL = URL.createObjectURL(file);
    setPreview(imgURL);
  };

  const connectDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });
  };

  const updateUserName = async () => {
    if (!authenticated) {
      toast("Connect Wallet to set username");
      return;
    }
    setisSettingUsername(true);
    const { data, error } = await supabase
      .from("profile")
      .update({
        username: userName,
      })
      .select("*")
      .eq("wallet_key", user?.wallet?.address!)
      .single();
    if (data) {
      setUser({
        username: data.username!,
        wallet_key: user_profile?.wallet_key!,
        avatar_url: user_profile?.avatar_url!,
      });
    }
    setisSettingUsername(false);
    toast("Username Updated Successfully");
  };

  const updateUserAvatar = async (file: File) => {
    if (!file) return;
    setisAvatarUploading(true);
    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const filePath = `avatar_url/${crypto.randomUUID()}.${fileExt}`;

    // 1. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("solball")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      return;
    }

    // 2. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from("solball")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // 3. Update Database user_profile.avatar_url
    const { data, error: dbError } = await supabase
      .from("profile")
      .update({ avatar_url: publicUrl })
      .eq("wallet_key", user?.wallet?.address!)
      .select("*")
      .single();

    if (dbError) {
      console.error("DB Update Error:", dbError);
      return;
    }
    if (data) {
      setUser({
        username: data.username!,
        wallet_key: user_profile?.wallet_key!,
        avatar_url: user_profile?.avatar_url!,
      });
    }
    setisAvatarUploading(false);
    console.log("✅ Avatar updated:", publicUrl);
  };

  return (
    <div className="flex gap-6 px-6 pb-8 max-w-[1800px] mx-auto">
      <ChatSidebar />

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
            <div className="mb-8 overflow-hidden">
              <p className="text-[#DDD9C7] text-sm mb-2">Wallet address</p>
              <div className="bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] text-sm break-all select-none overflow-hidden">
                {authenticated && user?.wallet?.address.slice(0, 20)}
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
                BALANCE:{" "}
                {balance ? (balance / LAMPORTS_PER_SOL).toFixed(4) : "0"} SOL
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
            {user_profile?.avatar_url || preview ? (
              <>
                <img
                  src={preview ?? user_profile?.avatar_url ?? ""}
                  className="h-full w-full object-cover max-w-12 max-h-12 rounded-full"
                  alt="avatar"
                />
                {user_profile?.username && user_profile?.username}
                {!user_profile?.avatar_url && (
                  <>
                    <Button
                      disabled={!avatarFile}
                      onClick={async () => await updateUserAvatar(avatarFile!)}
                    >
                      {isSettingUsername ? "Updating Avatar" : " Set Avatar"}
                    </Button>
                    <Trash
                      size={18}
                      className="cursor-pointer"
                      onClick={() => setPreview(null)}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <div className="h-24 w-24 flex items-center justify-center text-[10px] text-gray-300 bg-[#1a1b24] border border-gray-600 rounded-full">
                  <label className=" flex items-center justify-center bg-black/40 text-[10px]  hover:opacity-100 cursor-pointer transition">
                    Upload Avatar Url
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </label>
                </div>
                {user_profile?.username && user_profile?.username}
              </>
            )}
          </div>
          {!user_profile?.username && (
            <div className="flex items-center justify-center gap-3">
              <Input
                type="text"
                placeholder="Set Username"
                value={userName ?? ""}
                onChange={(e) => setuserName(e.target.value)}
              />{" "}
              {userName && (
                <Button
                  className="cursor-pointer"
                  onClick={() => updateUserName()}
                >
                  {" "}
                  {isSettingUsername ? "Updating Username" : " Set Username"}
                </Button>
              )}
            </div>
          )}
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
