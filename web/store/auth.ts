"use client";
import { create } from "zustand";
import { User } from "@supabase/supabase-js";

export type AuthStore = {
  user?: User;
  setUser: (user: User | undefined) => void;
  balance?: number;
  setBalance: (balance: number) => void;
};

export const useAuth = create<AuthStore>((set, get) => ({
  user: undefined,
  setUser: (user: User | undefined) => set({ user }),
  balance: undefined,
  setBalance: (balance: number) => set({ balance }),
}));
