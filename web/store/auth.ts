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
  setProfile: (profile: Tables<"profile"> | undefined) => void;
  balance?: number;
  setBalance: (balance: number) => void;
  connection: Connection | null;
  setConnection: (connection: Connection) => void;
  toggleChat: boolean;
  settoggleChat: (chat: boolean) => void;
};

export const useAuth = create<AuthStore>((set, get) => ({
  profile: null,
  setProfile: (profile: Tables<"profile"> | undefined) => set({ profile }),
  balance: undefined,
  setBalance: (balance: number) => set({ balance }),
  connection: null,
  setConnection: (connection: Connection) => set({ connection: connection }),
  toggleChat: false,
  settoggleChat: (chat: boolean) => set({ toggleChat: chat }),
}));
