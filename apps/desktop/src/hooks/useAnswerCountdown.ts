// ABOUTME: Hook that manages a countdown timer for answer time limits.
// ABOUTME: Tracks remaining time and provides progress ratio for animation intensity.

import { useState, useEffect, useRef } from 'react';

const UPDATE_INTERVAL_MS = 50; // Update every 50ms for smooth animation

export interface UseAnswerCountdownOptions {
  /** Whether the countdown is active (true when phase === 'locked') */
  isActive: boolean;
  /** Total countdown duration in seconds (0 = disabled) */
  durationSeconds: number;
  /** Callback when countdown reaches zero */
  onTimeout: () => void;
}

export interface UseAnswerCountdownResult {
  /** Milliseconds remaining in countdown */
  remainingMs: number;
  /** Progress ratio from 1.0 (full time) to 0.0 (expired) */
  progress: number;
  /** Whether the countdown is currently running */
  isRunning: boolean;
}

/**
 * Manages a countdown timer with high-frequency updates for smooth animations.
 * Automatically resets when isActive becomes false.
 */
export function useAnswerCountdown({
  isActive,
  durationSeconds,
  onTimeout,
}: UseAnswerCountdownOptions): UseAnswerCountdownResult {
  const [remainingMs, setRemainingMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const durationMs = durationSeconds * 1000;

  // Track if we've already fired timeout for this activation
  const hasTimedOutRef = useRef(false);

  // Stable callback ref to avoid effect re-runs
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reset and start countdown when activated
  useEffect(() => {
    if (isActive && durationSeconds > 0) {
      startTimeRef.current = Date.now();
      hasTimedOutRef.current = false;
      setRemainingMs(durationMs);
    } else {
      startTimeRef.current = null;
      setRemainingMs(0);
    }
  }, [isActive, durationSeconds, durationMs]);

  // High-frequency update loop
  useEffect(() => {
    if (!isActive || durationSeconds <= 0 || startTimeRef.current === null) {
      return;
    }

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
      const remaining = Math.max(0, durationMs - elapsed);
      setRemainingMs(remaining);

      // Fire timeout callback once when time expires
      if (remaining <= 0 && !hasTimedOutRef.current) {
        hasTimedOutRef.current = true;
        onTimeoutRef.current();
      }
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isActive, durationSeconds, durationMs]);

  // Calculate progress ratio (1.0 = full time, 0.0 = expired)
  const progress =
    durationSeconds > 0 && isActive ? remainingMs / durationMs : 1;

  const isRunning = isActive && durationSeconds > 0 && remainingMs > 0;

  return {
    remainingMs,
    progress,
    isRunning,
  };
}

/**
 * Converts countdown progress to pulse animation duration.
 * Progress 1.0 (full time) -> 1.5s (slow, relaxed)
 * Progress 0.0 (expired) -> 0.6s (fast, urgent)
 */
export function progressToPulseDuration(progress: number): number {
  const MIN_DURATION = 0.6;
  const MAX_DURATION = 1.5;
  return MIN_DURATION + progress * (MAX_DURATION - MIN_DURATION);
}

/**
 * Converts countdown progress to pulse intensity multiplier.
 * Progress 1.0 (full time) -> 1.0 (normal intensity)
 * Progress 0.0 (expired) -> 1.3 (30% more intense)
 */
export function progressToPulseIntensity(progress: number): number {
  const MIN_INTENSITY = 1.0;
  const MAX_INTENSITY = 1.3;
  return MAX_INTENSITY - progress * (MAX_INTENSITY - MIN_INTENSITY);
}

/**
 * Maps countdown remaining time to the 3-2-1 overlay step.
 * - remainingMs in (2000, 3000]  -> 0  (showing "3")
 * - remainingMs in (1000, 2000]  -> 1  (showing "2")
 * - remainingMs in (0,    1000]  -> 2  (showing "1")
 * - otherwise -> null (overlay hidden)
 *
 * Step transitions land exactly on second boundaries so the "1" exit
 * animation completes as remainingMs reaches 0.
 */
export function remainingMsToTimeoutIntroStep(
  remainingMs: number
): 0 | 1 | 2 | null {
  if (remainingMs <= 0 || remainingMs > 3000) return null;
  return (3 - Math.ceil(remainingMs / 1000)) as 0 | 1 | 2;
}
