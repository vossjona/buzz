// ABOUTME: React hook for handling keyboard input in the buzzer game.
// ABOUTME: Listens for keydown events and calls the provided callback.

import { useEffect } from 'react';

export type KeyHandler = (key: string) => void;

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True when a key event originates from a form field the user is typing in. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    EDITABLE_TAGS.has(target.tagName) ||
    target.getAttribute('contenteditable') === 'true'
  );
}

export function useKeyboardInput(onKeyDown: KeyHandler): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Typing in a form field must never fire game shortcuts.
      if (isEditableTarget(event.target)) return;

      // Ignore modifier keys and repeated keys
      if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) {
        return;
      }

      // Normalize the key to uppercase for consistency
      const key = event.key.toUpperCase();

      // Arrow keys would otherwise scroll the page; the app binds them to seek.
      if (
        key === 'ARROWLEFT' ||
        key === 'ARROWRIGHT' ||
        key === 'ARROWUP' ||
        key === 'ARROWDOWN'
      ) {
        event.preventDefault();
      }

      onKeyDown(key);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onKeyDown]);
}
