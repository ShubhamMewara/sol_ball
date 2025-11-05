"use client";

import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { drawCircle, drawPitch, resetPositions } from "../lib/physics";
import planck from "planck-js";
import { SCALE } from "@/server/game/constants";

export function useGameLoop(
  worldRef: React.RefObject<planck.World | null>,
  bodiesRef: React.RefObject<{ player: planck.Body; ball: planck.Body } | null>,
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>
) {
  const KICK_EXTRA_REACH_M = 0.5; // keep in sync with server kick logic
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (t: number) => {
      const world = worldRef.current;
      const bodies = bodiesRef.current;
      const ctx = ctxRef.current;
      if (!world || !bodies || !ctx) {
        raf = requestAnimationFrame(frame);
        return;
      }

      const {
        W,
        H,
        moveSpeed,
        timeStep,
        ballRadiusPx,
        playerRadiusPx,
        goalHeightPx,
        goalDepthPx,
        pitchInsetPx,
      } = useGameStore.getState().config;
      const keys = useGameStore.getState().keys;

      const dt = (t - last) / 1000;
      last = t;

      // Movement from keys
      let vx = 0;
      let vy = 0;
      if (keys["w"]) vy -= moveSpeed;
      if (keys["s"]) vy += moveSpeed;
      if (keys["a"]) vx -= moveSpeed;
      if (keys["d"]) vx += moveSpeed;
      bodies.player.setLinearVelocity(planck.Vec2(vx, vy));

      // Step physics
      world.step(timeStep);

      // Dribble-like interaction: when touching, ball inherits most of player velocity
      {
        // Non-sticky dribble: influence ball only along contact normal
        const playerR = playerRadiusPx / SCALE;
        const ballR = ballRadiusPx / SCALE;
        const sumR = playerR + ballR;
        const SEP = 0.01;
        const mix = 0.35;
        const tangentDamp = 0.98;
        const pp = bodies.player.getPosition();
        const pv = bodies.player.getLinearVelocity();
        const bp0 = bodies.ball.getPosition();
        const bv0 = bodies.ball.getLinearVelocity();
        const dx = bp0.x - pp.x;
        const dy = bp0.y - pp.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= sumR + 0.01) {
          const nx = dist > 0 ? dx / dist : 1;
          const ny = dist > 0 ? dy / dist : 0;
          const target = sumR + SEP;
          if (dist < target) {
            bodies.ball.setPosition(planck.Vec2(pp.x + nx * target, pp.y + ny * target));
          }
          const vbN = bv0.x * nx + bv0.y * ny;
          const vpN = pv.x * nx + pv.y * ny;
          if (vpN > vbN) {
            const vbT_x = bv0.x - vbN * nx;
            const vbT_y = bv0.y - vbN * ny;
            const vbN_new = vbN + (vpN - vbN) * mix;
            const nvx = vbT_x * tangentDamp + vbN_new * nx;
            const nvy = vbT_y * tangentDamp + vbN_new * ny;
            bodies.ball.setLinearVelocity(planck.Vec2(nvx, nvy));
          }
        }
      }

      // Ball-only collision with white touchline rectangle (allow through goal band)
      const top = useGameStore.getState().config.pitchInsetPx ?? 20;
      const bottom = H - top;
      const left = top;
      const right = W - top;
      const bp = bodies.ball.getPosition();
      const bv = bodies.ball.getLinearVelocity();
      let bx = bp.x * SCALE;
      let by = bp.y * SCALE;
      let bvx = bv.x;
      let bvy = bv.y;
      const inBandForWalls =
        by > H / 2 - goalHeightPx / 2 && by < H / 2 + goalHeightPx / 2;
      const bounceK = 0.9;
      if (bx < left && !inBandForWalls) {
        bx = left;
        bvx = Math.abs(bvx) * bounceK;
      }
      if (bx > right && !inBandForWalls) {
        bx = right;
        bvx = -Math.abs(bvx) * bounceK;
      }
      if (by < top) {
        by = top;
        bvy = Math.abs(bvy) * bounceK;
      }
      if (by > bottom) {
        by = bottom;
        bvy = -Math.abs(bvy) * bounceK;
      }
      bodies.ball.setPosition(planck.Vec2(bx / SCALE, by / SCALE));
      bodies.ball.setLinearVelocity(planck.Vec2(bvx, bvy));

      // Goal detection (ball inside left/right opening and beyond boundary)
      const ballPos = bodies.ball.getPosition();
      const ballXpx = ballPos.x * SCALE;
      const ballYpx = ballPos.y * SCALE;
      const inGoalBand =
        ballYpx > H / 2 - goalHeightPx / 2 &&
        ballYpx < H / 2 + goalHeightPx / 2;
      if (inGoalBand) {
        if (ballXpx < 0) {
          useGameStore.getState().addGoal("red");
          resetPositions(bodies, W, H);
        } else if (ballXpx > W) {
          useGameStore.getState().addGoal("blue");
          resetPositions(bodies, W, H);
        }
      }

      // Draw
      ctx.clearRect(0, 0, W, H);
      drawPitch(ctx, W, H, goalHeightPx, goalDepthPx, pitchInsetPx);

      drawCircle(ctx, bodies.ball, ballRadiusPx, "white");
      // Local player: fill + clean indicator (dual ring + caret), thin outline (white when kicking)
      const ppos = bodies.player.getPosition();
      ctx.beginPath();
      ctx.arc(ppos.x * SCALE, ppos.y * SCALE, playerRadiusPx, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
      // No extra player indicator rings
      // Kick radius indicator (BALL EDGE threshold): playerR + extraReach
      const kickExtra = useGameStore.getState().config.kickExtraReachM ?? 0.5;
      const kickRadiusPx = playerRadiusPx + kickExtra * SCALE;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ppos.x * SCALE, ppos.y * SCALE, kickRadiusPx, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.stroke();
      ctx.restore();
  // No caret above the disk
      // Thin outline (white while space pressed)
      ctx.beginPath();
      ctx.arc(ppos.x * SCALE, ppos.y * SCALE, playerRadiusPx, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      const kicking = !!(
        useGameStore.getState().keys[" "] ||
        useGameStore.getState().keys["space"]
      );
      ctx.strokeStyle = kicking ? "#ffffff" : "#000000";
      ctx.stroke();

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldRef, bodiesRef, ctxRef]);
}
