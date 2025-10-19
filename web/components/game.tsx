"use client";

import planck from "planck-js";
import { useEffect, useRef } from "react";

export default function PlanckGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<planck.World | null>(null);
  const bodiesRef = useRef<{ player: planck.Body; ball: planck.Body } | null>(
    null
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 900;
    const H = 520;
    // planck uses meters — we use a simple scale
    const SCALE = 30; // pixels per meter

    const wallThickness = 0.5; // meters

    const playerRadiusPx = 18; // pixels
    const ballRadiusPx = 12; // pixels

    const moveSpeed = 4.5; // meters/sec

    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const Vec2 = planck.Vec2;
    const world = new planck.World(new Vec2(0, 0)); // no gravity (top-down)
    worldRef.current = world;

    // create walls (static)
    const wMeters = W / SCALE;
    const hMeters = H / SCALE;

    const createWall = (
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      const body = world.createBody();
      body.createFixture(planck.Box(width / 2, height / 2), {
        density: 0.0,
        restitution: 1.0,
      });
      body.setPosition(new Vec2(x, y));
    };

    // top/bottom/left/right
    createWall(wMeters / 2, -wallThickness / 2, wMeters, wallThickness);
    createWall(
      wMeters / 2,
      hMeters + wallThickness / 2,
      wMeters,
      wallThickness
    );
    createWall(-wallThickness / 2, hMeters / 2, wallThickness, hMeters);
    createWall(
      wMeters + wallThickness / 2,
      hMeters / 2,
      wallThickness,
      hMeters
    );

    // player (dynamic)
    const player = world.createDynamicBody({
      position: new Vec2(200 / SCALE, 260 / SCALE),
      linearDamping: 5.0,
      userData: { type: "player" },
    });
    player.createFixture(planck.Circle(playerRadiusPx / SCALE), {
      density: 1.0,
      restitution: 0.3,
      friction: 0.2,
    });

    // ball
    const ball = world.createDynamicBody({
      position: new Vec2(450 / SCALE, 260 / SCALE),
      linearDamping: 0.6,
      userData: { type: "ball" },
    });
    ball.createFixture(planck.Circle(ballRadiusPx / SCALE), {
      density: 0.5,
      restitution: 0.9,
      friction: 0.05,
    });

    bodiesRef.current = { player, ball };

    // input
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // kick logic (space)
    let spaceDown = false;
    const kick = () => {
      const pPos = player.getPosition();
      const bPos = ball.getPosition();
      const dx = bPos.x - pPos.x;
      const dy = bPos.y - pPos.y;
      const dist = Math.hypot(dx, dy);
      const playerR = playerRadiusPx / SCALE;
      const ballR = ballRadiusPx / SCALE;
      if (dist < playerR + ballR + 0.15) {
        const impulseMag = 0.5;
        if (dist === 0) return;
        const impulse = new Vec2(
          (dx / dist) * impulseMag,
          (dy / dist) * impulseMag
        );
        ball.applyLinearImpulse(impulse, ball.getWorldCenter(), true);
      }
    };

    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceDown) {
        spaceDown = true;
        kick();
      }
    };
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDown = false;
    };
    window.addEventListener("keydown", handleSpaceDown);
    window.addEventListener("keyup", handleSpaceUp);

    // loop
    const timeStep = 1 / 60;
    let last = performance.now();

    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;

      // movement via direct velocity (arcadey)
      
      let vx = 0;
      let vy = 0;
      if (keys["w"]) vy -= moveSpeed;
      if (keys["s"]) vy += moveSpeed;
      if (keys["a"]) vx -= moveSpeed;
      if (keys["d"]) vx += moveSpeed;

      player.setLinearVelocity(new Vec2(vx, vy));

      // step physics
      world.step(timeStep);

      // draw
      ctx.clearRect(0, 0, W, H);
      // background
      ctx.fillStyle = "#2e8b57";
      ctx.fillRect(0, 0, W, H);

      // draw body helper
      const drawCircle = (
        body: planck.Body,
        radiusPx: number,
        color: string
      ) => {
        const pos = body.getPosition();
        ctx.beginPath();
        ctx.arc(pos.x * SCALE, pos.y * SCALE, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      drawCircle(ball, ballRadiusPx, "white");
      drawCircle(player, playerRadiusPx, "red");

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleSpaceDown);
      window.removeEventListener("keyup", handleSpaceUp);
      worldRef.current = null;
      bodiesRef.current = null;
    };
  }, []);

  return (
    <div style={{ padding: 8 }}>
      <h2>WASD to move, Space to kick</h2>
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #333", background: "#4caf50" }}
      />
    </div>
  );
}
