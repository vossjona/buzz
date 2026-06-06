// ABOUTME: Type definitions for the team-based buzzer game engine.
// ABOUTME: Defines game phases, team state, and event types for the reducer pattern.

/**
 * Game phases for the buzzer game flow.
 * setup → armed → locked → resolved (auto-arms after each round)
 */
export type BuzzerPhase = 'setup' | 'armed' | 'locked' | 'resolved';

/**
 * Represents a team in the buzzer game.
 */
export interface Team {
  /** Unique identifier for the team */
  id: string;
  /** Display name of the team */
  name: string;
  /** Current score */
  score: number;
  /** Whether the team has locked in during setup phase */
  lockedIn: boolean;
}

/**
 * Complete state of the buzzer game.
 */
export interface BuzzerState {
  /** Current game phase */
  phase: BuzzerPhase;
  /** All teams in the game */
  teams: Team[];
  /** ID of the team that buzzed in (only set during 'locked' phase) */
  activeTeamId: string | null;
  /** Team IDs eliminated from the current round (wrong answers) */
  eliminatedThisRound: string[];
}

/**
 * All possible events that can be dispatched to the reducer.
 * Invalid events in wrong phases are silently ignored.
 */
export type BuzzerEvent =
  | { type: 'BUZZ'; teamId: string }
  | { type: 'TEAM_ADDED'; team: { id: string; name: string } }
  | { type: 'START_GAME' }
  | { type: 'ANSWER_MARKED'; correct: boolean }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET' }
  | { type: 'SCORE_ADJUSTED'; teamId: string; delta: -1 | 1 };
