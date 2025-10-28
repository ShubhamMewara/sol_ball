import planck from "planck-js";
import { SCALE } from "./constants";

export function createPlayer(world: planck.World, radiusPx: number) {
  const player = world.createDynamicBody({
    position: planck.Vec2(200 / SCALE, 260 / SCALE),
    linearDamping: 5,
    userData: { type: "player" },
  });
  player.createFixture(planck.Circle(radiusPx / SCALE), {
    density: 1,
    restitution: 0.3,
    friction: 0.2,
  });
  return player;
}
