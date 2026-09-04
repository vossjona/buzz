// ABOUTME: Unit tests for the keyboard input helpers.
// ABOUTME: Guards that typing inside form fields never triggers game shortcuts.

import { describe, it, expect } from 'vitest';
import { isEditableTarget } from './useKeyboardInput';

describe('isEditableTarget', () => {
  it.each(['input', 'textarea', 'select'])('is true for <%s>', (tag) => {
    expect(isEditableTarget(document.createElement(tag))).toBe(true);
  });

  it('is true for contenteditable elements', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isEditableTarget(div)).toBe(true);
  });

  it('is false for buttons, plain elements, and null', () => {
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(document.body)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
