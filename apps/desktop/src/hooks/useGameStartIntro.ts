// ABOUTME: Drives the Ready-Set-Go intro state machine on the host.
// ABOUTME: Advances 0 -> 1 -> 2 -> null at one-second intervals, then fires onFinale.

import { useCallback, useEffect, useRef, useState } from 'react';

const STEP_DURATION_MS = 1000;
const TOTAL_STEPS = 3;

type IntroStep = 0 | 1 | 2 | null;

export interface UseGameStartIntroReturn {
  /** Current intro step (0..2) or null when no intro is running. */
  introStep: IntroStep;
  /** Begin the intro. The callback fires after the final step's slot ends. */
  startIntro: (onFinale: () => void) => void;
}

export function useGameStartIntro(): UseGameStartIntroReturn {
  const [introStep, setIntroStep] = useState<IntroStep>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finaleRef = useRef<(() => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startIntro = useCallback(
    (onFinale: () => void) => {
      clearTimer();
      finaleRef.current = onFinale;
      setIntroStep(0);

      let next = 1;
      intervalRef.current = setInterval(() => {
        if (next >= TOTAL_STEPS) {
          clearTimer();
          setIntroStep(null);
          const cb = finaleRef.current;
          finaleRef.current = null;
          cb?.();
          return;
        }
        setIntroStep(next as IntroStep);
        next += 1;
      }, STEP_DURATION_MS);
    },
    [clearTimer]
  );

  useEffect(() => {
    return () => {
      clearTimer();
      finaleRef.current = null;
    };
  }, [clearTimer]);

  return { introStep, startIntro };
}
