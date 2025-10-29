"use client";

import { useRef, useState } from "react";
import { usePlanckWorld } from "../hooks/usePlanckWorld";
import { useInput } from "../hooks/useInput";
import { useGameLoop } from "../hooks/useGameLoop";
import { useGameStore } from "../store/gameStore";
import { useOnlineGame } from "../hooks/net/useOnlineGame";

export default function PlanckGame({ room }: { room?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simple toggle to switch between Local and Online play
  const [online, setOnline] = useState(true);

  // Select primitives separately to avoid React 19 SSR getServerSnapshot caching warning
  const scoreLeft = useGameStore((s) => s.scoreLeft);
  const scoreRight = useGameStore((s) => s.scoreRight);

  function OnlineGame() {
    useOnlineGame(canvasRef, room || "default");
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
        <div style={{ fontWeight: 700 }}>Score: {scoreLeft} - {scoreRight}</div>
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
      </div>
    </div>
  );
}
