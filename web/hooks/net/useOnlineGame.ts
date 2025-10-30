"use client";

import { useEffect, useRef } from "react";
import PartySocket from "partysocket";
import { useGameStore } from "../../store/gameStore";
import { drawPitch, SCALE } from "../../lib/physics";
import type { ClientSnapshot, ServerWelcome } from "../../lib/netTypes";

function getHost() {
  if (typeof window === "undefined") return "";
  return (
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ||
    (location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "localhost:1999"
      : location.host)
  );
}

type StartOptions = {
  claimHostWallet?: string;
  startOnConnect?: boolean;
  durationMin?: number;
  joinTeam?: "red" | "blue";
  teamSize?: number;
};

export function useOnlineGame(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  roomName: string,
  opts: StartOptions = {}
) {
  const socketRef = useRef<PartySocket | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const snapshotsRef = useRef<ClientSnapshot[]>([]);
  const meRef = useRef<string | null>(null);
  const serverOffsetRef = useRef<number>(0); // clientNow - serverNow estimate
  const offsetInitRef = useRef<boolean>(false);
  const bufferDelayMs = 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas and config
    const { W, H, goalHeightPx } = useGameStore.getState().config;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    // Connect to PartyKit room
    const host = getHost();
    const socket = new PartySocket({ host, room: roomName || "default" });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      // If a team is provided we are joining as a player; otherwise auto-join and let server assign team
      if (opts.joinTeam) {
        socket.send(
          JSON.stringify({
            type: "join",
            name: "player",
            team: opts.joinTeam,
            teamSize: opts.teamSize,
          })
        );
      } else {
        socket.send(
          JSON.stringify({
            type: "join",
            name: "player",
            teamSize: opts.teamSize,
          })
        );
      }
      // Attempt to claim host if requested
      if (opts.claimHostWallet) {
        socket.send(
          JSON.stringify({
            type: "claim-host",
            wallet: opts.claimHostWallet,
          })
        );
      }
      // Optionally start match immediately (host only; server enforces)
      if (opts.startOnConnect) {
        socket.send(
          JSON.stringify({
            type: "start",
            durationMin: opts.durationMin || 3,
            wallet: opts.claimHostWallet,
          })
        );
      }
    });

    socket.addEventListener("message", (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(String(ev.data));
        if (msg.type === "welcome") {
          // Optionally override config if server sends it
          const w = msg as ServerWelcome;
          useGameStore.getState().setConfig(w.config);
        } else if (msg.type === "snapshot") {
          const s = msg as ClientSnapshot;
          meRef.current = s.me || meRef.current;
          // Estimate server time offset on first snapshot
          if (!offsetInitRef.current && typeof s.t === "number") {
            serverOffsetRef.current = Date.now() - s.t;
            offsetInitRef.current = true;
          }
          // push to buffer and trim history (~2s)
          const arr = snapshotsRef.current;
          arr.push(s);
          const cutoff = Date.now() - 2000;
          while (arr.length > 2 && arr[0].t < cutoff) arr.shift();
          // Update scoreboard in client store
          useGameStore.setState({
            scoreLeft: s.score.left,
            scoreRight: s.score.right,
          });
          // Optional phase/timer fields provided by server
          if (typeof (s as any).timeLeftMs === "number") {
            useGameStore.setState({ timerMs: (s as any).timeLeftMs });
          }
          if ((s as any).phase) {
            useGameStore.setState({ phase: (s as any).phase });
          }
          if ((s as any).winner) {
            useGameStore.setState({ winnerSide: (s as any).winner });
          }
        }
      } catch {
        // ignore
      }
    });

    // Basic key capture for online mode (updates Zustand keys)
    const setKey = useGameStore.getState().setKey;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setKey("space", true);
      }
      setKey(e.key.toLowerCase(), true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setKey("space", false);
      }
      setKey(e.key.toLowerCase(), false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Send inputs on an interval
    const inputTimer = setInterval(() => {
      const keys = useGameStore.getState().keys;
      const payload = {
        type: "inputs",
        keys: {
          w: !!keys["w"],
          a: !!keys["a"],
          s: !!keys["s"],
          d: !!keys["d"],
        },
        actions: { kick: !!keys[" "] || !!keys["space"] },
        at: Date.now(),
      };
      socket.send(JSON.stringify(payload));
    }, 33); // ~30 Hz

    // Render loop with interpolation buffer
    let raf = 0;
    const frame = () => {
      const ctx = ctxRef.current;
      const snaps = snapshotsRef.current;
      const { W: w, H: h, goalHeightPx: gh } = useGameStore.getState().config;
      if (!ctx) {
        raf = requestAnimationFrame(frame);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#2e8b57";
      ctx.fillRect(0, 0, w, h);
      drawPitch(ctx, w, h, gh);

      const target = Date.now() - serverOffsetRef.current - bufferDelayMs;
      let drawn = false;
      if (snaps.length >= 1) {
        // Find bounding snapshots around target
        let idx = 1;
        while (idx < snaps.length && snaps[idx].t < target) idx++;
        const a = snaps[Math.max(0, idx - 1)];
        const b = snaps[Math.min(snaps.length - 1, idx)];

        const span = Math.max(1, b.t - a.t);
        const f = Math.min(1, Math.max(0, (target - a.t) / span));
        const lerp = (x0: number, x1: number) => x0 + (x1 - x0) * f;

        // Ball
        const bx = lerp(a.ball.x, b.ball.x);
        const by = lerp(a.ball.y, b.ball.y);
        ctx.beginPath();
        ctx.arc(
          bx * SCALE,
          by * SCALE,
          useGameStore.getState().config.ballRadiusPx,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.stroke();

        // Players
        const r = useGameStore.getState().config.playerRadiusPx;
        const ids = new Set([
          ...Object.keys(a.players),
          ...Object.keys(b.players),
        ]);
        ids.forEach((id) => {
          const pa = a.players[id] || b.players[id];
          const pb = b.players[id] || a.players[id];
          const px = lerp(pa.x, pb.x);
          const py = lerp(pa.y, pb.y);
          ctx.beginPath();
          ctx.arc(px * SCALE, py * SCALE, r, 0, Math.PI * 2);
          ctx.fillStyle = id === meRef.current ? "red" : "dodgerblue";
          ctx.fill();
          ctx.strokeStyle = "black";
          ctx.stroke();

          // Draw jersey number
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const num =
            (Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % 9) +
            1; // 1-9 stable
          ctx.fillText(String(num), px * SCALE, py * SCALE);
        });
        drawn = true;
      }

      if (!drawn) {
        // Waiting for server
        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.fillText("Connecting...", 16, 24);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      clearInterval(inputTimer);
      if (raf) cancelAnimationFrame(raf);
      socket.close();
      socketRef.current = null;
      ctxRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      snapshotsRef.current = [];
      meRef.current = null;
    };
  }, [canvasRef, roomName]);
}
