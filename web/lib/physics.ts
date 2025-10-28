import planck from "planck-js";

export const SCALE = 30; // pixels per meter
export const WALL_THICKNESS_M = 0.5; // meters

export function createWorld() {
  return new planck.World(planck.Vec2(0, 0)); // top-down, no gravity
}

export function createWalls(
  world: planck.World,
  W: number,
  H: number,
  goalHeightPx: number,
) {
  const w = W / SCALE;
  const h = H / SCALE;

  const make = (x: number, y: number, width: number, height: number) => {
    const b = world.createBody();
    b.createFixture(planck.Box(width / 2, height / 2), {
      density: 0,
      restitution: 1,
    });
    b.setPosition(planck.Vec2(x, y));
  };

  // Top & Bottom full-width
  make(w / 2, -WALL_THICKNESS_M / 2, w, WALL_THICKNESS_M);
  make(w / 2, h + WALL_THICKNESS_M / 2, w, WALL_THICKNESS_M);

  // Left & Right with goal gaps centered vertically
  const gapH = goalHeightPx / SCALE; // meters
  const halfGap = gapH / 2;

  // Left side: above gap
  make(
    -WALL_THICKNESS_M / 2,
    (h / 2 - halfGap) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap,
  );
  // Left side: below gap
  make(
    -WALL_THICKNESS_M / 2,
    (h + (h / 2 + halfGap)) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap,
  );

  // Right side: above gap
  make(
    w + WALL_THICKNESS_M / 2,
    (h / 2 - halfGap) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap,
  );
  // Right side: below gap
  make(
    w + WALL_THICKNESS_M / 2,
    (h + (h / 2 + halfGap)) / 2,
    WALL_THICKNESS_M,
    h / 2 - halfGap,
  );
}

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

export function createBall(world: planck.World, radiusPx: number) {
  const ball = world.createDynamicBody({
    position: planck.Vec2(450 / SCALE, 260 / SCALE),
    linearDamping: 0.6,
    userData: { type: "ball" },
  });
  ball.createFixture(planck.Circle(radiusPx / SCALE), {
    density: 0.5,
    restitution: 0.9,
    friction: 0.05,
  });
  return ball;
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  body: planck.Body,
  radiusPx: number,
  color: string,
) {
  const pos = body.getPosition();
  ctx.beginPath();
  ctx.arc(pos.x * SCALE, pos.y * SCALE, radiusPx, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawGoals(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  goalHeightPx: number,
) {
  // The pitch border is inset by 20px on all sides. Anchor goals to that line.
  const touchLeftX = 20;
  const touchRightX = W - 20;
  const goalTop = H / 2 - goalHeightPx / 2;
  const goalBot = H / 2 + goalHeightPx / 2;
  const outward = 10; // distance outside the touchline to draw bracket (inside canvas)
  const postRadius = 5; // pink knobs

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 6;

  const drawBracket = (anchorX: number, side: "left" | "right") => {
    // Ensure consistent stroke settings per bracket
    ctx.save();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 6;
    const dir = side === "left" ? -1 : 1; // outward from touchline
    // Position of bracket column (clamped to stay inside canvas)
    let cx = anchorX + dir * outward;
    cx = Math.max(6, Math.min(W - 6, cx));

    // Smooth brace path (two gentle curves)
    const pad = 10; // top/bottom padding for rounded ends
    const ctrlX = Math.max(8, Math.min(W - 8, anchorX + dir * 12));

    ctx.beginPath();
    ctx.moveTo(cx, goalTop + pad);
    ctx.quadraticCurveTo(ctrlX, (goalTop + H / 2) / 2, cx, H / 2);
    ctx.quadraticCurveTo(ctrlX, (goalBot + H / 2) / 2, cx, goalBot - pad);
    ctx.stroke();

    // Draw short connectors from touchline to bracket at three points
    ctx.beginPath();
    const y1 = goalTop + 8;
    const y2 = H / 2;
    const y3 = goalBot - 8;
    ctx.moveTo(anchorX, y1); ctx.lineTo(cx, y1);
    ctx.moveTo(anchorX, y2); ctx.lineTo(cx, y2);
    ctx.moveTo(anchorX, y3); ctx.lineTo(cx, y3);
    ctx.stroke();

    // Pink knobs at top/middle/bottom (on bracket column)
    ctx.fillStyle = "#ffb6c1";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    for (const y of [y1, y2, y3]) {
      ctx.beginPath();
      ctx.arc(cx, y, postRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  // Left goal
  drawBracket(touchLeftX, "left");
  // Right goal
  drawBracket(touchRightX, "right");
  ctx.restore();
}

export function drawPitch(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  goalHeightPx: number,
) {
  // Base
  ctx.fillStyle = "#5f8f57";
  ctx.fillRect(0, 0, W, H);

  // Stripes
  const stripeW = 80;
  for (let x = -W; x < W * 2; x += stripeW) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(-Math.PI / 9);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, -H, stripeW / 2, H * 3);
    ctx.restore();
  }

  // Touchline border
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // Center line
  ctx.beginPath();
  ctx.moveTo(W / 2, 20);
  ctx.lineTo(W / 2, H - 20);
  ctx.stroke();

  // Center circle and spot
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = "#fff";
  ctx.arc(W / 2, H / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  // Goals visual
  drawGoals(ctx, W, H, goalHeightPx);
}

export function resetPositions(
  bodies: { player: planck.Body; ball: planck.Body },
  W: number,
  H: number,
) {
  // Reset ball to center
  bodies.ball.setLinearVelocity(planck.Vec2(0, 0));
  bodies.ball.setAngularVelocity(0);
  bodies.ball.setPosition(planck.Vec2((W / 2) / SCALE, (H / 2) / SCALE));
  bodies.ball.setAwake(true);

  // Reset player to starting position
  bodies.player.setLinearVelocity(planck.Vec2(0, 0));
  bodies.player.setAngularVelocity(0);
  bodies.player.setPosition(planck.Vec2(200 / SCALE, 260 / SCALE));
  bodies.player.setAwake(true);
}

export function kick(
  player: planck.Body,
  ball: planck.Body,
  playerRadiusPx: number,
  ballRadiusPx: number,
) {
  const p = player.getPosition();
  const b = ball.getPosition();
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const dist = Math.hypot(dx, dy);
  const playerR = playerRadiusPx / SCALE;
  const ballR = ballRadiusPx / SCALE;
  if (dist < playerR + ballR + 0.15 && dist > 0) {
    const impulseMag = 0.5;
    ball.applyLinearImpulse(
      planck.Vec2((dx / dist) * impulseMag, (dy / dist) * impulseMag),
      ball.getWorldCenter(),
      true,
    );
  }
}

export type Bodies = { player: planck.Body; ball: planck.Body };
