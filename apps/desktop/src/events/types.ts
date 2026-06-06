// ABOUTME: Type definitions for Tauri IPC events between Host and Player windows.
// ABOUTME: Defines the payload structure for game state synchronization.

import { BuzzerState } from '@buzz/engine';
import { Screen, AnswerResult, RoundResult } from '../hooks/useGameState';

/**
 * Spotify display state for Player window.
 * Only includes info safe to show players (no song title/artist).
 */
export interface SpotifyDisplayState {
  /** Album art URL (only shown after isRevealed is true) */
  albumArtUrl: string | null;
  /** Whether music is currently playing */
  isPlaying: boolean;
  /** Current track number (1-indexed) */
  trackNumber: number;
  /** Total tracks in playlist */
  totalTracks: number;
  /** Whether the answer has been revealed (correct answer given) */
  isRevealed: boolean;
  /** Song title (shown to players only when revealed) */
  trackName: string | null;
  /** Artist names (shown to players only when revealed) */
  trackArtists: string[];
  /** Set of revealed atom ids (empty if nothing is revealed yet). */
  revealedAtoms: string[];
  /** Release year as a 4-char string, or null if missing. */
  releaseYear: string | null;
  /** Album name (always populated in Spotify mode). */
  albumName: string | null;
}

/**
 * Answer countdown state for syncing pulse animation intensity.
 */
export interface CountdownState {
  /** Progress ratio from 1.0 (full time) to 0.0 (expired) */
  progress: number;
  /** Whether the countdown is currently running */
  isRunning: boolean;
}

/**
 * Which 3-step intro overlay is currently showing.
 * - `gameStart`: "Ready", "Set", "Go!" before the first question
 * - `answerCountdown`: "3", "2", "1" during the final 3 seconds of the answer countdown
 */
export type IntroKind = 'gameStart' | 'answerCountdown';

/**
 * Sequenced overlay state synced between Host and Player.
 * `step` indexes into the 3-element steps array on the receiver.
 */
export interface IntroState {
  kind: IntroKind;
  step: 0 | 1 | 2;
}

/**
 * Payload sent from Host to Player window on state changes.
 */
export interface GameStateSyncPayload {
  engineState: BuzzerState;
  screen: Screen;
  lastAnswerResult: AnswerResult | null;
  /** Spotify display state for the Player window */
  spotify: SpotifyDisplayState;
  /** Answer countdown state (for pulse animation intensity) */
  countdown?: CountdownState;
  /** Per-round results for song history table */
  roundResults: RoundResult[];
  /** Active 3-step intro overlay (Ready-Set-Go or 3-2-1), or null when none. */
  intro?: IntroState | null;
}

/**
 * Event names for Tauri IPC communication.
 */
export const EVENTS = {
  /** Host -> Player: Full state sync */
  GAME_STATE_SYNC: 'game:state-sync',
  /** Player -> Host: Player window is ready to receive events */
  PLAYER_READY: 'player:ready',
} as const;
