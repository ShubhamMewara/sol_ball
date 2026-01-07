"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { supabase } from "@/supabase/client";
import { usePrivy } from "@privy-io/react-auth";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  Camera,
  Check,
  Coins,
  Copy,
  LogOut,
  Trash,
  User,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import WalletModal from "./wallet-modal";

export function ProfilePage() {
  const [walletDialog, setWalletDialog] = useState<{
    open: boolean;
    tab: "deposit" | "withdraw";
  }>({
    open: false,
    tab: "deposit",
  });
  const [userName, setuserName] = useState<string | null>(null);
  const { authenticated, user, ready, login, logout } = usePrivy();
  const { balance, setProfile, profile } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isAvatarUploading, setisAvatarUploading] = useState(false);
  const [isSettingUsername, setisSettingUsername] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);

    const imgURL = URL.createObjectURL(file);
    setPreview(imgURL);
  };

  const updateUserName = async () => {
    if (!authenticated) {
      toast("Connect Wallet to set username");
      return;
    }
    if (!userName || userName.trim().length === 0) {
      toast.error("Username cannot be empty");
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

    if (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username");
    } else if (data) {
      setProfile(data);
      toast.success("Username Updated Successfully");
    }
    setisSettingUsername(false);
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
      toast.error("Failed to upload image");
      setisAvatarUploading(false);
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
      toast.error("Failed to update profile");
      setisAvatarUploading(false);
      return;
    }
    if (data) {
      setProfile(data);
      setAvatarFile(null); // Reset file after success
      toast.success("Avatar updated successfully");
    }
    setisAvatarUploading(false);
  };

  const copyAddress = () => {
    if (user?.wallet?.address) {
      navigator.clipboard.writeText(user.wallet.address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 px-6 pb-12 max-w-[1600px] mx-auto w-full">
      {/* Left Card - Identity (Profile + Wallet) */}
      <Card className="flex-1 bg-[#1a1b24] border-0 shadow-2xl overflow-hidden relative flex flex-col">
        {/* Decorative Background Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-r from-[#7ACD54]/20 via-[#7ACD54]/10 to-transparent pointer-events-none" />

        <CardContent className="p-0 flex flex-col h-full">
          {/* Header Section */}
          <div className="p-8 pb-0 relative z-10 flex justify-between items-start">
            <h2 className="text-white font-bold text-2xl tracking-tight flex items-center gap-2">
              <User className="w-6 h-6 text-[#7ACD54]" />
              PROFILE
            </h2>
            {authenticated && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                title="Logout"
              >
                <LogOut size={20} />
              </Button>
            )}
          </div>
          {/* Profile Content */}
          <div className="flex flex-col items-center mt-6 px-8">
            {/* Avatar Circle */}
            <div className="relative group">
              <div
                className={cn(
                  "w-32 h-32 rounded-full border-4 border-[#1a1b24] shadow-xl overflow-hidden bg-[#2a2b34] flex items-center justify-center relative z-10",
                  "ring-4 ring-[#7ACD54]/20 transition-all duration-300 group-hover:ring-[#7ACD54]/40"
                )}
              >
                {profile?.avatar_url || preview ? (
                  <img
                    src={preview ?? profile?.avatar_url ?? ""}
                    className="h-full w-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <User className="w-12 h-12 text-gray-500" />
                )}

                {/* Upload Overlay */}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 text-white gap-1">
                  <Camera size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Edit
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              </div>

              {/* Status Indicator */}
              {authenticated && (
                <div
                  className="absolute bottom-2 right-2 z-20 w-5 h-5 bg-[#7ACD54] rounded-full border-4 border-[#1a1b24]"
                  title="Online"
                />
              )}
            </div>

            {/* Avatar Actions (Save/Cancel) */}
            {preview && !profile?.avatar_url && (
              <div className="flex gap-2 mt-4 animate-in fade-in slide-in-from-top-2">
                <Button
                  size="sm"
                  className="bg-[#7ACD54] text-black hover:bg-[#6bc145]"
                  onClick={() => updateUserAvatar(avatarFile!)}
                  disabled={isAvatarUploading}
                >
                  {isAvatarUploading ? "Saving..." : "Save Avatar"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setPreview(null);
                    setAvatarFile(null);
                  }}
                  disabled={isAvatarUploading}
                >
                  <Trash size={16} />
                </Button>
              </div>
            )}

            {/* Username Section */}
            <div className="mt-6 w-full max-w-sm text-center">
              {profile?.username ? (
                <h3 className="text-3xl font-bold text-white tracking-tight">
                  {profile.username}
                </h3>
              ) : (
                <div className="flex gap-2 items-center justify-center">
                  <Input
                    type="text"
                    placeholder="Set Username"
                    value={userName ?? ""}
                    onChange={(e) => setuserName(e.target.value)}
                    className="bg-[#2a2b34] border-gray-700 text-white focus:border-[#7ACD54] transition-all"
                  />
                  <Button
                    onClick={() => updateUserName()}
                    disabled={isSettingUsername || !userName}
                    className="bg-[#7ACD54] text-black hover:bg-[#6bc145]"
                  >
                    {isSettingUsername ? "..." : "Set"}
                  </Button>
                </div>
              )}
            </div>

            {/* Wallet Address Chip */}
            {authenticated && user?.wallet?.address && (
              <div
                className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[#2a2b34]/50 rounded-full border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
                onClick={copyAddress}
              >
                <div className="w-2 h-2 rounded-full bg-[#7ACD54] animate-pulse" />
                <span className="text-xs font-mono text-gray-400 group-hover:text-gray-300 transition-colors">
                  {user.wallet.address.slice(0, 6)}...
                  {user.wallet.address.slice(-4)}
                </span>
                {copied ? (
                  <Check size={12} className="text-[#7ACD54]" />
                ) : (
                  <Copy
                    size={12}
                    className="text-gray-500 group-hover:text-white transition-colors"
                  />
                )}
              </div>
            )}
          </div>
          <div className="flex-1" /> {/* Spacer */}
          {/* Wallet Actions Section */}
          <div className="mt-8 bg-[#14151C]/50 p-8 border-t border-white/5">
            {!ready ? (
              <div className="text-center text-gray-500 animate-pulse">
                Loading wallet...
              </div>
            ) : !authenticated ? (
              <Button
                className="w-full bg-[#7ACD54] text-[#14151C] py-6 text-lg font-bold hover:bg-[#6ab844] shadow-[0_0_20px_-5px_#7ACD54]"
                onClick={() => login({ loginMethods: ["wallet"] })}
              >
                <Wallet className="mr-2" />
                Connect Wallet
              </Button>
            ) : (
              <div className="space-y-6">
                {/* Balance Display */}
                <div className="flex flex-col items-center justify-center p-4 bg-[#2a2b34]/30 rounded-xl border border-white/5">
                  <span className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">
                    Total Balance
                  </span>
                  <div className="text-4xl font-bold text-white flex items-baseline gap-1">
                    {balance
                      ? (balance / LAMPORTS_PER_SOL).toFixed(4)
                      : "0.0000"}
                    <span className="text-lg text-[#7ACD54]">SOL</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    className="w-full bg-[#7ACD54] text-[#14151C] font-bold hover:bg-[#6ab844] hover:scale-[1.02] transition-all shadow-lg shadow-[#7ACD54]/10 h-12"
                    onClick={() =>
                      setWalletDialog({ open: true, tab: "deposit" })
                    }
                  >
                    DEPOSIT
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full bg-[#e83838] text-white font-bold hover:bg-[#ff5252] hover:scale-[1.02] transition-all shadow-lg shadow-[#e83838]/10 h-12"
                    onClick={() =>
                      setWalletDialog({ open: true, tab: "withdraw" })
                    }
                  >
                    WITHDRAW
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Right Card - Referral */}
      <Card className="flex-1 bg-[#1a1b24] border-0 shadow-2xl overflow-hidden flex flex-col relative">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#7ACD54] text-black px-6 py-2 rounded-full font-bold text-lg transform -rotate-12 shadow-lg border-4 border-white/10 whitespace-nowrap">
            REFERRALS COMING SOON
          </div>
        </div>

        <CardContent className="p-8 flex flex-col h-full opacity-50 pointer-events-none select-none filter blur-[2px]">
          <div className="flex items-center justify-center mb-8">
            <h2 className="text-white font-bold text-2xl tracking-tight flex items-center gap-2">
              <Coins className="w-6 h-6 text-[#7ACD54]" />
              REFERRAL
            </h2>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#2a2b34]/50 p-4 rounded-xl border border-white/5 text-center hover:bg-[#2a2b34] transition-colors">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                Earnings
              </p>
              <p className="text-[#7ACD54] font-bold text-2xl">2.5 SOL</p>
            </div>
            <div className="bg-[#2a2b34]/50 p-4 rounded-xl border border-white/5 text-center hover:bg-[#2a2b34] transition-colors">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                Referrals
              </p>
              <p className="text-white font-bold text-2xl">12</p>
            </div>
          </div>

          {/* Your Referral Link */}
          <div className="mb-8">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 text-center">
              Your Referral Link
            </p>
            <div className="bg-[#14151C] rounded-lg p-4 flex items-center justify-between gap-2 border border-white/5 group hover:border-[#7ACD54]/30 transition-colors">
              <code className="text-[#7ACD54] text-sm truncate">
                https://game.com/ref/abc123xyz789
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-500 hover:text-white"
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>

          {/* Referral List */}
          <div className="flex-1">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 text-center">
              Referral History
            </p>
            <div className="bg-[#14151C] rounded-xl p-1 border border-white/5 h-[200px] overflow-y-auto custom-scrollbar">
              <div className="space-y-1 p-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-lg hover:bg-[#2a2b34] transition-colors"
                  >
                    <span className="text-gray-300 text-sm">Player{i}</span>
                    <span className="text-[#7ACD54] text-sm font-mono">
                      +{0.5 - i * 0.1} SOL
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Referred By */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2a2b34]/50 text-xs font-medium text-gray-400">
              <span>Referred by:</span>
              <span className="text-white">NICKNAME</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <WalletModal
        isOpen={walletDialog.open}
        initialTab={walletDialog.tab}
        onClose={() => setWalletDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
