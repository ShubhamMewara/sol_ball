"use client";

import { create } from "zustand";

export type GameConfig = {
  W: number;
  H: number;
  playerRadiusPx: number;
  ballRadiusPx: number;
  moveSpeed: number; // meters/sec
  timeStep: number; // seconds
  goalHeightPx: number; // opening height of goal on left/right walls
};

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
  phase?: "waiting" | "playing" | "ended";
  timerMs?: number;
  winnerSide?: "left" | "right" | "draw" | null;
};

const defaultConfig: GameConfig = {
  W: 900,
  H: 520,
  playerRadiusPx: 18,
  ballRadiusPx: 12,
  moveSpeed: 4.5,
  timeStep: 1 / 60,
  goalHeightPx: 160,
};

type SetState<T> = (
  partial: Partial<T> | ((state: T) => Partial<T>),
  replace?: boolean,
) => void;

export const useGameStore = create<GameState>((set, get) => ({
  keys: {},
  setKey: (key: string, pressed: boolean) =>
    set((state) => ({ keys: { ...state.keys, [key.toLowerCase()]: pressed } })),
  config: defaultConfig,
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
}));
