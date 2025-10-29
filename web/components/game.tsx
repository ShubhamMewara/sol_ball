"use client";

import { useMemo, useRef, useState } from "react";
import { usePlanckWorld } from "../hooks/usePlanckWorld";
import { useInput } from "../hooks/useInput";
import { useGameLoop } from "../hooks/useGameLoop";
import { useGameStore } from "../store/gameStore";
import { useOnlineGame } from "../hooks/net/useOnlineGame";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function PlanckGame({ room }: { room?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simple toggle to switch between Local and Online play
  const [online, setOnline] = useState(true);

  // Select primitives separately to avoid React 19 SSR getServerSnapshot caching warning
  const scoreLeft = useGameStore((s) => s.scoreLeft);
  const scoreRight = useGameStore((s) => s.scoreRight);

  function OnlineGame() {
    const params = useSearchParams();
    const start = params?.get("start") === "1";
    const duration = params?.get("duration");
    const { user } = usePrivy();
    const wallet = user?.wallet?.address || user?.id || undefined;
    const team = params?.get("team") as "red" | "blue" | null;
    const teamSizeParam = params?.get("teamSize");
    const teamSize = teamSizeParam ? Math.max(1, parseInt(teamSizeParam)) : undefined;
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
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>WASD to move, Space to kick</h2>
        <div style={{ fontWeight: 700 }}>
          Score: {scoreLeft} - {scoreRight}
        </div>
        <TimerBar />
        <button
          onClick={() => setOnline((v) => !v)}
          style={{ marginLeft: "auto", padding: "6px 10px" }}
        >
          {online ? "Switch to Local" : "Switch to Online"}
        </button>
      </div>
      <div style={{ position: "relative", width: "fit-content" }}>
        <canvas
          ref={canvasRef}
          style={{ border: "1px solid #333", background: "#4caf50" }}
        />
        {online ? <OnlineGame /> : <LocalGame />}
        <GameOverOverlay />
      </div>
    </div>
  );
}

function TimerBar() {
  const phase = useGameStore((s) => s.phase);
  const ms = useGameStore((s) => s.timerMs);
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
  return (
    <div style={{ marginLeft: 16, fontWeight: 700 }}>
      {phase === "playing" ? `Time: ${label}` : `Status: ${label}`}
    </div>
  );
}

function GameOverOverlay() {
  const phase = useGameStore((s) => s.phase);
  const left = useGameStore((s) => s.scoreLeft);
  const right = useGameStore((s) => s.scoreRight);
  if (phase !== "ended") return null;
  const result = left === right ? "Draw" : left > right ? "Left Wins" : "Right Wins";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
        fontWeight: 800,
      }}
    >
      <div style={{ marginBottom: 8 }}>Game Over</div>
      <div style={{ marginBottom: 12 }}>{result}</div>
      <div>
        Final Score: {left} - {right}
      </div>
    </div>
  );
}
