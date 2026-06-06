// ABOUTME: Computes the Buzz app's per-process session id once at import time.
// ABOUTME: Shared by the JS logger and matched by the Rust side's log filename.

function buildSessionId(now: Date): string {
  // "2026-04-18T14-03-22" — filename-safe, lexicographically sortable.
  const iso = now.toISOString(); // "2026-04-18T14:03:22.451Z"
  return iso.slice(0, 19).replace(/:/g, '-');
}

export const SESSION_ID = buildSessionId(new Date());
