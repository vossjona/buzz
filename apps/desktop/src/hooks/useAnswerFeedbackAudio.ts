// ABOUTME: Hook that provides imperative functions to play correct/wrong answer sounds.
// ABOUTME: Sounds are played directly from event handlers to ensure browser audio activation.

import { useCallback } from 'react';

interface UseAnswerFeedbackAudioOptions {
  /** Whether audio is enabled */
  isEnabled: boolean;
}

/** Preloaded Audio elements for instant playback */
const correctAudio = new Audio('/sounds/correct.mp3');
const wrongAudio = new Audio('/sounds/wrong.mp3');

/** Start offset in seconds (to skip silence/delay at the beginning) */
const WRONG_SOUND_START_OFFSET = 0.6;

function playSound(template: HTMLAudioElement, startOffset = 0): void {
  // Clone per play: HTMLAudioElement's post-`ended` state is unreliable in
  // WKWebView (play() resolves but produces no audio). A fresh clone is
  // always in a clean state and becomes GC-eligible once playback finishes.
  const clone = template.cloneNode(true) as HTMLAudioElement;
  clone.currentTime = startOffset;
  clone.play().catch((err: DOMException) => {
    console.warn('[audio] play() rejected:', err.name, err.message);
  });
}

interface UseAnswerFeedbackAudioReturn {
  /** Play the correct answer sound */
  playCorrectSound: () => void;
  /** Play the wrong answer sound */
  playWrongSound: () => void;
}

/**
 * Hook that provides functions to play answer feedback sounds.
 * Call playCorrectSound/playWrongSound directly from event handlers
 * to stay within the browser's user-activation context.
 */
export function useAnswerFeedbackAudio({
  isEnabled,
}: UseAnswerFeedbackAudioOptions): UseAnswerFeedbackAudioReturn {
  const playCorrectSound = useCallback(() => {
    if (!isEnabled) return;
    playSound(correctAudio);
  }, [isEnabled]);

  const playWrongSound = useCallback(() => {
    if (!isEnabled) return;
    playSound(wrongAudio, WRONG_SOUND_START_OFFSET);
  }, [isEnabled]);

  return { playCorrectSound, playWrongSound };
}
