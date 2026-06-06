// ABOUTME: Fullscreen 3-step sequence overlay used for Ready-Set-Go and 3-2-1.
// ABOUTME: Externally driven via currentStep so Host and Player render in lockstep.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './SequenceOverlay.module.css';

interface SequenceOverlayProps {
  /** The 3 step labels to render (e.g. ["Ready", "Set", "Go!"] or ["3", "2", "1"]). */
  steps: [string, string, string];
  /** Current step index (0..2) or null when the overlay should not be shown. */
  currentStep: 0 | 1 | 2 | null;
  /** CSS color value or var() for the digit text and glow. */
  color: string;
  /**
   * Fires once when the final step's exit animation completes
   * (i.e., currentStep transitioned from a non-null value to null).
   */
  onFinale?: () => void;
}

export function SequenceOverlay({
  steps,
  currentStep,
  color,
  onFinale,
}: SequenceOverlayProps) {
  const [exitingStep, setExitingStep] = useState<0 | 1 | 2 | null>(null);
  const prevStepRef = useRef<0 | 1 | 2 | null>(null);
  const finalePendingRef = useRef(false);
  const onFinaleRef = useRef(onFinale);
  onFinaleRef.current = onFinale;

  useEffect(() => {
    const prev = prevStepRef.current;
    if (prev !== null && prev !== currentStep) {
      setExitingStep(prev);
      finalePendingRef.current = currentStep === null;
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  const handleExitEnd = () => {
    setExitingStep(null);
    if (finalePendingRef.current) {
      finalePendingRef.current = false;
      onFinaleRef.current?.();
    }
  };

  if (currentStep === null && exitingStep === null) {
    return null;
  }

  const overlayStyle = { ['--seq-color' as string]: color } as CSSProperties;

  return (
    <div className={styles.overlay} style={overlayStyle} aria-hidden="true">
      {exitingStep !== null && (
        <div
          key={`exit-${exitingStep}`}
          className={`${styles.step} ${styles.stepExit}`}
          onAnimationEnd={handleExitEnd}
        >
          {steps[exitingStep]}
        </div>
      )}
      {currentStep !== null && (
        <div
          key={`enter-${currentStep}`}
          className={`${styles.step} ${styles.stepEnter}`}
        >
          {steps[currentStep]}
        </div>
      )}
    </div>
  );
}
