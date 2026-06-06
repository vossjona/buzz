// ABOUTME: Pure reveal-state transitions for Spotify hint reveal.
// ABOUTME: Atom set + isRevealed flag; all transitions are immutable.

export interface RevealState {
  revealedAtoms: Set<string>;
  isRevealed: boolean;
}

export function initialRevealState(): RevealState {
  return { revealedAtoms: new Set(), isRevealed: false };
}

export function toggleAtom(state: RevealState, atomId: string): RevealState {
  const next = new Set(state.revealedAtoms);
  if (next.has(atomId)) {
    next.delete(atomId);
  } else {
    next.add(atomId);
  }
  return { ...state, revealedAtoms: next };
}

export function revealAll(state: RevealState): RevealState {
  return { ...state, isRevealed: true };
}

export function resetReveal(_state: RevealState): RevealState {
  return initialRevealState();
}
