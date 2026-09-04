// ABOUTME: Hook that receives game state from the Host window via Tauri events.
// ABOUTME: Used by the Player window to display synchronized game state.

import { useState, useEffect } from 'react';
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event';
import { EVENTS, GameStateSyncPayload } from '../events/types';

/** Interval for re-announcing readiness until the first state arrives. */
const READY_RETRY_MS = 1000;

interface UsePlayerStateReturn {
  state: GameStateSyncPayload | null;
  isConnected: boolean;
}

/**
 * Listens for game state events from the Host window.
 * Returns the current state and connection status.
 */
export function usePlayerState(): UsePlayerStateReturn {
  const [state, setState] = useState<GameStateSyncPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let readyTimer: number | null = null;
    let receivedState = false;
    let cancelled = false;

    const stopAnnouncing = () => {
      if (readyTimer !== null) {
        clearInterval(readyTimer);
        readyTimer = null;
      }
    };

    const announceReady = () => {
      emit(EVENTS.PLAYER_READY, {}).catch((err) => {
        console.error('Failed to emit player ready:', err);
      });
    };

    // Register the listener BEFORE announcing readiness — the host replies to
    // PLAYER_READY immediately, and IPC calls are not guaranteed to be
    // ordered, so announcing first can lose the reply for good.
    listen<GameStateSyncPayload>(EVENTS.GAME_STATE_SYNC, (event) => {
      receivedState = true;
      stopAnnouncing();
      setState(event.payload);
      setIsConnected(true);
    })
      .then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        unlisten = fn;
        announceReady();
        // Re-announce until the first state arrives, so a single lost
        // message in either direction cannot strand us on "Connecting".
        if (!receivedState) {
          readyTimer = window.setInterval(announceReady, READY_RETRY_MS);
        }
      })
      .catch((err) => {
        console.error('Failed to listen for game state:', err);
      });

    return () => {
      cancelled = true;
      stopAnnouncing();
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return { state, isConnected };
}
