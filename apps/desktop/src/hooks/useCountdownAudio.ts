// ABOUTME: Hook that plays "bumm" sounds during countdown using Web Audio API.
// ABOUTME: Sound is synced with pulse animation speed for cohesive feedback.

import { useEffect, useRef, useCallback } from 'react';

interface UseCountdownAudioOptions {
  /** Pulse animation duration in seconds (determines sound interval) */
  pulseDurationSeconds: number;
  /** Progress ratio from 1.0 (full time) to 0.0 (expired) */
  progress: number;
  /** Whether audio should be playing */
  isActive: boolean;
  /** Whether audio is enabled (user setting) */
  isEnabled: boolean;
}

/**
 * Creates a deep "bumm" sound using Web Audio API.
 * Uses low-frequency oscillators with quick decay for impact.
 */
function playBumm(audioCtx: AudioContext, intensity: number): void {
  const now = audioCtx.currentTime;

  // Main bass oscillator (low frequency for "bumm")
  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(60 + intensity * 20, now); // 60-80 Hz base

  // Sub-bass for extra depth
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(40 + intensity * 10, now); // 40-50 Hz sub

  // Gain envelope for quick attack, medium decay (20% louder than before)
  const gainNode = audioCtx.createGain();
  const duration = 0.15 - intensity * 0.05; // 0.15s to 0.1s based on intensity

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.36 + intensity * 0.24, now + 0.01); // Quick attack (20% louder)
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay

  // Connect the audio graph
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Start and stop
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * Hook that plays "bumm" sounds synced with the pulse animation.
 * One sound per pulse cycle, matching the visual rhythm.
 */
export function useCountdownAudio({
  pulseDurationSeconds,
  progress,
  isActive,
  isEnabled,
}: UseCountdownAudioOptions): void {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayTimeRef = useRef<number>(0);

  // Lazily create AudioContext (must be after user interaction)
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Reset last play time when countdown starts
  useEffect(() => {
    if (isActive && isEnabled) {
      lastPlayTimeRef.current = 0;
    }
  }, [isActive, isEnabled]);

  // Play sounds at pulse-synced intervals using the progress update cycle
  useEffect(() => {
    if (!isActive || !isEnabled || progress <= 0) {
      return;
    }

    const now = Date.now();
    const intervalMs = pulseDurationSeconds * 1000;

    // Check if enough time has passed since last sound (one sound per pulse cycle)
    if (now - lastPlayTimeRef.current >= intervalMs) {
      try {
        const ctx = getAudioContext();
        const intensity = 1 - progress; // 0 at start, 1 at end
        playBumm(ctx, intensity);
        lastPlayTimeRef.current = now;
      } catch (err) {
        console.error('Failed to play countdown audio:', err);
      }
    }
  }, [progress, isActive, isEnabled, pulseDurationSeconds, getAudioContext]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);
}
