// ABOUTME: Hook that emits game state to the Player window via Tauri events.
// ABOUTME: Used by the Host window to synchronize state with the Player display.

import { useEffect, useRef } from 'react';
import { emit } from '@tauri-apps/api/event';
import { BuzzerState } from '@buzz/engine';
import { Screen, AnswerResult, RoundResult } from './useGameState';
import {
  EVENTS,
  GameStateSyncPayload,
  SpotifyDisplayState,
  CountdownState,
  IntroState,
} from '../events/types';

interface UseStateEmitterOptions {
  engineState: BuzzerState;
  screen: Screen;
  lastAnswerResult: AnswerResult | null;
  isPlayerReady: boolean;
  /** Spotify display state for the Player window */
  spotify: SpotifyDisplayState;
  /** Answer countdown state (for pulse animation intensity) */
  countdown?: CountdownState;
  /** Per-round results for song history table */
  roundResults: RoundResult[];
  /** Active 3-step intro overlay (Ready-Set-Go or 3-2-1), or null when none. */
  intro?: IntroState | null;
}

/**
 * Emits game state to the Player window whenever state changes.
 * Only emits when the player window is open.
 */
export function useStateEmitter(options: UseStateEmitterOptions): void {
  const {
    engineState,
    screen,
    lastAnswerResult,
    isPlayerReady,
    spotify,
    countdown,
    roundResults,
    intro,
  } = options;

  // Track previous state to avoid duplicate emissions
  const prevPayloadRef = useRef<string | null>(null);

  // Reset previous payload when player becomes ready to force initial emission
  useEffect(() => {
    if (isPlayerReady) {
      prevPayloadRef.current = null;
    }
  }, [isPlayerReady]);

  useEffect(() => {
    if (!isPlayerReady) {
      return;
    }

    const payload: GameStateSyncPayload = {
      engineState,
      screen,
      lastAnswerResult,
      spotify,
      countdown,
      roundResults,
      intro,
    };

    // Simple deep comparison via JSON serialization
    const payloadStr = JSON.stringify(payload);
    if (payloadStr === prevPayloadRef.current) {
      return;
    }
    prevPayloadRef.current = payloadStr;

    // Emit to player window
    emit(EVENTS.GAME_STATE_SYNC, payload).catch((err) => {
      console.error('Failed to emit state to player:', err);
    });
  }, [
    engineState,
    screen,
    lastAnswerResult,
    isPlayerReady,
    spotify,
    countdown,
    roundResults,
    intro,
  ]);
}
