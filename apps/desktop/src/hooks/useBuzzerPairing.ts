// ABOUTME: React hook for tracking USB HID buzzer pairing state.
// ABOUTME: Listens for buzzer:paired events from the auto-started Rust monitor.

import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export interface PairedBuzzer {
  device_path: string;
  buzzer_index: number;
}

export interface BuzzerPairingHook {
  pairedBuzzers: PairedBuzzer[];
  isMonitoring: boolean;
  clearPairings: () => void;
}

/**
 * Hook for tracking HID buzzer pairing state.
 * Monitoring starts automatically on app launch from the Rust backend.
 * Auto-updates pairedBuzzers when new devices are paired.
 */
export function useBuzzerPairing(): BuzzerPairingHook {
  const [pairedBuzzers, setPairedBuzzers] = useState<PairedBuzzer[]>([]);

  // Listen for new pairing events
  useEffect(() => {
    const unlisten = listen<PairedBuzzer>('buzzer:paired', (event) => {
      setPairedBuzzers((prev) => {
        // Avoid duplicates
        if (prev.some((b) => b.device_path === event.payload.device_path)) {
          return prev;
        }
        return [...prev, event.payload].sort(
          (a, b) => a.buzzer_index - b.buzzer_index
        );
      });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const clearPairings = () => {
    setPairedBuzzers([]);
  };

  return {
    pairedBuzzers,
    isMonitoring: true, // Always on — auto-started from Rust
    clearPairings,
  };
}
