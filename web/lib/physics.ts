import { SCALE } from "@/server/game/constants";
import planck from "planck-js";

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
  goalDepthPx: number = 120,
  pitchInsetPx: number = 20,
) {
  // The pitch border is inset by pitchInsetPx on all sides. Anchor goals to that line.
  const touchLeftX = pitchInsetPx;
  const touchRightX = W - pitchInsetPx;
  const goalTop = H / 2 - goalHeightPx / 2;
  const goalBot = H / 2 + goalHeightPx / 2;
  const depth = Math.max(6, goalDepthPx); // desired pocket depth
  const postRadius = 5; // pink knobs

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 6;

  const drawPocket = (anchorX: number, side: "left" | "right") => {
    ctx.save();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 6;

    // Draw OUTSIDE the field but clamp depth so it stays inside the canvas.
    const sideCanvasSpace = side === "left" ? anchorX : W - anchorX; // distance to canvas edge
    const d = Math.min(depth, Math.max(4, sideCanvasSpace - 6));
    const midY = (goalTop + goalBot) / 2;
    const backX = side === "left" ? anchorX - d : anchorX + d;

    // Simple U-shape: straight to back wall, smooth curved return, straight to post
    ctx.beginPath();
    ctx.moveTo(anchorX, goalTop);
    ctx.lineTo(backX, goalTop);
    // Single quadratic curve for a clean outward bow
    const ctrlX = side === "left" ? backX - d * 0.6 : backX + d * 0.6;
    ctx.quadraticCurveTo(ctrlX, midY, backX, goalBot);
    ctx.lineTo(anchorX, goalBot);
    ctx.stroke();

    // Draw pink posts on the touchline at the goal mouth ends
    ctx.fillStyle = "#ffb6c1";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    for (const y of [goalTop, goalBot]) {
      ctx.beginPath();
      ctx.arc(anchorX, y, postRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  // Left goal
  drawPocket(touchLeftX, "left");
  // Right goal
  drawPocket(touchRightX, "right");
  ctx.restore();
}

export function drawPitch(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  goalHeightPx: number,
  goalDepthPx: number = 120,
  pitchInsetPx: number = 20,
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
  ctx.strokeRect(pitchInsetPx, pitchInsetPx, W - pitchInsetPx * 2, H - pitchInsetPx * 2);

  // Center line
  ctx.beginPath();
  ctx.moveTo(W / 2, pitchInsetPx);
  ctx.lineTo(W / 2, H - pitchInsetPx);
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
  drawGoals(ctx, W, H, goalHeightPx, goalDepthPx, pitchInsetPx);
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

export type Bodies = { player: planck.Body; ball: planck.Body };
