export const SCALE = 30; // pixels per meter (for reference; server stays in meters)

// Default config (can be overridden by client if desired)
export const CONFIG = {
  W: 900,
  H: 520,
  playerRadiusPx: 18,
  ballRadiusPx: 12,
  moveSpeed: 4.5, // meters/sec
  timeStep: 1 / 60,
  goalHeightPx: 160,
};