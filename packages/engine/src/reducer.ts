// ABOUTME: Pure reducer implementation for the team-based buzzer game engine.
// ABOUTME: Handles all state transitions via (state, event) → newState pattern.

import type { BuzzerState, BuzzerEvent, Team } from './types.js';

/**
 * Creates the initial game state.
 * Starts in 'setup' phase with no teams.
 */
export function createInitialState(): BuzzerState {
  return {
    phase: 'setup',
    teams: [],
    activeTeamId: null,
    eliminatedThisRound: [],
  };
}

/**
 * Pure reducer function for the buzzer game.
 * Returns a new state based on the current state and event.
 * Invalid events in wrong phases are silently ignored (return current state).
 */
export function reducer(state: BuzzerState, event: BuzzerEvent): BuzzerState {
  switch (event.type) {
    case 'TEAM_ADDED':
      return handleTeamAdded(state, event.team);

    case 'BUZZ':
      return handleBuzz(state, event.teamId);

    case 'START_GAME':
      return handleStartGame(state);

    case 'ANSWER_MARKED':
      return handleAnswerMarked(state, event.correct);

    case 'NEXT_ROUND':
      return handleNextRound(state);

    case 'RESET':
      return createInitialState();

    case 'SCORE_ADJUSTED':
      return handleScoreAdjusted(state, event.teamId, event.delta);

    default:
      return state;
  }
}

/**
 * Handles TEAM_ADDED event.
 * Only valid in 'setup' phase.
 */
function handleTeamAdded(
  state: BuzzerState,
  team: { id: string; name: string }
): BuzzerState {
  if (state.phase !== 'setup') {
    return state;
  }

  // Check if team with this ID already exists
  if (state.teams.some((t) => t.id === team.id)) {
    return state;
  }

  const newTeam: Team = {
    id: team.id,
    name: team.name,
    score: 0,
    lockedIn: false,
  };

  return {
    ...state,
    teams: [...state.teams, newTeam],
  };
}

/**
 * Handles BUZZ event.
 * - In 'setup': Locks in the team (sets lockedIn: true)
 * - In 'armed': First buzz wins, transitions to 'locked'
 * - Other phases: Ignored
 */
function handleBuzz(state: BuzzerState, teamId: string): BuzzerState {
  if (state.phase === 'setup') {
    return handleBuzzInSetup(state, teamId);
  }

  if (state.phase === 'armed') {
    return handleBuzzInArmed(state, teamId);
  }

  // All other phases: ignore
  return state;
}

/**
 * Handles buzz during setup phase - toggles team lock-in state.
 */
function handleBuzzInSetup(state: BuzzerState, teamId: string): BuzzerState {
  const teamIndex = state.teams.findIndex((t) => t.id === teamId);

  // Team doesn't exist
  if (teamIndex === -1) {
    return state;
  }

  // Toggle lockedIn instead of one-way lock
  const updatedTeams = state.teams.map((t, index) =>
    index === teamIndex ? { ...t, lockedIn: !t.lockedIn } : t
  );

  return {
    ...state,
    teams: updatedTeams,
  };
}

/**
 * Handles buzz during armed phase - first non-eliminated buzz wins.
 */
function handleBuzzInArmed(state: BuzzerState, teamId: string): BuzzerState {
  // Verify team exists and is a participating (locked-in) team
  const team = state.teams.find((t) => t.id === teamId);

  if (!team || !team.lockedIn) {
    return state;
  }

  // Reject buzz if team is eliminated this round
  if (state.eliminatedThisRound.includes(teamId)) {
    return state;
  }

  return {
    ...state,
    phase: 'locked',
    activeTeamId: teamId,
  };
}

/**
 * Handles START_GAME event.
 * Only valid in 'setup' phase, transitions directly to 'armed'.
 * Requires at least one team to be locked in.
 */
function handleStartGame(state: BuzzerState): BuzzerState {
  if (state.phase !== 'setup') {
    return state;
  }

  // Require at least two teams locked in
  const lockedInCount = state.teams.filter((t) => t.lockedIn).length;
  if (lockedInCount < 2) {
    return state;
  }

  return {
    ...state,
    phase: 'armed',
  };
}

/**
 * Handles ANSWER_MARKED event.
 * Only valid in 'locked' phase.
 * If correct: increments score, transitions to 'resolved'.
 * If wrong: eliminates team from round. If all teams eliminated, goes to 'resolved'.
 * Otherwise re-arms for remaining teams.
 */
function handleAnswerMarked(state: BuzzerState, correct: boolean): BuzzerState {
  if (state.phase !== 'locked') {
    return state;
  }

  if (state.activeTeamId === null) {
    return state;
  }

  // Correct answer: award point and resolve
  if (correct) {
    const updatedTeams = state.teams.map((team) =>
      team.id === state.activeTeamId ? { ...team, score: team.score + 1 } : team
    );

    return {
      ...state,
      phase: 'resolved',
      teams: updatedTeams,
      activeTeamId: null,
    };
  }

  // Wrong answer: eliminate team from this round
  const newEliminatedThisRound = [
    ...state.eliminatedThisRound,
    state.activeTeamId,
  ];

  // Check if all locked-in teams are now eliminated
  const lockedInTeams = state.teams.filter((t) => t.lockedIn);
  const allEliminated = lockedInTeams.every((t) =>
    newEliminatedThisRound.includes(t.id)
  );

  if (allEliminated) {
    // All teams eliminated: resolve round (no one gets the point)
    return {
      ...state,
      phase: 'resolved',
      activeTeamId: null,
      eliminatedThisRound: newEliminatedThisRound,
    };
  }

  // Re-arm for remaining teams
  return {
    ...state,
    phase: 'armed',
    activeTeamId: null,
    eliminatedThisRound: newEliminatedThisRound,
  };
}

/**
 * Handles NEXT_ROUND event.
 * Valid in 'armed', 'locked', or 'resolved' phases - allows host to skip questions.
 * Transitions to 'armed', clears activeTeamId and eliminatedThisRound.
 */
function handleNextRound(state: BuzzerState): BuzzerState {
  if (
    state.phase !== 'armed' &&
    state.phase !== 'locked' &&
    state.phase !== 'resolved'
  ) {
    return state;
  }

  return {
    ...state,
    phase: 'armed',
    activeTeamId: null,
    eliminatedThisRound: [],
  };
}

/**
 * Handles SCORE_ADJUSTED event.
 * Applies a ±1 score delta to the named team in any phase.
 * No-op if the team id is unknown. Scores may go negative (no floor).
 */
function handleScoreAdjusted(
  state: BuzzerState,
  teamId: string,
  delta: -1 | 1
): BuzzerState {
  const index = state.teams.findIndex((t) => t.id === teamId);
  if (index === -1) {
    return state;
  }
  const updatedTeams = state.teams.map((team, i) =>
    i === index ? { ...team, score: team.score + delta } : team
  );
  return { ...state, teams: updatedTeams };
}
