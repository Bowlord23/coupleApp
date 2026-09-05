import product from "../product.json";
export const APP_NAME = product.name;
// Keep aligned with public.growth_config() in the migration. SQL is authoritative.
export const GROWTH_CONFIG = {
  waterPoints: 5,
  touchPoints: 1,
  sharedPoints: 8,
  waterCooldownMs: 6 * 60 * 60 * 1000,
  touchCooldownMs: 3000,
  sharedCooldownMs: 60 * 1000,
  sharedTouchWindowMs: 10_000,
  stages: [0, 10, 40, 100, 200, 350],
} as const;
export const NOTE_MAX_LENGTH = 180;
export const REFRESH_INTERVAL_MS = 30_000;
