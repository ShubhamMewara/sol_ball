"use client";

import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import planck from "planck-js";
import { kick } from "@/server/game/kick";

export function useInput(
  bodiesRef: React.RefObject<{ player: planck.Body; ball: planck.Body } | null>,
) {
  useEffect(() => {
    const setKey = useGameStore.getState().setKey;

    const onKeyDown = (e: KeyboardEvent) => {
      setKey(e.key, true);
      if (e.code === "Space") {
        const bodies = bodiesRef.current;
        if (!bodies) return;
        const { playerRadiusPx, ballRadiusPx } = useGameStore.getState().config;
        kick(bodies.player, bodies.ball, playerRadiusPx, ballRadiusPx);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      setKey(e.key, false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodiesRef]);
}
