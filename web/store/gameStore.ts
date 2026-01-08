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
  scoreRed: number;
  scoreBlue: number;
  lastGoalAt?: number;
  addGoal: (team: "red" | "blue") => void;
  // Online-game specific derived state
  phase?: "waiting" | "playing" | "celebrating" | "ended";
  timerMs?: number;
  winnerTeam?: "red" | "blue" | "draw" | null;
  celebrateMsLeft?: number;
  lastGoalTeam?: "red" | "blue" | null;
  pingMs?: number;
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
  scoreRed: 0,
  scoreBlue: 0,
  lastGoalAt: undefined,
  addGoal: (team: "red" | "blue") =>
    set((state) => {
      const now = performance.now();
      // debounce consecutive detections
      if (state.lastGoalAt && now - state.lastGoalAt < 800) return {};
      return {
        scoreRed: state.scoreRed + (team === "red" ? 1 : 0),
        scoreBlue: state.scoreBlue + (team === "blue" ? 1 : 0),
        lastGoalAt: now,
      };
    }),
  phase: "waiting",
  timerMs: undefined,
  winnerTeam: null,
  celebrateMsLeft: 0,
  lastGoalTeam: null,
  pingMs: undefined,
}));
