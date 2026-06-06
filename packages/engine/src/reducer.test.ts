// ABOUTME: Unit tests for the team-based buzzer game reducer.
// ABOUTME: Tests all state transitions, event handling, and edge cases.

import { describe, it, expect } from 'vitest';
import { createInitialState, reducer } from './reducer.js';
import type { BuzzerState } from './types.js';

describe('createInitialState', () => {
  it('should start in setup phase', () => {
    const state = createInitialState();
    expect(state.phase).toBe('setup');
  });

  it('should have empty teams array', () => {
    const state = createInitialState();
    expect(state.teams).toEqual([]);
  });

  it('should have activeTeamId as null', () => {
    const state = createInitialState();
    expect(state.activeTeamId).toBeNull();
  });

  it('should have empty eliminatedThisRound array', () => {
    const state = createInitialState();
    expect(state.eliminatedThisRound).toEqual([]);
  });
});

describe('TEAM_ADDED event', () => {
  it('should add team in setup phase with score 0 and lockedIn false', () => {
    const state = createInitialState();

    const newState = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });

    expect(newState.teams).toHaveLength(1);
    expect(newState.teams[0]).toEqual({
      id: 'team1',
      name: 'Red Team',
      score: 0,
      lockedIn: false,
    });
  });

  it('should add multiple teams', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });

    expect(state.teams).toHaveLength(2);
    expect(state.teams[0].id).toBe('team1');
    expect(state.teams[1].id).toBe('team2');
  });

  it('should ignore duplicate team IDs', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Different Name' },
    });

    expect(state.teams).toHaveLength(1);
    expect(state.teams[0].name).toBe('Red Team');
  });

  it('should be ignored in armed phase', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });

    const newState = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team3', name: 'Green Team' },
    });

    expect(newState.teams).toHaveLength(2);
    expect(newState).toBe(state);
  });
});

describe('BUZZ event in setup phase', () => {
  it('should lock in existing team', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });

    const newState = reducer(state, { type: 'BUZZ', teamId: 'team1' });

    expect(newState.teams[0].lockedIn).toBe(true);
  });

  it('should ignore buzz for non-existent team', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });

    const newState = reducer(state, { type: 'BUZZ', teamId: 'nonexistent' });

    expect(newState).toBe(state);
    expect(newState.teams[0].lockedIn).toBe(false);
  });

  it('should toggle locked-in team back to unlocked', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    expect(state.teams[0].lockedIn).toBe(true);

    const newState = reducer(state, { type: 'BUZZ', teamId: 'team1' });

    expect(newState.teams[0].lockedIn).toBe(false);
  });

  it('should toggle lock-in: off → on → off → on', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    expect(state.teams[0].lockedIn).toBe(false);

    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    expect(state.teams[0].lockedIn).toBe(true);

    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    expect(state.teams[0].lockedIn).toBe(false);

    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    expect(state.teams[0].lockedIn).toBe(true);
  });

  it('should not change phase when locking in', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });

    const newState = reducer(state, { type: 'BUZZ', teamId: 'team1' });

    expect(newState.phase).toBe('setup');
  });
});

describe('START_GAME event', () => {
  it('should transition from setup directly to armed when 2+ teams are locked in', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState.phase).toBe('armed');
  });

  it('should be rejected when no teams are locked in', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    // Team added but not locked in

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('setup');
  });

  it('should be rejected with no teams at all', () => {
    const state = createInitialState();

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('setup');
  });

  it('should be rejected when only one team is locked in', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('setup');
  });

  it('should preserve teams when transitioning', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState.teams).toHaveLength(2);
  });

  it('should be ignored in armed phase', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('armed');
  });

  it('should be ignored in locked phase', () => {
    const state = setupLockedState();

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('locked');
  });

  it('should be ignored in resolved phase', () => {
    const state = setupResolvedState();

    const newState = reducer(state, { type: 'START_GAME' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('resolved');
  });
});

