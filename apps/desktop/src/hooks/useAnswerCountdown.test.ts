// ABOUTME: Tests for pure helpers exported from useAnswerCountdown.
// ABOUTME: Covers second-boundary transitions for the 3-2-1 timeout overlay step.

import { describe, it, expect } from 'vitest';
import { remainingMsToTimeoutIntroStep } from './useAnswerCountdown';

describe('remainingMsToTimeoutIntroStep', () => {
  it('returns null when more than 3000ms remain', () => {
    expect(remainingMsToTimeoutIntroStep(5000)).toBeNull();
    expect(remainingMsToTimeoutIntroStep(3001)).toBeNull();
  });

  it('returns null when at or below zero', () => {
    expect(remainingMsToTimeoutIntroStep(0)).toBeNull();
    expect(remainingMsToTimeoutIntroStep(-50)).toBeNull();
  });

  it('returns step 0 ("3") for remaining in (2000, 3000]', () => {
    expect(remainingMsToTimeoutIntroStep(3000)).toBe(0);
    expect(remainingMsToTimeoutIntroStep(2500)).toBe(0);
    expect(remainingMsToTimeoutIntroStep(2001)).toBe(0);
  });

  it('returns step 1 ("2") for remaining in (1000, 2000]', () => {
    expect(remainingMsToTimeoutIntroStep(2000)).toBe(1);
    expect(remainingMsToTimeoutIntroStep(1500)).toBe(1);
    expect(remainingMsToTimeoutIntroStep(1001)).toBe(1);
  });

  it('returns step 2 ("1") for remaining in (0, 1000]', () => {
    expect(remainingMsToTimeoutIntroStep(1000)).toBe(2);
    expect(remainingMsToTimeoutIntroStep(500)).toBe(2);
    expect(remainingMsToTimeoutIntroStep(1)).toBe(2);
  });
});
