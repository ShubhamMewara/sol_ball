"use client";
import { create } from "zustand";
import { Connection } from "@solana/web3.js";
import { Tables } from "@/supabase/database.types";

interface User {
  wallet_key: string | null;
  username: string | null;
  avatar_url: string | null;
}

export type AuthStore = {
  profile: Tables<"profile"> | null;
  embedded_wallet_address: string | null;
  embedded_wallet_id: string | null;
  setEmbedded_wallet_address: (address: string | null) => void;
  setEmbedded_wallet_id: (id: string | null) => void;
  setProfile: (profile: Tables<"profile"> | undefined) => void;
  balance?: number | null;
  setBalance: (balance: number | null) => void;
  connection: Connection | null;
  setConnection: (connection: Connection) => void;
  toggleChat: boolean;
  settoggleChat: (chat: boolean) => void;
};

export const useAuth = create<AuthStore>((set, get) => ({
  profile: null,
  embedded_wallet_address: null,
  embedded_wallet_id: null,
  setEmbedded_wallet_address: (address: string | null) =>
    set({ embedded_wallet_address: address }),
  setEmbedded_wallet_id: (id: string | null) => set({ embedded_wallet_id: id }),
  setProfile: (profile: Tables<"profile"> | undefined) => set({ profile }),
  balance: undefined,
  setBalance: (balance: number | null) => set({ balance }),
  connection: null,
  setConnection: (connection: Connection) => set({ connection: connection }),
  toggleChat: false,
  settoggleChat: (chat: boolean) => set({ toggleChat: chat }),
}));
