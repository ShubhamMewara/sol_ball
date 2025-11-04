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
  private lastTickMs = Date.now();
  private physicsAccumMs = 0;
  private broadcastAccumMs = 0; // throttle broadcast to ~30 Hz
  private phase: "waiting" | "playing" | "celebrating" | "ended" = "waiting";
  private hostConnId: string | null = null;
  private hostWallet?: string;
  private endAtMs: number | null = null;
  private matchDurationMin = 3;
  private pendingStart: { durationMin: number } | null = null;
  private teamByConn: Map<string, "red" | "blue"> = new Map();
  private maxPlayersPerTeam = 3;
  private spectators: Set<string> = new Set();
  private startWebhookSent = false;
  private endWebhookSent = false;
  private celebrationEndAtMs: number | null = null;
  private lastGoalSide: "left" | "right" | null = null;

  constructor(public room: Party.Room) {
    // Initialize world
    this.world = createWorld();
    createWalls(
      this.world,
      CONFIG.W,
      CONFIG.H,
      CONFIG.goalHeightPx,
      CONFIG.goalDepthPx
    );
    this.ball = createBall(this.world, CONFIG.ballRadiusPx);
    // Drive simulation off inbound inputs; no server-side interval required
  }

  async onStart() {
    // No-op; we advance simulation on incoming inputs
  }

  private stepAndMaybeBroadcast(deltaMs: number) {
    // Clamp to avoid spiral of death on stalls
    if (deltaMs > 100) deltaMs = 100;
    const now = Date.now();

    if (this.phase === "playing") {
      // Fixed-step physics at CONFIG.timeStep using an accumulator
      this.physicsAccumMs += deltaMs;
      const stepMs = CONFIG.timeStep * 1000; // fixed physics step duration in ms
      while (this.physicsAccumMs >= stepMs) {
        this.world.step(CONFIG.timeStep);
        // Make ball follow the pushing player's movement like real football
        this.applyDribbleInteraction();
        this.enforceBallTouchlineWalls();
        this.physicsAccumMs -= stepMs;
      }
      this.detectGoals();
      // Match timer
      if (this.endAtMs && now >= this.endAtMs) {
        this.phase = "ended";
        this.endAtMs = null;
        // Fire settle webhook once
        if (!this.endWebhookSent) {
          this.endWebhookSent = true;
          const winner =
            this.score.left === this.score.right
              ? null
              : this.score.left > this.score.right
              ? "left"
              : "right";
          const map: any = { left: "red", right: "blue" };
          const winnerTeam = winner ? map[winner] : null;
          const base =
            process?.env?.MATCH_WEBHOOK_BASE_URL ||
            "https://solball.vercel.app";
          if (base && winnerTeam) {
            fetch(`${base.replace(/\/$/, "")}/api/match/settle`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                roomId: this.room.id,
                winner: winnerTeam,
              }),
            }).catch(() => {});
          }
        }
      }
    } else if (this.phase === "celebrating") {
      // Hold physics during celebration, then reset and resume play
      if (this.celebrationEndAtMs && now >= this.celebrationEndAtMs) {
        this.resetPositions();
        this.phase = "playing";
        this.celebrationEndAtMs = null;
        this.lastGoalSide = null;
        // Kick off an immediate broadcast to reflect reset
        this.broadcastAccumMs = 0;
        this.broadcastSnapshot();
      } else {
        this.physicsAccumMs = 0; // frozen
      }
    } else {
      // Not playing; don't let accumulator grow unbounded
      this.physicsAccumMs = 0;
    }

    // Broadcast snapshots at ~30 Hz
    this.broadcastAccumMs += deltaMs;
    if (this.broadcastAccumMs >= 33) {
      this.broadcastSnapshot();
      this.broadcastAccumMs = 0;
    }
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
        // If previously marked spectator, unmark
        this.spectators.delete(sender.id);
        const assigned = this.assignTeam(sender.id, preferred);
        this.teamByConn.set(sender.id, assigned);
        // Ensure a player body exists
        if (!this.players.has(sender.id)) {
          const body = createPlayer(this.world, CONFIG.playerRadiusPx);
          this.players.set(sender.id, body);
        }
        // Place the player at a spawn
        this.placePlayerAtSpawn(sender.id);
        // If a start was requested earlier but teams weren't ready, try starting now
        if (
          this.pendingStart &&
          this.phase === "waiting" &&
          this.countTeam("red") >= 1 &&
          this.countTeam("blue") >= 1
        ) {
          this.startMatch(this.pendingStart.durationMin);
          this.pendingStart = null;
        }
        return;
      }
      if (msg.type === "spectate") {
        // Convert this connection to spectator: remove any player body and team mapping
        const b = this.players.get(sender.id);
        if (b) {
          this.world.destroyBody(b);
          this.players.delete(sender.id);
        }
        this.teamByConn.delete(sender.id);
        this.spectators.add(sender.id);
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
        if (this.phase !== "waiting") return; // only start from waiting
        const durationMin = Number(msg.durationMin) || this.matchDurationMin;
        this.matchDurationMin = durationMin;
        // If teams are ready, start now; otherwise remember to start when ready
        if (this.countTeam("red") >= 1 && this.countTeam("blue") >= 1) {
          this.startMatch(durationMin);
          this.pendingStart = null;
        } else {
          this.pendingStart = { durationMin };
        }
      } else if (msg.type === "inputs") {
        const keys = msg.keys || {};
        const actor = this.players.get(sender.id);
        // Only apply movement/kick while playing; still advance timers/broadcast below
        if (this.phase === "playing" && actor) {
          // Compute desired direction from keys
          let dx = 0;
          let dy = 0;
          if (keys.w) dy -= 1;
          if (keys.s) dy += 1;
          if (keys.a) dx -= 1;
          if (keys.d) dx += 1;
          // Normalize direction
          let len = Math.hypot(dx, dy);
          if (len > 0) {
            dx /= len;
            dy /= len;
          }
          const cur = actor.getLinearVelocity();
          const maxSpeed = CONFIG.moveSpeed; // m/s
          // Desired velocity points toward input direction; if no input, keep current
          const desiredVx = len > 0 ? dx * maxSpeed : cur.x;
          const desiredVy = len > 0 ? dy * maxSpeed : cur.y;
          // Apply acceleration limit for momentum feel
          const accel = (CONFIG as any).playerAccelMps2 ?? 25; // m/s^2
          const dt = CONFIG.timeStep; // approximate per-step
          const maxDelta = accel * dt; // m/s change per input tick
          const dvx = desiredVx - cur.x;
          const dvy = desiredVy - cur.y;
          const dlen = Math.hypot(dvx, dvy);
          let nextVx = cur.x;
          let nextVy = cur.y;
          if (dlen > 0) {
            const scale = Math.min(1, maxDelta / dlen);
            nextVx = cur.x + dvx * scale;
            nextVy = cur.y + dvy * scale;
          }
          actor.setLinearVelocity(planck.Vec2(nextVx, nextVy));

          if (msg.actions?.kick) {
            kick(actor, this.ball, CONFIG.playerRadiusPx, CONFIG.ballRadiusPx);
          }
        }

        // Advance simulation based on elapsed time since last tick (always)
        const now = Date.now();
        let deltaMs = now - this.lastTickMs;
        if (deltaMs < 0) deltaMs = 0;
        this.lastTickMs = now;
        this.stepAndMaybeBroadcast(deltaMs);
      }
    } catch {
      // ignore malformed messages
    }
  }

  onClose(conn: any, _ctx?: any) {
    const b = this.players.get(conn.id);
    if (b) this.world.destroyBody(b);
    this.players.delete(conn.id);
    this.teamByConn.delete(conn.id);
    this.spectators.delete(conn.id);
    if (!this.hostWallet && this.hostConnId === conn.id) {
      // reassign hostConnId to another active connection if any
      let nextId: string | null = null;
      for (const c of this.room.getConnections()) {
        if (c.id !== conn.id) {
          nextId = c.id;
          break;
        }
      }
      this.hostConnId = nextId;
    }
    // If no players remain, DO NOT reset the match state. Keep score/time/phase.
    // Clients may briefly reconnect; resetting here causes unwanted resets mid-match.
    // Optionally, we could pause physics until a player returns, but onAlarm already
    // steps only while phase === "playing". So it's safe to leave state as-is.
  }

  detectGoals() {
    const { W, H, goalHeightPx } = CONFIG;
    const pos = this.ball.getPosition();
    const xpx = pos.x * SCALE;
    const ypx = pos.y * SCALE;
    const inBand =
      ypx > H / 2 - goalHeightPx / 2 && ypx < H / 2 + goalHeightPx / 2;
    if (!inBand) return;
    // Small safety margin to avoid floating point flicker
    const margin = 1;
    if (xpx < -margin) {
      this.score.left += 1;
      this.lastGoalSide = "left";
      this.startCelebration();
    } else if (xpx > W + margin) {
      this.score.right += 1;
      this.lastGoalSide = "right";
      this.startCelebration();
    }
  }

  private startCelebration() {
    // Enter a short celebration phase before resetting positions
    this.phase = "celebrating";
    const CELEB_MS = 3000; // increased celebration time
    this.celebrationEndAtMs = Date.now() + CELEB_MS;
  }

  // Prevent the ball from crossing the white touchline rectangle while allowing it
  // to pass through the left/right goal openings (goalHeightPx band). Players are
  // unaffected. We do this post-step by clamping position and reflecting velocity.
  private enforceBallTouchlineWalls() {
    const { W, H, goalHeightPx, pitchInsetPx } = CONFIG as any;
    const top = pitchInsetPx;
    const bottom = H - pitchInsetPx;
    const left = pitchInsetPx;
    const right = W - pitchInsetPx;

    const p = this.ball.getPosition();
    const v = this.ball.getLinearVelocity();
    let x = p.x * SCALE;
    let y = p.y * SCALE;
    let vx = v.x;
    let vy = v.y;
    const inGoalBand =
      y > H / 2 - goalHeightPx / 2 && y < H / 2 + goalHeightPx / 2;

    const bounceK = 0.9; // little energy loss

    // Left wall (block unless within goal band)
    if (x < left && !inGoalBand) {
      x = left;
      vx = Math.abs(vx) * bounceK;
    }
    // Right wall
    if (x > right && !inGoalBand) {
      x = right;
      vx = -Math.abs(vx) * bounceK;
    }
    // Top and bottom always block
    if (y < top) {
      y = top;
      vy = Math.abs(vy) * bounceK;
    }
    if (y > bottom) {
      y = bottom;
      vy = -Math.abs(vy) * bounceK;
    }

    // Write back if changed
    this.ball.setPosition(planck.Vec2(x / SCALE, y / SCALE));
    this.ball.setLinearVelocity(planck.Vec2(vx, vy));
  }

  // If a player is physically touching the ball, make the ball inherit
  // a good portion of that player's current velocity and gently separate
  // them. This mimics a football dribble instead of a constant "kick".
  private applyDribbleInteraction() {
    const playerR = CONFIG.playerRadiusPx / SCALE;
    const ballR = CONFIG.ballRadiusPx / SCALE;
    const sumR = playerR + ballR;
    const SEP = 0.01; // meters separation target
    const mix = 0.35; // amount to approach player's normal speed (not full match)
    const tangentDamp = 0.98; // slight damp to avoid sticky feel

    const bp = this.ball.getPosition();
    const bv = this.ball.getLinearVelocity();
    let vx = bv.x;
    let vy = bv.y;
    let touched = false;

    for (const [, body] of this.players) {
      const pp = body.getPosition();
      const dx = bp.x - pp.x;
      const dy = bp.y - pp.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= sumR + 0.01) {
        touched = true;
        const nx = dist > 0 ? dx / dist : 1;
        const ny = dist > 0 ? dy / dist : 0;
        // Separate slightly so shapes don't interpenetrate
        const target = sumR + SEP;
        if (dist < target) {
          this.ball.setPosition(
            planck.Vec2(pp.x + nx * target, pp.y + ny * target)
          );
        }
        // Adjust velocity along the contact normal only (like pushing the ball)
        const pv = body.getLinearVelocity();
        const vbN = vx * nx + vy * ny; // ball normal speed
        const vpN = pv.x * nx + pv.y * ny; // player normal speed
        if (vpN > vbN) {
          const vbT_x = vx - vbN * nx; // tangential component
          const vbT_y = vy - vbN * ny;
          const vbN_new = vbN + (vpN - vbN) * mix;
          vx = vbT_x * tangentDamp + vbN_new * nx;
          vy = vbT_y * tangentDamp + vbN_new * ny;
        }
      }
    }

    if (touched) this.ball.setLinearVelocity(planck.Vec2(vx, vy));
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
      { x: number; y: number; vx: number; vy: number; team?: "red" | "blue" }
    > = {};
    for (const [id, body] of this.players) {
      const p = body.getPosition();
      const v = body.getLinearVelocity();
      const team = this.teamByConn.get(id);
      players[id] = { x: p.x, y: p.y, vx: v.x, vy: v.y, team };
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
      goalCelebrationMsLeft:
        this.phase === "celebrating" && this.celebrationEndAtMs
          ? Math.max(0, this.celebrationEndAtMs - Date.now())
          : 0,
      lastGoalSide: this.lastGoalSide ?? undefined,
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
    // Reset timers/accumulators and send an immediate snapshot
    this.lastTickMs = Date.now();
    this.physicsAccumMs = 0;
    this.broadcastAccumMs = 0;
    this.broadcastSnapshot();
    this.endWebhookSent = false;

    // Fire start webhook once per match
    if (!this.startWebhookSent) {
      this.startWebhookSent = true;
      const base =
        process?.env?.MATCH_WEBHOOK_BASE_URL || "https://solball.vercel.app";
      if (base) {
        fetch(`${base.replace(/\/$/, "")}/api/match/start`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roomId: this.room.id }),
        }).catch(() => {});
      }
    }
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

export { Server as GameRoom };
