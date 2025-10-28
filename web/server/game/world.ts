import { SCALE } from "./constants";
import planck from "planck-js";

export function createWorld() {
  return new planck.World(planck.Vec2(0, 0));
}

export function createWalls(
  world: planck.World,
  W: number,
  H: number,
  goalHeightPx: number
) {
  const w = W / SCALE;
  const h = H / SCALE;
  const WALL_THICKNESS_M = 0.5;

  const make = (x: number, y: number, width: number, height: number) => {
    const b = world.createBody();
    b.createFixture(planck.Box(width / 2, height / 2), {
      density: 0,
      restitution: 1,
    });
    b.setPosition(planck.Vec2(x, y));
  };

  // Top & Bottom
  make(w / 2, -WALL_THICKNESS_M / 2, w, WALL_THICKNESS_M);
  make(w / 2, h + WALL_THICKNESS_M / 2, w, WALL_THICKNESS_M);

  // Left & Right with goal gaps
  const gapH = goalHeightPx / SCALE; // meters
  const halfGap = gapH / 2;
  // Left above gap
  make(
    -WALL_THICKNESS_M / 2,
    (h / 2 - halfGap) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap
  );
  // Left below gap
  make(
    -WALL_THICKNESS_M / 2,
    (h + (h / 2 + halfGap)) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap
  );
  // Right above gap
  make(
    w + WALL_THICKNESS_M / 2,
    (h / 2 - halfGap) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap
  );
  // Right below gap
  make(
    w + WALL_THICKNESS_M / 2,
    (h + (h / 2 + halfGap)) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap
  );
}
