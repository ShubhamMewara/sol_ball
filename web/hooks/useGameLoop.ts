"use client";

import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { drawCircle, drawPitch, resetPositions, SCALE } from "../lib/physics";
import planck from "planck-js";

export function useGameLoop(
  worldRef: React.RefObject<planck.World | null>,
  bodiesRef: React.RefObject<{ player: planck.Body; ball: planck.Body } | null>,
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>
) {
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

      // Goal detection (ball inside left/right opening and beyond boundary)
      const ballPos = bodies.ball.getPosition();
      const ballXpx = ballPos.x * SCALE;
      const ballYpx = ballPos.y * SCALE;
      const inGoalBand =
        ballYpx > H / 2 - goalHeightPx / 2 &&
        ballYpx < H / 2 + goalHeightPx / 2;
      if (inGoalBand) {
        if (ballXpx < 0) {
          // Goal on LEFT
          useGameStore.getState().addGoal("left");
          resetPositions(bodies, W, H);
        } else if (ballXpx > W) {
          // Goal on RIGHT
          useGameStore.getState().addGoal("right");
          resetPositions(bodies, W, H);
        }
      }

      // Draw
      ctx.clearRect(0, 0, W, H);
      drawPitch(ctx, W, H, goalHeightPx);

      drawCircle(ctx, bodies.ball, ballRadiusPx, "white");
      drawCircle(ctx, bodies.player, playerRadiusPx, "red");

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldRef, bodiesRef, ctxRef]);
}
