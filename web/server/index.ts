import planck from "planck-js";
import { createBall } from "./game/ball";
import { CONFIG, SCALE } from "./game/constants";
import { createPlayer } from "./game/players";
import { createWalls, createWorld } from "./game/world";
import { kick } from "./game/kick";
import type { Connection, ConnectionContext } from "partyserver";
import { routePartykitRequest, Server } from "partyserver";
import {
  ClientClaimHostSchema,
  ClientInputsSchema,
  ClientJoinSchema,
  ClientSpectateSchema,
  ClientStartSchema,
} from "../lib/schemas";
// Timings and phases
const MAX_TICK_MS = 100;
const BROADCAST_INTERVAL_MS = 33; // ~30Hz
const CELEBRATION_MS = 3000;
type Phase = "waiting" | "playing" | "celebrating" | "ended";

export class Globe extends Server {
  // Let's use hibernation mode so we can scale to thousands of connections
  static options = { hibernate: true };

  // Maintain our own set of live connections and an optional room id
  private conns: Set<Connection> = new Set();
  private roomId?: string;

  world: planck.World;
  players: Map<string, planck.Body> = new Map();
  ball: planck.Body;
  score = { red: 0, blue: 0 };
  private lastTickMs = Date.now();
  private physicsMs = 0;
  private broadcastMs = 0;
  private phase: Phase = "waiting";
  private hostConnId: string | null = null;
  private hostWallet?: string;
  private endAtMs: number | null = null;
  private matchDurationMin = 3;
  private pendingStart: { durationMin: number } | null = null;
  // Persist team by stable player identity
  private teamByPlayer: Map<string, "red" | "blue"> = new Map();
  private connToPlayer: Map<string, string> = new Map();
  private maxPlayersPerTeam = 3;
  private spectators: Set<string> = new Set();
  private startWebhookSent = false;
  private endWebhookSent = false;
  private celebrationEndAtMs: number | null = null;
  private lastGoalTeam: "red" | "blue" | null = null;
  private startRequested = false;

