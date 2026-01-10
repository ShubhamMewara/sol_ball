export type GameConfig = {
  W: number;
  H: number;
  playerRadiusPx: number;
  ballRadiusPx: number;
  moveSpeed: number; // meters/sec
  timeStep: number; // seconds
  goalHeightPx: number; // opening height of goal on left/right walls
  goalDepthPx?: number; // visual/physics depth of goal pocket (pixels)
  pitchInsetPx?: number; // distance of white touchline from canvas edge
  kickExtraReachM?: number; // meters added to playerR+ballR when kicking
  // Player acceleration (how fast players reach moveSpeed). Higher = snappier.
  playerAccelMps2?: number; // meters/sec^2
};

// Master size scale: change this ONE value to scale the entire game proportionally.
// It scales all lengths (pixels and meters). Speeds and timeStep remain unchanged.
export const SIZE_SCALE = 1.3; // e.g., 0.8 for smaller, 1.2 for larger

export const SCALE = 30; // pixels per meter (server physics stay in meters)

// Base values (design at SIZE_SCALE = 1)
const BASE_WALL_THICKNESS_M = 0.5; // meters
const BASE_PLAYER_RADIUS_PX = 18;
const BASE_BALL_RADIUS_PX = 12;
const BASE_GOAL_HEIGHT_PX = 160;
const BASE_PITCH_INSET_PX = 60;
const BASE_GOAL_DEPTH_PX = 30;
const BASE_KICK_EXTRA_REACH_M = 0.5; // meters
const BASE_PLAYER_ACCEL_MPS2 = 25; // meters/sec^2

// Scaled meter values
export const WALL_THICKNESS_M = BASE_WALL_THICKNESS_M * SIZE_SCALE; // meters

const ratio = 900 / 520; // W / H
const BASE_W = 900;
const BASE_H = BASE_W / ratio; // 520

// Apply master scale to canvas dimensions (pixels)
const W = Math.round(BASE_W * SIZE_SCALE);
const H = Math.round(BASE_H * SIZE_SCALE);

// Default config (can be overridden by client if desired)
export const CONFIG: GameConfig = {
  W,
  H,
  // Pixel-based sizes are scaled
  playerRadiusPx: Math.round(BASE_PLAYER_RADIUS_PX * SIZE_SCALE),
  ballRadiusPx: Math.round(BASE_BALL_RADIUS_PX * SIZE_SCALE),
  goalHeightPx: Math.round(BASE_GOAL_HEIGHT_PX * SIZE_SCALE),
  // Simulation parameters
  moveSpeed: 5, // meters/sec (kept constant when scaling size)
  timeStep: 1 / 60,
  playerAccelMps2: BASE_PLAYER_ACCEL_MPS2 * SIZE_SCALE, // scale with size
  // Visual/field layout
  pitchInsetPx: Math.round(BASE_PITCH_INSET_PX * SIZE_SCALE),
  // Depth of the goals measured from the sideline into the goal pocket (pixels)
  // This only affects the wall geometry; scoring logic is handled separately.
  goalDepthPx: Math.round(BASE_GOAL_DEPTH_PX * SIZE_SCALE),
  // Distance-based gameplay tweaks in meters should grow with size
  kickExtraReachM: BASE_KICK_EXTRA_REACH_M * SIZE_SCALE,
};
