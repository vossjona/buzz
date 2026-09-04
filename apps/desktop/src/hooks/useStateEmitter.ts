// ABOUTME: Hook that emits game state to the Player window via Tauri events.
// ABOUTME: Used by the Host window to synchronize state with the Player display.

import { useEffect, useRef } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
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
  // Latest payload, kept current even while no player window is open, so the
  // PLAYER_READY responder below always answers with fresh state.
  const latestPayloadRef = useRef<GameStateSyncPayload | null>(null);

  // Answer every PLAYER_READY with a full state emission. The player
  // re-announces until it receives state, so a lost message on either side
  // (including a reloaded player window) recovers within a retry cycle.
  useEffect(() => {
    const unlistenPromise = listen(EVENTS.PLAYER_READY, () => {
      const payload = latestPayloadRef.current;
      if (!payload) {
        return;
      }
      prevPayloadRef.current = JSON.stringify(payload);
      emit(EVENTS.GAME_STATE_SYNC, payload).catch((err) => {
        console.error('Failed to emit state to player:', err);
      });
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const payload: GameStateSyncPayload = {
      engineState,
      screen,
      lastAnswerResult,
      spotify,
      countdown,
      roundResults,
      intro,
    };
    latestPayloadRef.current = payload;

    if (!isPlayerReady) {
      return;
    }

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
