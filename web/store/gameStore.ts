"use client";

import { CONFIG, GameConfig } from "@/server/game/constants";
import { create } from "zustand";

export type GameState = {
  keys: Record<string, boolean>;
  setKey: (key: string, pressed: boolean) => void;
  config: GameConfig;
  setConfig: (partial: Partial<GameConfig>) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  scoreLeft: number; // goals scored into LEFT net (by right-side attacker)
  scoreRight: number; // goals scored into RIGHT net (by left-side attacker)
  lastGoalAt?: number;
  addGoal: (side: "left" | "right") => void;
  // Online-game specific derived state
  phase?: "waiting" | "playing" | "celebrating" | "ended";
  timerMs?: number;
  winnerSide?: "left" | "right" | "draw" | null;
  celebrateMsLeft?: number;
  lastGoalSide?: "left" | "right" | null;
};

export const useGameStore = create<GameState>((set, get) => ({
  keys: {},
  setKey: (key: string, pressed: boolean) =>
    set((state) => ({ keys: { ...state.keys, [key.toLowerCase()]: pressed } })),
  config: CONFIG,
  setConfig: (partial: Partial<GameConfig>) =>
    set((state) => ({ config: { ...state.config, ...partial } })),
  paused: false,
  setPaused: (p: boolean) => set({ paused: p }),
  scoreLeft: 0,
  scoreRight: 0,
  lastGoalAt: undefined,
  addGoal: (side: "left" | "right") =>
    set((state) => {
      const now = performance.now();
      // debounce consecutive detections
      if (state.lastGoalAt && now - state.lastGoalAt < 800) return {};
      return {
        scoreLeft: state.scoreLeft + (side === "left" ? 1 : 0),
        scoreRight: state.scoreRight + (side === "right" ? 1 : 0),
        lastGoalAt: now,
      };
    }),
  phase: "waiting",
  timerMs: undefined,
  winnerSide: null,
  celebrateMsLeft: 0,
  lastGoalSide: null,
}));
