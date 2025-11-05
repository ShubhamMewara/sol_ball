export type InputMessage = {
  type: "inputs";
  seq?: number;
  keys: { w?: boolean; a?: boolean; s?: boolean; d?: boolean };
  actions?: { kick?: boolean };
  at?: number;
};

export type JoinMessage = {
  type: "join";
  name?: string;
  room?: string;
  team?: "red" | "blue";
  teamSize?: number;
};

export type SpectateMessage = {
  type: "spectate";
};

export type ServerWelcome = {
  type: "welcome";
  id: string;
  room: string;
  config: {
    W: number;
    H: number;
    playerRadiusPx: number;
    ballRadiusPx: number;
    moveSpeed: number;
    timeStep: number;
    goalHeightPx: number;
    goalDepthPx?: number;
    pitchInsetPx?: number;
    kickExtraReachM?: number;
  };
};

export type SnapshotPlayer = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  team?: "red" | "blue";
  key?: string; // stable player identity (e.g., wallet/user id)
  num?: number; // stable jersey number derived from key
};

export type ClientSnapshot = {
  type: "snapshot";
  t: number; // server time
  me: string; // my id
  lastSeq?: number; // optional last processed input seq
  score: { red: number; blue: number };
  players: Record<string, SnapshotPlayer>;
  ball: { x: number; y: number; vx: number; vy: number };
  phase?: "waiting" | "playing" | "celebrating" | "ended";
  timeLeftMs?: number;
  winner?: "red" | "blue" | "draw";
  // Optional goal celebration info (present during celebrating)
  goalCelebrationMsLeft?: number;
  lastGoalTeam?: "red" | "blue";
};
