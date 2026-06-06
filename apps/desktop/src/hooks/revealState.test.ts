// ABOUTME: Tests for pure reveal-state transitions (atom toggle + all-reveal + reset).

import { describe, it, expect } from 'vitest';
import {
  initialRevealState,
  toggleAtom,
  revealAll,
  resetReveal,
} from './revealState';

describe('revealState', () => {
  it('initial state has no revealed atoms and isRevealed=false', () => {
    const s = initialRevealState();
    expect(s.revealedAtoms).toEqual(new Set());
    expect(s.isRevealed).toBe(false);
  });

  it('toggleAtom adds an atom that is not yet revealed', () => {
    const s = toggleAtom(initialRevealState(), 'title:0');
    expect(s.revealedAtoms.has('title:0')).toBe(true);
  });

  it('toggleAtom removes an already-revealed atom', () => {
    const s1 = toggleAtom(initialRevealState(), 'title:0');
    const s2 = toggleAtom(s1, 'title:0');
    expect(s2.revealedAtoms.has('title:0')).toBe(false);
  });

  it('revealAll sets isRevealed without touching the atom set', () => {
    const s1 = toggleAtom(initialRevealState(), 'title:0');
    const s2 = revealAll(s1);
    expect(s2.isRevealed).toBe(true);
    expect(s2.revealedAtoms.has('title:0')).toBe(true);
  });

  it('resetReveal clears everything', () => {
    let s = toggleAtom(initialRevealState(), 'title:0');
    s = revealAll(s);
    s = resetReveal(s);
    expect(s.isRevealed).toBe(false);
    expect(s.revealedAtoms.size).toBe(0);
  });
});
