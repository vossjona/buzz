// ABOUTME: React hook for handling USB gamepad input in the buzzer game.
// ABOUTME: Polls connected gamepads and calls the callback when any button is pressed.

import { useEffect, useRef } from 'react';

export type GamepadHandler = (gamepadIndex: number) => void;

/**
 * Hook that polls connected gamepads and triggers a callback when a button is pressed.
 * Maps gamepad index directly to team (gamepad 0 → team 1, etc.)
 *
 * @param onBuzz - Callback fired with the gamepad index when a button press is detected
 */
export function useGamepadInput(onBuzz: GamepadHandler): void {
  // Track previous button states to detect press (not hold)
  // Map from gamepad index to array of button pressed states
  const prevButtonStates = useRef<Map<number, boolean[]>>(new Map());

  useEffect(() => {
    let animationFrameId: number;

    function pollGamepads(): void {
      const gamepads = navigator.getGamepads();

      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad) continue;

        const prevStates = prevButtonStates.current.get(i) ?? [];
        const currentStates: boolean[] = [];

        for (let btnIdx = 0; btnIdx < gamepad.buttons.length; btnIdx++) {
          const isPressed = gamepad.buttons[btnIdx].pressed;
          currentStates[btnIdx] = isPressed;

          // Detect button press: was released, now pressed
          const wasPressed = prevStates[btnIdx] ?? false;
          if (isPressed && !wasPressed) {
            onBuzz(i);
            // Only trigger once per frame per gamepad
            break;
          }
        }

        prevButtonStates.current.set(i, currentStates);
      }

      animationFrameId = requestAnimationFrame(pollGamepads);
    }

    // Start polling
    animationFrameId = requestAnimationFrame(pollGamepads);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [onBuzz]);
}
