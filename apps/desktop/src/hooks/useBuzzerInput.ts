// ABOUTME: React hook for listening to USB HID buzzer press events from the Tauri backend.
// ABOUTME: Mirrors the useGamepadInput pattern — calls onBuzz(buzzerIndex) on each press.

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export type BuzzerHandler = (buzzerIndex: number) => void;

interface BuzzerPressPayload {
  device_path: string;
  buzzer_index: number;
}

/**
 * Hook that listens for buzzer:press events from the Rust HID monitor
 * and triggers a callback with the buzzer's paired index.
 *
 * @param onBuzz - Callback fired with the buzzer index when a press is detected
 */
export function useBuzzerInput(onBuzz: BuzzerHandler): void {
  useEffect(() => {
    const unlisten = listen<BuzzerPressPayload>('buzzer:press', (event) => {
      onBuzz(event.payload.buzzer_index);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onBuzz]);
}
