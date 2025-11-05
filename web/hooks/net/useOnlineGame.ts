"use client";

import { useEffect, useRef } from "react";
import PartySocket from "partysocket";
import { useGameStore } from "../../store/gameStore";
import { drawPitch } from "../../lib/physics";
import type { ClientSnapshot, ServerWelcome } from "../../lib/netTypes";
import { SCALE } from "@/server/game/constants";

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
  playerKey?: string;
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
  const optsRef = useRef<StartOptions>(opts);
  const startSentRef = useRef<boolean>(false);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);
  // Extra reach in meters comes from config (sent by server). Fallback to 0.5.

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
      const o = optsRef.current;
      // If a team is provided we are joining as a player; otherwise auto-join and let server assign team
      if (o.joinTeam) {
        socket.send(
          JSON.stringify({
            type: "join",
            name: "player",
            team: o.joinTeam,
            teamSize: o.teamSize,
            playerKey: o.playerKey,
          })
        );
      } else {
        socket.send(
          JSON.stringify({
            type: "join",
            name: "player",
            teamSize: o.teamSize,
            playerKey: o.playerKey,
          })
        );
      }
      // Attempt to claim host if requested
      if (o.claimHostWallet) {
        socket.send(
          JSON.stringify({
            type: "claim-host",
            wallet: o.claimHostWallet,
          })
        );
      }
      // Optionally start match immediately (host only; server enforces)
      if (o.startOnConnect) {
        socket.send(
          JSON.stringify({
            type: "start",
            durationMin: o.durationMin || 3,
            wallet: o.claimHostWallet,
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
            scoreRed: s.score.red,
            scoreBlue: s.score.blue,
          });
          // Optional phase/timer fields provided by server
          if (typeof (s as any).timeLeftMs === "number") {
            useGameStore.setState({ timerMs: (s as any).timeLeftMs });
          }
          if ((s as any).phase) {
            useGameStore.setState({ phase: (s as any).phase });
          }
          if (typeof (s as any).goalCelebrationMsLeft === "number") {
            useGameStore.setState({
              celebrateMsLeft: (s as any).goalCelebrationMsLeft,
            });
          }
          if ((s as any).lastGoalTeam) {
            useGameStore.setState({ lastGoalTeam: (s as any).lastGoalTeam });
          }
          if ((s as any).winner) {
            useGameStore.setState({ winnerTeam: (s as any).winner });
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
      const {
        W: w,
        H: h,
        goalHeightPx: gh,
        goalDepthPx: gd,
        pitchInsetPx: pin,
      } = useGameStore.getState().config as any;
      if (!ctx) {
        raf = requestAnimationFrame(frame);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#2e8b57";
      ctx.fillRect(0, 0, w, h);
      drawPitch(ctx, w, h, gh, gd, pin);

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
        // Use only current snapshot roster to avoid duplicate players on reconnects
        const ids = new Set(Object.keys(b.players));
        const keys = useGameStore.getState().keys;
        const isKickingNow = !!(keys[" "] || keys["space"]);
        ids.forEach((id) => {
          const pa = a.players[id] || b.players[id];
          const pb = b.players[id] || a.players[id];
          const px = lerp(pa.x, pb.x);
          const py = lerp(pa.y, pb.y);
          // Player disk
          ctx.beginPath();
          ctx.arc(px * SCALE, py * SCALE, r, 0, Math.PI * 2);
          const team = (pb.team ?? pa.team) as "red" | "blue" | undefined;
          const baseColor =
            team === "red"
              ? "red"
              : team === "blue"
              ? "dodgerblue"
              : id === meRef.current
              ? "red"
              : "dodgerblue";
          if (id === meRef.current) {
            // Local player's disk: fill base color and draw kick radius only (no extra indicator)
            ctx.fillStyle = baseColor;
            ctx.fill();
            const cx = px * SCALE;
            const cy = py * SCALE;
            // Kick radius indicator (ball-edge threshold)
            const cfg = useGameStore.getState().config as any;
            const extra = cfg.kickExtraReachM ?? 0.5;
            const kickRadiusPx = r + extra * SCALE;
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, kickRadiusPx, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.fillStyle = baseColor;
            ctx.fill();
          }
          // Thin outline; for my player make it white while kicking
          ctx.lineWidth = 1;
          const isMe = id === meRef.current;
          ctx.strokeStyle = isMe && isKickingNow ? "#ffffff" : "#000000";
          ctx.stroke();

          // Draw jersey number (stable if provided by server)
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const jersey = (pb as any).num ?? (pa as any).num ?? ((Math.abs([...id].reduce((aa, c) => aa + c.charCodeAt(0), 0)) % 9) + 1);
          ctx.fillText(String(jersey), px * SCALE, py * SCALE);
        });
        drawn = true;
      }

      if (!drawn) {
        // Waiting for server
        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.fillText("Connecting...", 16, 24);
      }

      // Celebration overlay UI
      const st = useGameStore.getState();
      const celebLeft = st.celebrateMsLeft || 0;
      if (st.phase === "celebrating" || celebLeft > 0) {
        const total = 3000; // must match server CELEB_MS
        const left = Math.max(0, Math.min(total, celebLeft));
        const p = 1 - left / total; // 0 -> 1
        // Dim background
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // Side banners
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const sideW = Math.floor(w * 0.22 * Math.sin(p * Math.PI));
        if (sideW > 0) {
          // Left banner
          const gradL = ctx.createLinearGradient(0, 0, sideW, 0);
          gradL.addColorStop(0, "rgba(255,255,255,0.15)");
          gradL.addColorStop(1, "rgba(255,255,255,0.05)");
          ctx.fillStyle = gradL;
          ctx.fillRect(0, 0, sideW, h);
          // Right banner
          const gradR = ctx.createLinearGradient(w - sideW, 0, w, 0);
          gradR.addColorStop(0, "rgba(255,255,255,0.05)");
          gradR.addColorStop(1, "rgba(255,255,255,0.15)");
          ctx.fillStyle = gradR;
          ctx.fillRect(w - sideW, 0, sideW, h);
        }

        // Center text animation
        const tScale = 1 + 0.15 * Math.sin(p * Math.PI);
        const fontSize = Math.round(72 * tScale);
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 6;
        ctx.strokeText("GOAL!", w / 2, h / 2 - 10);
        ctx.fillText("GOAL!", w / 2, h / 2 - 10);

        // Subtext showing team who scored
        const teamLabel =
          st.lastGoalTeam === "red"
            ? "Red"
            : st.lastGoalTeam === "blue"
            ? "Blue"
            : "";
        if (teamLabel) {
          ctx.font = `600 ${Math.round(
            24 + 6 * ease(p)
          )}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
          ctx.fillStyle = "#ffee58";
          ctx.strokeStyle = "rgba(0,0,0,0.5)";
          ctx.lineWidth = 4;
          ctx.strokeText(teamLabel, w / 2, h / 2 + 34);
          ctx.fillText(teamLabel, w / 2, h / 2 + 34);
        }
        ctx.restore();
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

  // Late start: if options arrive after socket is open, send claim-host/start once
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const o = optsRef.current;
    if (o.claimHostWallet) {
      s.send(
        JSON.stringify({ type: "claim-host", wallet: o.claimHostWallet })
      );
    }
    if (o.startOnConnect && !startSentRef.current) {
      s.send(
        JSON.stringify({
          type: "start",
          durationMin: o.durationMin || 3,
          wallet: o.claimHostWallet,
        })
      );
      startSentRef.current = true;
    }
  }, [opts.claimHostWallet, opts.startOnConnect, opts.durationMin]);

  // API to trigger start from UI
  const startMatch = (durationMin?: number) => {
    const s = socketRef.current;
    if (!s) return;
    const o = optsRef.current;
    s.send(
      JSON.stringify({
        type: "start",
        durationMin: durationMin ?? o.durationMin ?? 3,
        wallet: o.claimHostWallet,
      })
    );
  };

  return { startMatch };
}
