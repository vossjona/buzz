// ABOUTME: Hook for managing the Player window lifecycle from the Host window.
// ABOUTME: Handles opening, closing, and tracking the Player window state.

import { useState, useEffect, useCallback } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { EVENTS } from '../events/types';

interface UsePlayerWindowReturn {
  isOpen: boolean;
  isReady: boolean;
  openPlayer: () => Promise<void>;
  closePlayer: () => Promise<void>;
}

/**
 * Manages the Player window lifecycle.
 * Tracks whether the window is open and ready to receive events.
 */
export function usePlayerWindow(): UsePlayerWindowReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playerWindow, setPlayerWindow] = useState<WebviewWindow | null>(null);

  // Listen for player ready signal
  useEffect(() => {
    const unlistenPromise = listen(EVENTS.PLAYER_READY, () => {
      setIsReady(true);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const openPlayer = useCallback(async () => {
    if (isOpen) {
      return;
    }

    try {
      const webview = new WebviewWindow('player', {
        url: '/?mode=player',
        title: 'Buzz - Player View',
        width: 1280,
        height: 720,
        resizable: true,
        center: true,
      });

      // Listen for window close event
      webview.once('tauri://destroyed', () => {
        setIsOpen(false);
        setIsReady(false);
        setPlayerWindow(null);
      });

      // Listen for window creation error
      webview.once('tauri://error', (e) => {
        console.error('Failed to create player window:', e);
        setIsOpen(false);
        setIsReady(false);
        setPlayerWindow(null);
      });

      setPlayerWindow(webview);
      setIsOpen(true);
    } catch (err) {
      console.error('Failed to open player window:', err);
    }
  }, [isOpen]);

  const closePlayer = useCallback(async () => {
    if (playerWindow) {
      try {
        await playerWindow.close();
      } catch (err) {
        console.error('Failed to close player window:', err);
      }
      setIsOpen(false);
      setIsReady(false);
      setPlayerWindow(null);
    }
  }, [playerWindow]);

  return { isOpen, isReady, openPlayer, closePlayer };
}
