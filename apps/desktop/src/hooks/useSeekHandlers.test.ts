// ABOUTME: Tests for the pure clamp function used by seek handlers.

import { describe, it, expect } from 'vitest';
import { clampSeek } from './useSeekHandlers';

describe('clampSeek', () => {
  it('adds delta when inside bounds', () => {
    expect(clampSeek(30_000, 10_000, 180_000)).toBe(40_000);
  });

  it('clamps to 0 when result would be negative', () => {
    expect(clampSeek(3_000, -10_000, 180_000)).toBe(0);
  });

  it('clamps to duration when result would exceed it', () => {
    expect(clampSeek(175_000, 10_000, 180_000)).toBe(180_000);
  });

  it('returns current position when duration is 0', () => {
    expect(clampSeek(0, 10_000, 0)).toBe(0);
  });
});
