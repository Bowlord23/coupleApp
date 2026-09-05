import { GROWTH_CONFIG as config } from "../../constants/product";
export function stageFor(points: number): number {
  return config.stages.reduce<number>(
    (stage, threshold, index) => (points >= threshold ? index : stage),
    0,
  );
}
export function growthFor(action: "water" | "touch" | "shared"): number {
  return action === "water"
    ? config.waterPoints
    : action === "touch"
      ? config.touchPoints
      : config.sharedPoints;
}
export function cooldownRemaining(
  lastAt: string | null,
  now: number,
  cooldown: number,
): number {
  if (!lastAt) return 0;
  const timestamp = Date.parse(lastAt);
  return Number.isFinite(timestamp)
    ? Math.max(0, timestamp + cooldown - now)
    : 0;
}
export function isSharedTouch(
  first: number,
  second: number,
  differentUsers: boolean,
): boolean {
  return (
    differentUsers &&
    second >= first &&
    second - first <= config.sharedTouchWindowMs
  );
}
export function normalizeInvite(code: string): string {
  return code.trim().toUpperCase();
}
export function isValidInvite(code: string): boolean {
  return /^[A-F0-9]{8}$/.test(normalizeInvite(code));
}
export function daysTogether(createdAt: string, now = Date.now()): number {
  return Math.max(
    1,
    Math.floor((now - Date.parse(createdAt)) / 86_400_000) + 1,
  );
}
