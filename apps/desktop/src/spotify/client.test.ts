// ABOUTME: Unit tests for the pure token-payload builder used by getSpotifyClient.
// ABOUTME: Guards against the SDK auto-refreshing (and revoking) our PKCE tokens.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildTokenPayload } from './client';

describe('buildTokenPayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the stored expiry when provided', () => {
    const now = Date.now();
    const expires = now + 45 * 60 * 1000; // 45 minutes from now
    const payload = buildTokenPayload('access-abc', 'refresh-xyz', expires);

    expect(payload.access_token).toBe('access-abc');
    expect(payload.refresh_token).toBe('refresh-xyz');
    expect(payload.token_type).toBe('Bearer');
    expect(payload.expires).toBe(expires);
    expect(payload.expires_in).toBe(45 * 60);
  });

  it('falls back to a 5-minute window when no stored expiry', () => {
    const now = Date.now();
    const payload = buildTokenPayload('access-abc', 'refresh-xyz', null);

    expect(payload.expires).toBe(now + 5 * 60 * 1000);
    expect(payload.expires_in).toBe(5 * 60);
  });

  it('never returns an expired payload — expires_in is always in the future', () => {
    // Stored expiry in the past (e.g., clock drift, stale storage)
    const stale = Date.now() - 1000;
    const payload = buildTokenPayload('access-abc', 'refresh-xyz', stale);

    // The SDK treats a past `expires` as a trigger to refresh itself —
    // we must not let it. expires_in bottoms out at the 60s floor.
    expect(payload.expires_in).toBeGreaterThanOrEqual(60);
  });

  it('passes the raw stored expiry through so the SDK respects our schedule', () => {
    const stored = Date.now() + 30 * 60 * 1000;
    const payload = buildTokenPayload('a', 'r', stored);
    expect(payload.expires).toBe(stored);
  });
});
