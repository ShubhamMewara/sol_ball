import planck from "planck-js";
import { SCALE } from "./constants";

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
  const extraReachM = 0.5; // allow kicking from a bit farther than visual radius
  if (dist < playerR + ballR + extraReachM && dist > 0) {
    const impulseMag = 0.5;
    ball.applyLinearImpulse(
      planck.Vec2((dx / dist) * impulseMag, (dy / dist) * impulseMag),
      ball.getWorldCenter(),
      true
    );
  }
}
