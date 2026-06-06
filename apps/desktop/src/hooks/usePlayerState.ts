// ABOUTME: Hook that receives game state from the Host window via Tauri events.
// ABOUTME: Used by the Player window to display synchronized game state.

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { emit } from '@tauri-apps/api/event';
import { EVENTS, GameStateSyncPayload } from '../events/types';

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
    // Signal that player window is ready
    emit(EVENTS.PLAYER_READY, {}).catch((err) => {
      console.error('Failed to emit player ready:', err);
    });

    // Listen for state sync events from host
    const unlistenPromise = listen<GameStateSyncPayload>(
      EVENTS.GAME_STATE_SYNC,
      (event) => {
        setState(event.payload);
        setIsConnected(true);
      }
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return { state, isConnected };
}
