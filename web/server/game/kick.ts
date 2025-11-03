import planck from "planck-js";
import { SCALE, CONFIG } from "./constants";

export function kick(
  player: planck.Body,
  ball: planck.Body,
  playerRadiusPx: number,
  ballRadiusPx: number
) {
  const p = player.getPosition();
  const b = ball.getPosition();
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const dist = Math.hypot(dx, dy);
  const playerR = playerRadiusPx / SCALE;
  const ballR = ballRadiusPx / SCALE;
  const extraReachM = CONFIG.kickExtraReachM ?? 0.5; // keep server & client in sync
  // Kick when the BALL EDGE crosses a ring of radius (playerR + extraReachM)
  // around the player center -> dist - ballR <= playerR + extraReachM
  if (dist - ballR <= playerR + extraReachM && dist > 0) {
    const impulseMag = 0.5;
    ball.applyLinearImpulse(
      planck.Vec2((dx / dist) * impulseMag, (dy / dist) * impulseMag),
      ball.getWorldCenter(),
      true
    );
  }
}
