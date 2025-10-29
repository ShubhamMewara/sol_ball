"use client";
import { useAuth } from "@/store/auth";
import { supabase } from "@/supabase/client";
import { usePrivy } from "@privy-io/react-auth";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import React, { useEffect } from "react";
import { toast } from "sonner";
import IDL from "@/compiled/solball.json";

const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { ready, authenticated, user } = usePrivy();
  const { setBalance, setConnection, connection } = useAuth();

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

    const fetchBalance = async () => {
      const conn = connection ?? new Connection(clusterApiUrl("devnet"));
      const [user_sub_account] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_sub_account"),
          new PublicKey(user?.wallet?.address!).toBuffer(),
        ],
        new PublicKey(IDL.address)
      );

      const balance = await conn.getBalance(user_sub_account);
      setBalance(balance);
    };

    updateProfile();
    fetchBalance();
  }, [ready, authenticated]); // ✅ correct dependency array

  return <>{children}</>;
};

export default ProfileProvider;
