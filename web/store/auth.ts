"use client";
import { create } from "zustand";
import { Connection } from "@solana/web3.js";

interface User {
  wallet_key: string | null;
  username: string | null;
  avatar_url: string | null;
}

export type AuthStore = {
  user?: User;
  setUser: (user: User | undefined) => void;
  balance?: number;
  setBalance: (balance: number) => void;
  connection: Connection | null;
  setConnection: (connection: Connection) => void;
};

export const useAuth = create<AuthStore>((set, get) => ({
  user: undefined,
  setUser: (user: User | undefined) => set({ user }),
  balance: undefined,
  setBalance: (balance: number) => set({ balance }),
  connection: null,
  setConnection: (connection: Connection) => set({ connection: connection }),
}));
