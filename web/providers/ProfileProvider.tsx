"use client";
import { useAuth } from "@/store/auth";
import { supabase } from "@/supabase/client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { Wallet } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";

const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const {
    setBalance,
    setConnection,
    connection,
    setProfile,
    setEmbedded_wallet_address,
    setEmbedded_wallet_id,
  } = useAuth();

  useEffect(() => {
    if (!ready || !authenticated) return;

    // ✅ Only create connection **once**
    if (!connection) {
      const newConnection = new Connection(clusterApiUrl("devnet"), {
        commitment: "confirmed",
      });
      setConnection(newConnection);
    }

    const updateProfile = async () => {
      const { error } = await supabase
        .from("profile")
        .upsert(
          { wallet_key: user?.wallet?.address! },
          { onConflict: "wallet_key" }
        )
        .single();

      if (error) toast("Error updating profile");
    };

    const getProfile = async () => {
      const { data: profile_data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("wallet_key", user?.wallet?.address!)
        .single();
      if (profile_data) {
        setProfile(profile_data);
      }
      if (error) toast("Error updating profile");
      const walletId = profile_data?.embedded_wallet_address;
      console.log("walletId:", walletId);
      if (!profile_data?.embedded_wallet_address) {
        setBalance(0);
        return;
      }
      setEmbedded_wallet_address(profile_data.embedded_wallet_address);
      setEmbedded_wallet_id(profile_data.embedded_wallet_id);
      const ACTIVE_CHAIN = process.env.NEXT_PUBLIC_ACTIVE_CHAIN;
      const res = await fetch(
        `/api/privy/wallet-balance?address=${walletId}&asset=sol&chain=${ACTIVE_CHAIN}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch balance");
      }

      const data = await res.json();

      const solanaBalance = data?.balances[0]?.display_values.sol;

      setBalance(solanaBalance);
    };

    updateProfile();
    getProfile();
  }, [ready, authenticated]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
};

export default ProfileProvider;
