import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "room"
  );
}

export function toLamports(sol: number): number {
  // Avoid NaN, round to nearest lamport
  return Math.max(0, Math.round(sol * LAMPORTS_PER_SOL));
}
