// ABOUTME: Pure clamp helper for computing seek targets.
// ABOUTME: Keeps the delta-seek math out of the hook surface for easier testing.

export function clampSeek(
  currentMs: number,
  deltaMs: number,
  durationMs: number
): number {
  if (durationMs <= 0) return currentMs;
  return Math.max(0, Math.min(durationMs, currentMs + deltaMs));
}