describe('BUZZ event in armed phase', () => {
  it('should transition to locked with activeTeamId on first buzz', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });

    const newState = reducer(state, { type: 'BUZZ', teamId: 'team1' });

    expect(newState.phase).toBe('locked');
    expect(newState.activeTeamId).toBe('team1');
  });

  it('should ignore buzz for non-existent team', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });

    const newState = reducer(state, { type: 'BUZZ', teamId: 'nonexistent' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('armed');
  });

  it('should ignore buzz from non-locked-in team', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team3', name: 'Green Team' },
    });
    // Only lock in team1 and team2, not team3
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });
    expect(state.phase).toBe('armed');

    // team3 exists but is not locked in — buzz should be rejected
    const newState = reducer(state, { type: 'BUZZ', teamId: 'team3' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('armed');
  });

  it('should ignore buzz for eliminated team', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });

    // Team1 buzzes and gets it wrong
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });

    // State should be armed, team1 eliminated
    expect(state.phase).toBe('armed');
    expect(state.eliminatedThisRound).toContain('team1');

    // Team1 tries to buzz again - should be ignored
    const newState = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    expect(newState).toBe(state);
    expect(newState.phase).toBe('armed');
  });

  it('should be ignored in locked phase', () => {
    const state = setupLockedState();

    const newState = reducer(state, { type: 'BUZZ', teamId: 'team2' });

    expect(newState).toBe(state);
    expect(newState.activeTeamId).toBe('team1');
  });

  it('should be ignored in resolved phase', () => {
    const state = setupResolvedState();

    const newState = reducer(state, { type: 'BUZZ', teamId: 'team1' });

    expect(newState).toBe(state);
    expect(newState.phase).toBe('resolved');
  });
});

describe('ANSWER_MARKED event', () => {
  it('should increment score for correct answer', () => {
    const state = setupLockedState();

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: true });

    const team = newState.teams.find((t) => t.id === 'team1');
    expect(team?.score).toBe(1);
  });

  it('should not change score for wrong answer', () => {
    const state = setupLockedState();

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: false });

    const team = newState.teams.find((t) => t.id === 'team1');
    expect(team?.score).toBe(0);
  });

  it('should transition to resolved phase on correct answer', () => {
    const state = setupLockedState();

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: true });

    expect(newState.phase).toBe('resolved');
  });

  it('should clear activeTeamId after marking correct', () => {
    const state = setupLockedState();

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: true });

    expect(newState.activeTeamId).toBeNull();
  });

  it('should re-arm when wrong answer and other teams remain', () => {
    const state = setupLockedState();

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: false });

    expect(newState.phase).toBe('armed');
    expect(newState.activeTeamId).toBeNull();
    expect(newState.eliminatedThisRound).toContain('team1');
  });

  it('should resolve when wrong answer and all teams eliminated', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });

    // team1 buzzes and gets it wrong
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('armed');

    // team2 buzzes and gets it wrong — all eliminated
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: false });

    expect(newState.phase).toBe('resolved');
    expect(newState.eliminatedThisRound).toContain('team1');
    expect(newState.eliminatedThisRound).toContain('team2');
  });

  it('should be ignored in setup phase', () => {
    const state = createInitialState();

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: true });

    expect(newState).toBe(state);
  });

  it('should be ignored in armed phase', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });
    expect(state.phase).toBe('armed');

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: true });

    expect(newState).toBe(state);
  });

  it('should be ignored in resolved phase', () => {
    const state = setupResolvedState();

    const newState = reducer(state, { type: 'ANSWER_MARKED', correct: true });

    expect(newState).toBe(state);
  });
});

describe('NEXT_ROUND event', () => {
  it('should transition from resolved to armed', () => {
    const state = setupResolvedState();

    const newState = reducer(state, { type: 'NEXT_ROUND' });

    expect(newState.phase).toBe('armed');
  });

  it('should preserve scores when transitioning', () => {
    let state = setupLockedState();
    state = reducer(state, { type: 'ANSWER_MARKED', correct: true });

    const newState = reducer(state, { type: 'NEXT_ROUND' });

    const team = newState.teams.find((t) => t.id === 'team1');
    expect(team?.score).toBe(1);
  });

  it('should clear eliminatedThisRound', () => {
    const state = setupResolvedState();
    expect(state.eliminatedThisRound).toContain('team1');

    const newState = reducer(state, { type: 'NEXT_ROUND' });

    expect(newState.eliminatedThisRound).toEqual([]);
  });

  it('should be ignored in setup phase', () => {
    const state = createInitialState();

    const newState = reducer(state, { type: 'NEXT_ROUND' });

    expect(newState).toBe(state);
  });

  it('should work in armed phase (skip question)', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });
    expect(state.phase).toBe('armed');

    const newState = reducer(state, { type: 'NEXT_ROUND' });

    expect(newState.phase).toBe('armed');
    expect(newState.eliminatedThisRound).toEqual([]);
  });

  it('should work in locked phase (skip question)', () => {
    const state = setupLockedState();
    expect(state.phase).toBe('locked');
    expect(state.activeTeamId).toBe('team1');

    const newState = reducer(state, { type: 'NEXT_ROUND' });

    expect(newState.phase).toBe('armed');
    expect(newState.activeTeamId).toBeNull();
    expect(newState.eliminatedThisRound).toEqual([]);
  });

  it('should clear eliminations when skipping from armed phase', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team1', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team2', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
    state = reducer(state, { type: 'START_GAME' });

    // Team1 buzzes and gets it wrong
    state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('armed');
    expect(state.eliminatedThisRound).toContain('team1');

    // Host skips the question
    const newState = reducer(state, { type: 'NEXT_ROUND' });

    expect(newState.phase).toBe('armed');
    expect(newState.eliminatedThisRound).toEqual([]);
  });
});

