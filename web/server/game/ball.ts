import planck from "planck-js";
import { SCALE } from "./constants";

export function createBall(world: planck.World, radiusPx: number) {
  const ball = world.createDynamicBody({
    position: planck.Vec2(450 / SCALE, 260 / SCALE),
    linearDamping: 0.9,
    userData: { type: "ball" },
  });
  ball.createFixture(planck.Circle(radiusPx / SCALE), {
    density: 0.5,
    restitution: 0.9,
    friction: 0.12,
  });
  return ball;
}
