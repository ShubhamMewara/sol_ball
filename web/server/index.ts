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
  private phase: "waiting" | "playing" | "ended" = "waiting";
  private hostConnId: string | null = null;
  private hostWallet?: string;
  private endAtMs: number | null = null;
  private matchDurationMin = 3;
  private teamByConn: Map<string, "red" | "blue"> = new Map();
  private maxPlayersPerTeam = 3;

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
    // Step physics only if game is playing
    if (this.phase === "playing") {
      this.world.step(CONFIG.timeStep);
      this.detectGoals();
      // Check timer
      if (this.endAtMs && Date.now() >= this.endAtMs) {
        this.phase = "ended";
        this.endAtMs = null;
      }
    }

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
    // If no host yet, tentatively set first connector as host (may be overridden by claim-host)
    if (!this.hostConnId) this.hostConnId = conn.id;

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
      if (msg.type === "join") {
        // Optionally receive team and teamSize
        const preferred: "red" | "blue" | undefined = msg.team;
        const teamSize = Number(msg.teamSize);
        if (Number.isFinite(teamSize) && teamSize > 0) {
          this.maxPlayersPerTeam = Math.floor(teamSize);
        }
        const assigned = this.assignTeam(sender.id, preferred);
        this.teamByConn.set(sender.id, assigned);
        // Place the player at a spawn
        this.placePlayerAtSpawn(sender.id);
        return;
      }
      if (msg.type === "claim-host") {
        // Allow a wallet to claim host if not set yet
        if (!this.hostWallet) {
          this.hostWallet = String(msg.wallet || "");
        }
      } else if (msg.type === "start") {
        // Only host can start
        const isHost =
          (this.hostWallet && msg.wallet && this.hostWallet === msg.wallet) ||
          (!this.hostWallet && this.hostConnId === sender.id);
        if (!isHost) return;
        // Prevent accidental restarts mid-game (e.g. reconnects)
        if (this.phase === "playing") return;
        const durationMin = Number(msg.durationMin) || this.matchDurationMin;
        this.matchDurationMin = durationMin;
        this.startMatch(durationMin);
      } else if (msg.type === "inputs") {
        const keys = msg.keys || {};
        const actor = this.players.get(sender.id);
        if (!actor) return;
        if (this.phase !== "playing") return; // ignore inputs until started
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
    // Players to team spawns
    for (const id of this.players.keys()) {
      this.placePlayerAtSpawn(id);
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

    const timeLeftMs = this.endAtMs
      ? Math.max(0, this.endAtMs - Date.now())
      : 0;
    const payload = {
      type: "snapshot",
      t: Date.now(),
      me: "", // filled on client if needed per-connection
      lastSeq: undefined,
      score: this.score,
      players,
      ball: { x: bp.x, y: bp.y, vx: bv.x, vy: bv.y },
      phase: this.phase,
      timeLeftMs,
      winner:
        this.phase === "ended"
          ? this.score.left === this.score.right
            ? "draw"
            : this.score.left > this.score.right
            ? "left"
            : "right"
          : undefined,
    };

    // Send to everyone, adding their own id in the message
    for (const c of this.room.getConnections()) {
      const enriched = { ...payload, me: c.id };
      c.send(JSON.stringify(enriched));
    }
  }

  private startMatch(durationMin: number) {
    // Reset scores and positions
    this.score = { left: 0, right: 0 };
    this.resetPositions();
    this.phase = "playing";
    this.endAtMs = Date.now() + Math.max(1, durationMin) * 60 * 1000;
  }

  private assignTeam(id: string, preferred?: "red" | "blue"): "red" | "blue" {
    const redCount = this.countTeam("red");
    const blueCount = this.countTeam("blue");
    // Respect capacity
    const redFull = redCount >= this.maxPlayersPerTeam;
    const blueFull = blueCount >= this.maxPlayersPerTeam;
    let team: "red" | "blue" = "red";
    if (
      preferred &&
      !((preferred === "red" && redFull) || (preferred === "blue" && blueFull))
    ) {
      team = preferred;
    } else if (redFull && !blueFull) {
      team = "blue";
    } else if (blueFull && !redFull) {
      team = "red";
    } else {
      team = redCount <= blueCount ? "red" : "blue";
    }
    return team;
  }

  private countTeam(team: "red" | "blue") {
    let n = 0;
    for (const [, t] of this.teamByConn) if (t === team) n++;
    return n;
  }

  private placePlayerAtSpawn(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    const team = this.teamByConn.get(id) || "red";
    const { W, H } = CONFIG;
    // Layout: grid of 2 rows x N columns on each side
    const idx = this.indexWithinTeam(id, team);
    const cols = Math.max(1, Math.ceil(this.maxPlayersPerTeam / 2));
    const row = Math.floor(idx / cols); // 0 or 1
    const col = idx % cols;
    const marginX = 80;
    const spacingX = 40;
    const baseX = team === "red" ? marginX : W - marginX;
    const x = team === "red" ? baseX + col * spacingX : baseX - col * spacingX;
    const y = H / 2 + (row === 0 ? -60 : 60);
    p.setLinearVelocity(planck.Vec2(0, 0));
    p.setAngularVelocity(0);
    p.setPosition(planck.Vec2(x / SCALE, y / SCALE));
    p.setAwake(true);
  }

  private indexWithinTeam(id: string, team: "red" | "blue") {
    const ids = Array.from(this.players.keys()).filter(
      (k) => this.teamByConn.get(k) === team
    );
    ids.sort(); // stable-ish ordering
    return Math.max(0, ids.indexOf(id));
  }
}