describe('Elimination flow integration', () => {
  it('should allow multiple wrong answers before resolving', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'red', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'blue', name: 'Blue Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'green', name: 'Green Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'BUZZ', teamId: 'green' });
    state = reducer(state, { type: 'START_GAME' });

    // Red buzzes first, wrong
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('armed');
    expect(state.eliminatedThisRound).toEqual(['red']);

    // Blue buzzes, wrong
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('armed');
    expect(state.eliminatedThisRound).toEqual(['red', 'blue']);

    // Green buzzes, correct!
    state = reducer(state, { type: 'BUZZ', teamId: 'green' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: true });
    expect(state.phase).toBe('resolved');
    expect(state.teams.find((t) => t.id === 'green')?.score).toBe(1);
  });

  it('should resolve when all teams get it wrong', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'red', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'blue', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'START_GAME' });

    // Red wrong
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('armed');

    // Blue wrong - all eliminated
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('resolved');
    expect(state.eliminatedThisRound).toEqual(['red', 'blue']);

    // Next round clears eliminations
    state = reducer(state, { type: 'NEXT_ROUND' });
    expect(state.eliminatedThisRound).toEqual([]);
  });
});

describe('Full game flow integration', () => {
  it('should complete a full game cycle with auto-arm', () => {
    // Setup phase: add teams
    let state = createInitialState();
    expect(state.phase).toBe('setup');

    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'red', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'blue', name: 'Blue Team' },
    });
    expect(state.teams).toHaveLength(2);

    // Lock in teams
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    expect(state.teams.every((t) => t.lockedIn)).toBe(true);

    // Start game - goes directly to armed
    state = reducer(state, { type: 'START_GAME' });
    expect(state.phase).toBe('armed');

    // Round 1: Red team buzzes and gets it right
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    expect(state.phase).toBe('locked');
    expect(state.activeTeamId).toBe('red');

    state = reducer(state, { type: 'ANSWER_MARKED', correct: true });
    expect(state.phase).toBe('resolved');
    expect(state.activeTeamId).toBeNull();
    expect(state.teams.find((t) => t.id === 'red')?.score).toBe(1);

    // Next round - auto-arms
    state = reducer(state, { type: 'NEXT_ROUND' });
    expect(state.phase).toBe('armed');

    // Round 2: Blue team buzzes and gets it wrong, red gets it
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('armed');
    expect(state.eliminatedThisRound).toContain('blue');

    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: true });
    expect(state.teams.find((t) => t.id === 'red')?.score).toBe(2);

    // Next round - eliminations cleared
    state = reducer(state, { type: 'NEXT_ROUND' });
    expect(state.eliminatedThisRound).toEqual([]);

    // Round 3: Both wrong, no points
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
    expect(state.phase).toBe('resolved');

    // Final scores
    expect(state.teams.find((t) => t.id === 'red')?.score).toBe(2);
    expect(state.teams.find((t) => t.id === 'blue')?.score).toBe(0);
  });

  it('should handle race conditions (only first buzz wins)', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'red', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'blue', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'START_GAME' });

    // Red buzzes first
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    expect(state.activeTeamId).toBe('red');

    // Blue tries to buzz but it's ignored (already locked)
    const stateAfterSecondBuzz = reducer(state, {
      type: 'BUZZ',
      teamId: 'blue',
    });
    expect(stateAfterSecondBuzz.activeTeamId).toBe('red');
    expect(stateAfterSecondBuzz).toBe(state);
  });
});

