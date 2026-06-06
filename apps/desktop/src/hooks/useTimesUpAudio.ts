// ABOUTME: Hook that plays a synthesized "time's up" sound via Web Audio API.
// ABOUTME: Three descending notes (220 -> 165 -> 110 Hz) with overlapping decays.

import { useCallback, useEffect, useRef } from 'react';

interface UseTimesUpAudioOptions {
  /** Whether audio is enabled */
  isEnabled: boolean;
}

interface UseTimesUpAudioReturn {
  /** Play the "time's up" sound */
  playTimesUpSound: () => void;
}

interface NoteSpec {
  /** Fundamental frequency in Hz */
  frequency: number;
  /** Time within the sequence (seconds from start) when this note begins */
  startOffset: number;
  /** Duration of the note in seconds */
  duration: number;
  /** Peak gain for this note */
  peakGain: number;
  /** Whether to layer a faint sawtooth on top for grit */
  withSaw: boolean;
}

const NOTES: NoteSpec[] = [
  {
    frequency: 220,
    startOffset: 0.0,
    duration: 0.16,
    peakGain: 0.55,
    withSaw: false,
  },
  {
    frequency: 165,
    startOffset: 0.1,
    duration: 0.16,
    peakGain: 0.55,
    withSaw: false,
  },
  {
    frequency: 110,
    startOffset: 0.22,
    duration: 0.32,
    peakGain: 0.6,
    withSaw: true,
  },
];

/**
 * Schedules a single note: a sine oscillator (and optional faint sawtooth)
 * with a quick attack and exponential decay.
 */
function scheduleNote(
  ctx: AudioContext,
  master: GainNode,
  startTime: number,
  spec: NoteSpec
): void {
  const noteGain = ctx.createGain();
  noteGain.gain.setValueAtTime(0, startTime);
  noteGain.gain.linearRampToValueAtTime(spec.peakGain, startTime + 0.01);
  noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + spec.duration);
  noteGain.connect(master);

  const sine = ctx.createOscillator();
  sine.type = 'sine';
  sine.frequency.setValueAtTime(spec.frequency, startTime);
  sine.connect(noteGain);
  sine.start(startTime);
  sine.stop(startTime + spec.duration);

  if (spec.withSaw) {
    const sawGain = ctx.createGain();
    sawGain.gain.setValueAtTime(0, startTime);
    sawGain.gain.linearRampToValueAtTime(
      spec.peakGain * 0.18,
      startTime + 0.01
    );
    sawGain.gain.exponentialRampToValueAtTime(0.001, startTime + spec.duration);
    sawGain.connect(master);

    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(spec.frequency, startTime);
    saw.connect(sawGain);
    saw.start(startTime);
    saw.stop(startTime + spec.duration);
  }
}

function playTimesUp(ctx: AudioContext): void {
  const startTime = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.85, startTime);
  master.connect(ctx.destination);

  for (const note of NOTES) {
    scheduleNote(ctx, master, startTime + note.startOffset, note);
  }
}

/**
 * Hook that provides a function to play the "time's up" sound.
 * Mirrors the API shape of useAnswerFeedbackAudio so callers stay symmetrical.
 */
export function useTimesUpAudio({
  isEnabled,
}: UseTimesUpAudioOptions): UseTimesUpAudioReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTimesUpSound = useCallback(() => {
    if (!isEnabled) return;
    try {
      const ctx = getAudioContext();
      playTimesUp(ctx);
    } catch (err) {
      console.error('Failed to play times-up audio:', err);
    }
  }, [isEnabled, getAudioContext]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  return { playTimesUpSound };
}
