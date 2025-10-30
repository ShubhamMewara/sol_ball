"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { usePlanckWorld } from "../hooks/usePlanckWorld";
import { useInput } from "../hooks/useInput";
import { useGameLoop } from "../hooks/useGameLoop";
import { useGameStore } from "../store/gameStore";
import { useOnlineGame } from "../hooks/net/useOnlineGame";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

export default function PlanckGame({ room }: { room?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simple toggle to switch between Local and Online play
  const [online, setOnline] = useState(true);

  // Select primitives separately to avoid React 19 SSR getServerSnapshot caching warning
  const scoreLeft = useGameStore((s) => s.scoreLeft);
  const scoreRight = useGameStore((s) => s.scoreRight);
  const phase = useGameStore((s) => s.phase);

  function OnlineGame() {
    const params = useSearchParams();
    const start = params?.get("start") === "1";
    const duration = params?.get("duration");
    const { user } = usePrivy();
    const wallet = user?.wallet?.address || user?.id || undefined;
    const team = params?.get("team") as "red" | "blue" | null;
    const teamSizeParam = params?.get("teamSize");
    const teamSize = teamSizeParam
      ? Math.max(1, parseInt(teamSizeParam))
      : undefined;
    useOnlineGame(canvasRef, room || "default", {
      claimHostWallet: start ? wallet : undefined,
      startOnConnect: start,
      durationMin: duration ? parseInt(duration) || 3 : 3,
      joinTeam: team || undefined,
      teamSize,
    });
    return null;
  }

  function LocalGame() {
    const { worldRef, bodiesRef, ctxRef } = usePlanckWorld(canvasRef);
    useInput(bodiesRef);
    useGameLoop(worldRef, bodiesRef, ctxRef);
    return null;
  }

  return (
    <div className="min-h-[83vh] w-full flex flex-col">
      {/* Centered Game Stage */}
      <main className="flex-1 grid place-items-center px-4 py-6">
        <div className="relative" aria-live="polite">
          {/* Canvas frame */}
          <div className="pointer-events-none absolute -inset-3 rounded-2xl bg-emerald-900/40 blur" />
          <div className="rounded-xl border border-emerald-700/50 shadow-2xl shadow-emerald-900/50 overflow-hidden bg-emerald-900/30">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="block bg-emerald-600"
                style={{ border: "2px solid rgba(6,95,70,0.9)" }}
              />

              {/* HUD overlay inside canvas bounds */}
              <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-3">
                <ScoreAndTimer scoreLeft={scoreLeft} scoreRight={scoreRight} />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3">
                <ControlsHint />
              </div>
            </div>
          </div>
          {online ? <OnlineGame /> : <LocalGame />}
          <GameOverOverlay />
        </div>
      </main>

      {/* Footer status */}
      <footer className="w-full border-t border-emerald-700/30 bg-emerald-950/30">
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm text-emerald-200/80 flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${
              phase === "playing"
                ? "bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.6)]"
                : phase === "ended"
                ? "bg-rose-400 shadow-[0_0_10px_2px_rgba(251,113,133,0.5)]"
                : "bg-amber-300 shadow-[0_0_10px_2px_rgba(252,211,77,0.4)]"
            }`}
          />
          <span className="capitalize">{phase}</span>
        </div>
      </footer>
    </div>
  );
}

function TimerBar() {
  const phase = useGameStore((s) => s.phase);
  const ms = useGameStore((s) => s.timerMs);
  const initialMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === "playing" && typeof ms === "number") {
      if (initialMsRef.current === null || ms > (initialMsRef.current ?? 0)) {
        initialMsRef.current = ms;
      }
    }
    if (phase !== "playing") {
      initialMsRef.current = null;
    }
  }, [phase, ms]);

  const label = useMemo(() => {
    if (!ms && phase !== "playing") return "Waiting";
    if (!ms) return "--:--";
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [ms, phase]);

  const progress = useMemo(() => {
    if (!initialMsRef.current || !ms || phase !== "playing") return 0;
    return Math.max(0, Math.min(1, ms / initialMsRef.current));
  }, [ms, phase]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wider text-emerald-100">
        <span className="uppercase opacity-80">
          {phase === "playing" ? "Time" : "Status"}
        </span>
        <span className="text-emerald-50">{label}</span>
      </div>
      {phase === "playing" && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-900/60">
          <div
            className="h-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.6)] transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function GameOverOverlay() {
  const phase = useGameStore((s) => s.phase);
  const left = useGameStore((s) => s.scoreLeft);
  const right = useGameStore((s) => s.scoreRight);
  if (phase !== "ended") return null;
  const result =
    left === right ? "Draw" : left > right ? "Left Wins" : "Right Wins";
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 text-emerald-50">
      <div className="rounded-xl border border-emerald-700/50 bg-emerald-900/40 px-8 py-6 text-center shadow-2xl backdrop-blur-md">
        <div className="mb-1 text-sm uppercase tracking-widest text-emerald-200/80">
          Game Over
        </div>
        <div className="mb-3 text-3xl font-extrabold tracking-wide text-emerald-100">
          {result}
        </div>
        <div className="text-lg font-semibold">
          Final Score: {left} - {right}
        </div>
      </div>
    </div>
  );
}

function ScoreAndTimer({
  scoreLeft,
  scoreRight,
}: {
  scoreLeft: number;
  scoreRight: number;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-emerald-700/60 bg-emerald-950/50 px-3 py-2 shadow-md backdrop-blur-md">
      <div className="flex items-end justify-between gap-4">
        {/* Left team */}
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_10px_2px_rgba(251,113,133,0.5)]" />
          <span className="text-xs uppercase tracking-wider text-rose-200/90">
            Red
          </span>
          <span className="text-2xl font-black tabular-nums text-rose-100">
            {scoreLeft}
          </span>
        </div>
        {/* Timer */}
        <div className="flex-1 max-w-60">
          <TimerBar />
        </div>
        {/* Right team */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tabular-nums text-sky-100">
            {scoreRight}
          </span>
          <span className="text-xs uppercase tracking-wider text-sky-200/90">
            Blue
          </span>
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.5)]" />
        </div>
      </div>
    </div>
  );
}

function ControlsHint() {
  return (
    <div className="mx-auto flex w-full max-w-lg items-center justify-between text-[11px] font-semibold text-emerald-100/90">
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/50 px-2 py-1">
        <span className="opacity-75">Tip:</span>
        <span className="text-emerald-300">WASD</span>
        <span className="opacity-75">to move,</span>
        <span className="text-emerald-300">Space</span>
        <span className="opacity-75">to kick</span>
      </span>
      <span className="rounded-md bg-emerald-950/50 px-2 py-1 opacity-80">
        Have fun!
      </span>
    </div>
  );
}