describe('RESET event', () => {
  it('should return to initial state from any phase', () => {
    // Build up some state
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'red', name: 'Red Team' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'blue', name: 'Blue Team' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'BUZZ', teamId: 'blue' });
    state = reducer(state, { type: 'START_GAME' });
    state = reducer(state, { type: 'BUZZ', teamId: 'red' });
    state = reducer(state, { type: 'ANSWER_MARKED', correct: true });
    expect(state.phase).toBe('resolved');
    expect(state.teams.length).toBeGreaterThan(0);
    expect(state.teams[0].score).toBe(1);

    // Reset
    const newState = reducer(state, { type: 'RESET' });

    expect(newState.phase).toBe('setup');
    expect(newState.teams).toEqual([]);
    expect(newState.activeTeamId).toBeNull();
    expect(newState.eliminatedThisRound).toEqual([]);
  });

  it('should allow adding teams again after reset', () => {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'red', name: 'Red Team' },
    });
    state = reducer(state, { type: 'RESET' });
    expect(state.teams).toEqual([]);

    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'blue', name: 'Blue Team' },
    });

    expect(state.teams).toHaveLength(1);
    expect(state.teams[0].id).toBe('blue');
  });
});

// Helper functions to create states at specific phases

function setupLockedState(): BuzzerState {
  let state = createInitialState();
  state = reducer(state, {
    type: 'TEAM_ADDED',
    team: { id: 'team1', name: 'Red Team' },
  });
  state = reducer(state, {
    type: 'TEAM_ADDED',
    team: { id: 'team2', name: 'Blue Team' },
  });
  state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
  state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
  state = reducer(state, { type: 'START_GAME' });
  state = reducer(state, { type: 'BUZZ', teamId: 'team1' });
  return state;
}

function setupResolvedState(): BuzzerState {
  let state = setupLockedState();
  state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
  // With two teams, one wrong goes to armed, then second wrong goes to resolved
  state = reducer(state, { type: 'BUZZ', teamId: 'team2' });
  state = reducer(state, { type: 'ANSWER_MARKED', correct: false });
  return state;
}

describe('SCORE_ADJUSTED', () => {
  function setupTwoTeamsInArmed(): BuzzerState {
    let state = createInitialState();
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team-1', name: 'Red' },
    });
    state = reducer(state, {
      type: 'TEAM_ADDED',
      team: { id: 'team-2', name: 'Blue' },
    });
    state = reducer(state, { type: 'BUZZ', teamId: 'team-1' });
    state = reducer(state, { type: 'BUZZ', teamId: 'team-2' });
    state = reducer(state, { type: 'START_GAME' });
    return state;
  }

  it('increments the named team by 1 when delta is +1', () => {
    const state = setupTwoTeamsInArmed();
    const next = reducer(state, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-1',
      delta: 1,
    });
    expect(next.teams.find((t) => t.id === 'team-1')?.score).toBe(1);
    expect(next.teams.find((t) => t.id === 'team-2')?.score).toBe(0);
  });

  it('decrements the named team by 1 when delta is -1', () => {
    const state = setupTwoTeamsInArmed();
    const next = reducer(state, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-1',
      delta: -1,
    });
    expect(next.teams.find((t) => t.id === 'team-1')?.score).toBe(-1);
  });

  it('allows negative scores (no floor)', () => {
    let state = setupTwoTeamsInArmed();
    state = reducer(state, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-1',
      delta: -1,
    });
    state = reducer(state, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-1',
      delta: -1,
    });
    state = reducer(state, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-1',
      delta: -1,
    });
    expect(state.teams.find((t) => t.id === 'team-1')?.score).toBe(-3);
  });

  it('is a no-op for an unknown team id', () => {
    const state = setupTwoTeamsInArmed();
    const next = reducer(state, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-99',
      delta: 1,
    });
    expect(next).toBe(state);
  });

  it('applies in every phase (setup, armed, locked, resolved)', () => {
    let s1 = createInitialState();
    s1 = reducer(s1, {
      type: 'TEAM_ADDED',
      team: { id: 'team-1', name: 'Red' },
    });
    s1 = reducer(s1, { type: 'SCORE_ADJUSTED', teamId: 'team-1', delta: 1 });
    expect(s1.teams[0].score).toBe(1);

    const s2 = setupTwoTeamsInArmed();
    expect(s2.phase).toBe('armed');
    const s2b = reducer(s2, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-1',
      delta: 1,
    });
    expect(s2b.teams[0].score).toBe(1);

    const s3 = reducer(s2, { type: 'BUZZ', teamId: 'team-1' });
    expect(s3.phase).toBe('locked');
    const s3b = reducer(s3, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-2',
      delta: 1,
    });
    expect(s3b.teams[1].score).toBe(1);

    const s4 = reducer(s3, { type: 'ANSWER_MARKED', correct: true });
    expect(s4.phase).toBe('resolved');
    const s4b = reducer(s4, {
      type: 'SCORE_ADJUSTED',
      teamId: 'team-2',
      delta: 1,
    });
    expect(s4b.teams[1].score).toBe(1);
  });
});
