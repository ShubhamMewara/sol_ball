import type * as Party from "partykit/server";
import planck from "planck-js";
import { createBall } from "./game/ball";
import { CONFIG, SCALE } from "./game/constants";
import { createPlayer } from "./game/players";
import { createWalls, createWorld } from "./game/world";
import { kick } from "./game/kick";

export default class Server {
  world: planck.World;
  players: Map<string, planck.Body> = new Map();
  ball: planck.Body;
  score = { left: 0, right: 0 };
  private readonly tickIntervalMs = 16; // ~60 Hz
  private broadcastAccumulator = 0;

  constructor(public room: Party.Room) {
    // Initialize world
    this.world = createWorld();
    createWalls(this.world, CONFIG.W, CONFIG.H, CONFIG.goalHeightPx);
    this.ball = createBall(this.world, CONFIG.ballRadiusPx);

    // Ensure the tick loop starts even if onStart isn't invoked by the platform version
    // (safe to call multiple times; later calls will just reschedule)
    this.room.storage
      .setAlarm(Date.now() + this.tickIntervalMs)
      .catch(() => {});
  }

  async onStart() {
    // Schedule the first alarm tick
    await this.room.storage.setAlarm(Date.now() + this.tickIntervalMs);
  }

  async onAlarm() {
    // Step physics and detect goals
    this.world.step(CONFIG.timeStep);
    this.detectGoals();

    // Throttle snapshot broadcasting to ~30 Hz
    this.broadcastAccumulator += this.tickIntervalMs;
    if (this.broadcastAccumulator >= 33) {
      this.broadcastSnapshot();
      this.broadcastAccumulator = 0;
    }

    // Schedule next tick
    await this.room.storage.setAlarm(Date.now() + this.tickIntervalMs);
  }

  onConnect(conn: any, _ctx?: any) {
    const body = createPlayer(this.world, CONFIG.playerRadiusPx);
    this.players.set(conn.id, body);

    // Welcome message
    conn.send(
      JSON.stringify({
        type: "welcome",
        id: conn.id,
        room: this.room.id,
        config: CONFIG,
      })
    );
  }

  onMessage(message: string, sender: any) {
    try {
      const msg = JSON.parse(message);
      if (msg.type === "inputs") {
        const keys = msg.keys || {};
        const actor = this.players.get(sender.id);
        if (!actor) return;
        let vx = 0;
        let vy = 0;
        if (keys.w) vy -= CONFIG.moveSpeed;
        if (keys.s) vy += CONFIG.moveSpeed;
        if (keys.a) vx -= CONFIG.moveSpeed;
        if (keys.d) vx += CONFIG.moveSpeed;
        actor.setLinearVelocity(planck.Vec2(vx, vy));

        if (msg.actions?.kick) {
          kick(actor, this.ball, CONFIG.playerRadiusPx, CONFIG.ballRadiusPx);
        }
      }
    } catch {
      // ignore malformed messages
    }
  }

  onClose(conn: any, _ctx?: any) {
    const b = this.players.get(conn.id);
    if (b) this.world.destroyBody(b);
    this.players.delete(conn.id);
  }

  detectGoals() {
    const { W, H, goalHeightPx } = CONFIG;
    const pos = this.ball.getPosition();
    const xpx = pos.x * SCALE;
    const ypx = pos.y * SCALE;
    const inBand =
      ypx > H / 2 - goalHeightPx / 2 && ypx < H / 2 + goalHeightPx / 2;
    if (inBand) {
      if (xpx < 0) {
        this.score.left += 1;
        this.resetPositions();
      } else if (xpx > W) {
        this.score.right += 1;
        this.resetPositions();
      }
    }
  }

  resetPositions() {
    const { W, H } = CONFIG;
    // Ball to center
    this.ball.setLinearVelocity(planck.Vec2(0, 0));
    this.ball.setAngularVelocity(0);
    this.ball.setPosition(planck.Vec2(W / 2 / SCALE, H / 2 / SCALE));
    this.ball.setAwake(true);
    // Players to spawn (spread slightly by index)
    let i = 0;
    for (const [, p] of this.players) {
      p.setLinearVelocity(planck.Vec2(0, 0));
      p.setAngularVelocity(0);
      p.setPosition(planck.Vec2((200 + i * 24) / SCALE, 260 / SCALE));
      p.setAwake(true);
      i++;
    }
  }

  broadcastSnapshot() {
    const players: Record<
      string,
      { x: number; y: number; vx: number; vy: number }
    > = {};
    for (const [id, body] of this.players) {
      const p = body.getPosition();
      const v = body.getLinearVelocity();
      players[id] = { x: p.x, y: p.y, vx: v.x, vy: v.y };
    }
    const bp = this.ball.getPosition();
    const bv = this.ball.getLinearVelocity();

    const payload = {
      type: "snapshot",
      t: Date.now(),
      me: "", // filled on client if needed per-connection
      lastSeq: undefined,
      score: this.score,
      players,
      ball: { x: bp.x, y: bp.y, vx: bv.x, vy: bv.y },
    };

    // Send to everyone, adding their own id in the message
    for (const c of this.room.getConnections()) {
      const enriched = { ...payload, me: c.id };
      c.send(JSON.stringify(enriched));
    }
  }
}