  constructor(state: any, env: any) {
    super(state, env);
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
    if (deltaMs > MAX_TICK_MS) deltaMs = MAX_TICK_MS;
    const now = Date.now();

    if (this.phase === "playing") {
      // Fixed-step physics at CONFIG.timeStep using an accumulator
      this.physicsMs += deltaMs;
      const stepMs = CONFIG.timeStep * 1000; // fixed physics step duration in ms
      while (this.physicsMs >= stepMs) {
        this.world.step(CONFIG.timeStep);
        // Make ball follow the pushing player's movement like real football
        this.applyDribbleInteraction();
        this.enforceBallTouchlineWalls();
        this.physicsMs -= stepMs;
      }
      this.detectGoals();
      // Match timer
      if (this.endAtMs && now >= this.endAtMs) {
        this.phase = "ended";
        this.endAtMs = null;
        // Fire settle webhook once
        if (!this.endWebhookSent) {
          this.endWebhookSent = true;
          const winnerTeam =
            this.score.red === this.score.blue
              ? null
              : this.score.red > this.score.blue
              ? "red"
              : "blue";
          const base =
            process?.env?.MATCH_WEBHOOK_BASE_URL ||
            "https://solball.vercel.app";
          if (base && winnerTeam) {
            fetch(`${base.replace(/\/$/, "")}/api/match/settle`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                roomId: this.roomId || "",
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
        this.lastGoalTeam = null;

        // Kick off an immediate broadcast to reflect reset
        this.broadcastMs = 0;
        this.broadcastSnapshot();
      } else {
        this.physicsMs = 0; // frozen
      }
    } else {
      // Not playing; don't let accumulator grow unbounded
      this.physicsMs = 0;
    }

    // Broadcast snapshots at ~30 Hz
    this.broadcastMs += deltaMs;
    if (this.broadcastMs >= BROADCAST_INTERVAL_MS) {
      this.broadcastSnapshot();
      this.broadcastMs = 0;
    }
  }

  onConnect(conn: Connection, _ctx?: ConnectionContext) {
    this.conns.add(conn);
    const body = createPlayer(this.world, CONFIG.playerRadiusPx);
    this.players.set(conn.id, body);
    // If no host yet, tentatively set first connector as host (may be overridden by claim-host)
    if (!this.hostConnId) this.hostConnId = conn.id;

    // Welcome message
    conn.send(
      JSON.stringify({
        type: "welcome",
        id: conn.id,
        room: this.roomId || "",
        config: CONFIG,
      })
    );
  }

  onMessage(conn: Connection, message: any) {
    try {
      const raw = JSON.parse(String(message));
      if (raw?.type === "join") {
        const parsed = ClientJoinSchema.safeParse(raw);
        if (!parsed.success) return;
        const msg = parsed.data;
        // Optionally receive team and teamSize
        const preferred: "red" | "blue" | undefined = msg.team;
        const teamSize = Number(msg.teamSize);
        if (Number.isFinite(teamSize) && teamSize > 0) {
          this.maxPlayersPerTeam = Math.floor(teamSize);
        }
        // If previously marked spectator, unmark
        this.spectators.delete(conn.id);
        // Stable player identity for team persistence (wallet/user id recommended)
        const playerKey: string = String(
          msg.playerKey || msg.wallet || conn.id
        );
        const prevKey = this.connToPlayer.get(conn.id);
        // If same player reconnects, drop old connection/body
        for (const [cid, pk] of this.connToPlayer.entries()) {
          if (pk === playerKey && cid !== conn.id) {
            const old = this.players.get(cid);
            if (old) this.world.destroyBody(old);
            this.players.delete(cid);
            this.connToPlayer.delete(cid);
            break;
          }
        }
        // If this connection previously used a different key (e.g., before wallet loaded), carry over its team
        if (prevKey && prevKey !== playerKey) {
          const prevTeam = this.teamByPlayer.get(prevKey);
          if (prevTeam && !this.teamByPlayer.has(playerKey)) {
            this.teamByPlayer.set(playerKey, prevTeam);
          }
          this.teamByPlayer.delete(prevKey);
        }
        // Assign or reuse team by playerKey
        let assigned = this.teamByPlayer.get(playerKey);
        if (!assigned) {
          assigned = this.assignTeam(playerKey, preferred);
          this.teamByPlayer.set(playerKey, assigned);
        }
        this.connToPlayer.set(conn.id, playerKey);
        // Ensure a player body exists
        if (!this.players.has(conn.id)) {
          const body = createPlayer(this.world, CONFIG.playerRadiusPx);
          this.players.set(conn.id, body);
        }
        // Place the player at a spawn
        this.placePlayerAtSpawn(conn.id);
        // Try starting if a request exists
        this.maybeStart();
        return;
      }
      if (raw?.type === "spectate") {
        const ok = ClientSpectateSchema.safeParse(raw);
        if (!ok.success) return;
        // Convert this connection to spectator: remove any player body and team mapping
        const b = this.players.get(conn.id);
        if (b) {
          this.world.destroyBody(b);
          this.players.delete(conn.id);
        }
        this.connToPlayer.delete(conn.id);
        this.spectators.add(conn.id);
        return;
      }
      if (raw?.type === "claim-host") {
        const parsed = ClientClaimHostSchema.safeParse(raw);
        if (!parsed.success) return;
        const msg = parsed.data;
        // Allow a wallet to claim host if not set yet
        if (!this.hostWallet) {
          this.hostWallet = String(msg.wallet || "");
        }
      } else if (raw?.type === "start") {
        const parsed = ClientStartSchema.safeParse(raw);
        if (!parsed.success) return;
        const msg = parsed.data;
        // Only host can start
        const isHost =
          (this.hostWallet && msg.wallet && this.hostWallet === msg.wallet) ||
          (!this.hostWallet && this.hostConnId === conn.id);
        if (!isHost) return;
        this.requestStart(Number(msg.durationMin) || this.matchDurationMin);
      } else if (raw?.type === "inputs") {
        const parsed = ClientInputsSchema.safeParse(raw);
        if (!parsed.success) return;
        const msg = parsed.data;
        const keys = msg.keys || {};
        const actor = this.players.get(conn.id);
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
  // Centralized start request and execution logic to avoid duplicate starts
  private requestStart(durationMin: number) {
    if (this.phase !== "waiting") return; // already started or ended
    // If already requested, just update duration (optional) and try again
    this.matchDurationMin = durationMin;
    this.pendingStart = { durationMin };
    this.startRequested = true;
    this.maybeStart();
  }

  private maybeStart() {
    if (this.phase !== "waiting") return;
    if (!this.pendingStart) return;
    // Require at least one player body to exist
    if (this.players.size < 1) return;
    const dur = this.pendingStart.durationMin || this.matchDurationMin;
    this.pendingStart = null;
    this.startRequested = false;
    this.startMatch(dur);
  }

  onClose(conn: Connection, _ctx?: any) {
    const b = this.players.get(conn.id);
    if (b) this.world.destroyBody(b);
    this.players.delete(conn.id);
    this.connToPlayer.delete(conn.id);
    this.spectators.delete(conn.id);
    if (!this.hostWallet && this.hostConnId === conn.id) {
      // reassign hostConnId to another active connection if any
      let nextId: string | null = null;
      for (const c of this.conns) {
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
    const { W, H, goalHeightPx, pitchInsetPx } = CONFIG as any;
    const pos = this.ball.getPosition();
    const xpx = pos.x * SCALE;
    const ypx = pos.y * SCALE;
    const inBand =
      ypx > H / 2 - goalHeightPx / 2 && ypx < H / 2 + goalHeightPx / 2;
    if (!inBand) return;
    // Count a goal only when the ENTIRE ball crosses the white goal line
    // i.e., center +/- radius is beyond the line plane.
    const r = CONFIG.ballRadiusPx as number;
    const leftLine = pitchInsetPx as number; // x-position of left white line
    const rightLine = W - (pitchInsetPx as number); // x-position of right white line
    const eps = 0.5; // small tolerance in pixels
    if (xpx + r <= leftLine - eps) {
      this.score.red += 1; // ball fully crossed into LEFT goal, red scores
      this.lastGoalTeam = "red";
      this.startCelebration();
    } else if (xpx - r >= rightLine + eps) {
      this.score.blue += 1; // ball fully crossed into RIGHT goal, blue scores
      this.lastGoalTeam = "blue";
      this.startCelebration();
    }
  }

  private startCelebration() {
    // Enter a short celebration phase before resetting positions
    this.phase = "celebrating";
    this.celebrationEndAtMs = Date.now() + CELEBRATION_MS;
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
      {
        x: number;
        y: number;
        vx: number;
        vy: number;
        team?: "red" | "blue";
        key?: string;
        num?: number;
      }
    > = {};
    for (const [id, body] of this.players) {
      const p = body.getPosition();
      const v = body.getLinearVelocity();
      const pk = this.connToPlayer.get(id);
      const team = pk ? this.teamByPlayer.get(pk) : undefined;
      // Stable jersey number from player key (1-9)
      let num: number | undefined = undefined;
      if (pk) {
        let sum = 0;
        for (let i = 0; i < pk.length; i++) sum += pk.charCodeAt(i);
        num = (Math.abs(sum) % 9) + 1;
      }
      players[id] = { x: p.x, y: p.y, vx: v.x, vy: v.y, team, key: pk, num };
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
      lastGoalTeam: this.lastGoalTeam ?? undefined,
      lastGoalSide: this.lastGoalTeam ?? undefined,
      winner:
        this.phase === "ended"
          ? this.score.red === this.score.blue
            ? "draw"
            : this.score.red > this.score.blue
            ? "red"
            : "blue"
          : undefined,
    };

    // Send to everyone, adding their own id in the message
    for (const c of this.conns) {
      const enriched = { ...payload, me: c.id };
      c.send(JSON.stringify(enriched));
    }
  }

  private startMatch(durationMin: number) {
    // Reset scores and positions
    this.score = { red: 0, blue: 0 };
    this.resetPositions();
    this.phase = "playing";
    this.endAtMs = Date.now() + Math.max(1, durationMin) * 60 * 1000;
    // Reset timers/accumulators and send an immediate snapshot
    this.lastTickMs = Date.now();
    this.physicsMs = 0;
    this.broadcastMs = 0;
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
          body: JSON.stringify({ roomId: this.roomId || "" }),
        }).catch(() => {});
      }
    }
  }

  private assignTeam(id: string, preferred?: "red" | "blue"): "red" | "blue" {
    // IMPORTANT: Check if this player already has a team assigned - never re-assign during a match
    const existingTeam = this.teamByPlayer.get(id);
    if (existingTeam) {
      return existingTeam;
    }

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
    // Count all players assigned to this team from the teamByPlayer map
    // This counts by playerKey to be consistent with team assignments
    let n = 0;
    for (const [playerKey, assignedTeam] of this.teamByPlayer) {
      if (assignedTeam === team) {
        // Only count if this player is still connected (has an active connection)
        for (const [_, pk] of this.connToPlayer) {
          if (pk === playerKey) {
            n++;
            break;
          }
        }
      }
    }
    return n;
  }

  private placePlayerAtSpawn(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    const pk = this.connToPlayer.get(id);
    const team = (pk ? this.teamByPlayer.get(pk) : undefined) || "red";
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
    const ids = Array.from(this.players.keys()).filter((k) => {
      const pk = this.connToPlayer.get(k);
      return pk ? this.teamByPlayer.get(pk) === team : false;
    });
    // Sort by stable player key to keep slot ordering consistent across reconnects
    ids.sort((a, b) => {
      const pka = this.connToPlayer.get(a) || "";
      const pkb = this.connToPlayer.get(b) || "";
      if (pka < pkb) return -1;
      if (pka > pkb) return 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    return Math.max(0, ids.indexOf(id));
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  },
};

// Bind the Durable Object class name expected by wrangler.toml
export { Globe as GameRoom };
