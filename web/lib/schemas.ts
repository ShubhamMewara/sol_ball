import { z } from "zod";

// Webhook/API request bodies
export const MatchStartBody = z.object({
  roomId: z.string().min(1),
});
export type MatchStartBody = z.infer<typeof MatchStartBody>;

export const MatchSettleBody = z.object({
  roomId: z.string().min(1),
  winner: z.enum(["red", "blue"]),
});
export type MatchSettleBody = z.infer<typeof MatchSettleBody>;

export const JoinMatchBody = z.object({
  pubKeys: z.array(z.string().min(1)),
  match_fees: z.number().int().nonnegative(),
});
export type JoinMatchBody = z.infer<typeof JoinMatchBody>;

export const SettleMatchBody = z.object({
  pubKeys: z.array(z.string().min(1)),
  winner_share: z.number().int().nonnegative(),
});
export type SettleMatchBody = z.infer<typeof SettleMatchBody>;

// Server → Client messages
export const ServerWelcomeSchema = z.object({
  type: z.literal("welcome"),
  id: z.string(),
  room: z.string(),
  config: z.object({
    W: z.number(),
    H: z.number(),
    playerRadiusPx: z.number(),
    ballRadiusPx: z.number(),
    moveSpeed: z.number(),
    timeStep: z.number(),
    goalHeightPx: z.number(),
    goalDepthPx: z.number().optional(),
    pitchInsetPx: z.number().optional(),
    kickExtraReachM: z.number().optional(),
  }),
});
export type ServerWelcome = z.infer<typeof ServerWelcomeSchema>;

export const SnapshotPlayerSchema = z.object({
  x: z.number(),
  y: z.number(),
  vx: z.number(),
  vy: z.number(),
  team: z.enum(["red", "blue"]).optional(),
  key: z.string().optional(),
  num: z.number().optional(),
});

export const SnapshotSchema = z.object({
  type: z.literal("snapshot"),
  t: z.number(),
  me: z.string(),
  lastSeq: z.number().optional(),
  score: z.object({ red: z.number(), blue: z.number() }),
  players: z.record(SnapshotPlayerSchema),
  ball: z.object({ x: z.number(), y: z.number(), vx: z.number(), vy: z.number() }),
  phase: z.enum(["waiting", "playing", "celebrating", "ended"]).optional(),
  timeLeftMs: z.number().optional(),
  winner: z.enum(["red", "blue", "draw"]).optional(),
  goalCelebrationMsLeft: z.number().optional(),
  lastGoalTeam: z.enum(["red", "blue"]).optional(),
});
export type ClientSnapshot = z.infer<typeof SnapshotSchema>;

// Client → Server messages
export const ClientJoinSchema = z.object({
  type: z.literal("join"),
  name: z.string().optional(),
  team: z.enum(["red", "blue"]).optional(),
  teamSize: z.number().int().positive().optional(),
  playerKey: z.string().min(1).optional(),
  wallet: z.string().min(1).optional(),
});
export type ClientJoin = z.infer<typeof ClientJoinSchema>;

export const ClientSpectateSchema = z.object({
  type: z.literal("spectate"),
});
export type ClientSpectate = z.infer<typeof ClientSpectateSchema>;

export const ClientClaimHostSchema = z.object({
  type: z.literal("claim-host"),
  wallet: z.string().min(1).optional(),
});
export type ClientClaimHost = z.infer<typeof ClientClaimHostSchema>;

export const ClientStartSchema = z.object({
  type: z.literal("start"),
  durationMin: z.number().int().positive().optional(),
  wallet: z.string().min(1).optional(),
});
export type ClientStart = z.infer<typeof ClientStartSchema>;

export const ClientInputsSchema = z.object({
  type: z.literal("inputs"),
  keys: z
    .object({
      w: z.boolean().optional(),
      a: z.boolean().optional(),
      s: z.boolean().optional(),
      d: z.boolean().optional(),
    })
    .default({}),
  actions: z.object({ kick: z.boolean().optional() }).optional(),
  at: z.number().optional(),
});
export type ClientInputs = z.infer<typeof ClientInputsSchema>;
