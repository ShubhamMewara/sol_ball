import planck from "planck-js";
import { SCALE } from "./constants";

export function createPlayer(world: planck.World, radiusPx: number) {
  const player = world.createDynamicBody({
    position: planck.Vec2(200 / SCALE, 260 / SCALE),
    // Lower damping so velocity decays more slowly (more momentum)
    linearDamping: 3,
    userData: { type: "player" },
  });
  player.createFixture(planck.Circle(radiusPx / SCALE), {
    density: 1,
    restitution: 0.3,
    friction: 0.2,
  });
  return player;
}
