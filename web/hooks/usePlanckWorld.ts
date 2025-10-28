"use client";

import { useEffect, useRef } from "react";
import planck from "planck-js";
import { createWorld, createWalls, createPlayer, createBall } from "../lib/physics";
import { useGameStore } from "../store/gameStore";

export function usePlanckWorld(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const worldRef = useRef<planck.World | null>(null);
  const bodiesRef = useRef<{ player: planck.Body; ball: planck.Body } | null>(
    null,
  );
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

  const { W, H, playerRadiusPx, ballRadiusPx, goalHeightPx } = useGameStore.getState().config;

    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const world = createWorld();
    worldRef.current = world;

  createWalls(world, W, H, goalHeightPx);
    const player = createPlayer(world, playerRadiusPx);
    const ball = createBall(world, ballRadiusPx);
    bodiesRef.current = { player, ball };

    return () => {
      worldRef.current = null;
      bodiesRef.current = null;
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef]);

  return { worldRef, bodiesRef, ctxRef } as const;
}
