// ABOUTME: Combined state hook for the buzzer game.
// ABOUTME: Manages engine state (via reducer) and UI state (current screen, per-round results).

import { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import {
  createInitialState,
  reducer,
  BuzzerState,
  BuzzerEvent,
} from '@buzz/engine';
import { TEAM_CONFIGS } from '../constants/teams';
import { getLockedInTeams } from '../utils/teamUtils';

export type Screen = 'setup' | 'game' | 'final';

export interface AnswerResult {
  teamId: string;
  correct: boolean;
  timestamp: number;
}

/** Tracks the outcome of a single round for the song history table. */
export interface RoundResult {
  songTitle: string;
  artistName: string;
  /** Team that answered correctly, or null if nobody got it */
  correctTeamId: string | null;
  /** Teams that buzzed and answered wrong */
  wrongTeamIds: string[];
  /** Teams that never buzzed */
  noAnswerTeamIds: string[];
}

export interface GameState {
  engineState: BuzzerState;
  screen: Screen;
  lastAnswerResult: AnswerResult | null;
  roundResults: RoundResult[];
}

export interface GameActions {
  dispatch: (event: BuzzerEvent) => void;
  setScreen: (screen: Screen) => void;
  resetGame: () => void;
  recordRoundResult: (songTitle: string, artistName: string) => void;
}

export function useGameState(): GameState & GameActions {
  const [engineState, rawDispatch] = useReducer(
    reducer,
    undefined,
    createInitialState
  );
  const [screen, setScreen] = useState<Screen>('setup');
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(
    null
  );
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  // Ref to access latest engine state inside recordRoundResult without stale closures
  const engineStateRef = useRef(engineState);
  engineStateRef.current = engineState;
  // Track the team that answered correctly this round (reducer clears activeTeamId on resolve)
  const correctTeamThisRoundRef = useRef<string | null>(null);

  // Pre-add all 4 teams on mount
  useEffect(() => {
    TEAM_CONFIGS.forEach((config) => {
      rawDispatch({
        type: 'TEAM_ADDED',
        team: { id: config.id, name: config.name },
      });
    });
  }, []);

  // Wrapped dispatch to capture answer results for animations
  const dispatch = useCallback(
    (event: BuzzerEvent) => {
      if (event.type === 'ANSWER_MARKED' && engineState.activeTeamId) {
        setLastAnswerResult({
          teamId: engineState.activeTeamId,
          correct: event.correct,
          timestamp: Date.now(),
        });
        // Save correct team before reducer clears activeTeamId
        if (event.correct) {
          correctTeamThisRoundRef.current = engineState.activeTeamId;
        }
      }
      // Clear per-round tracking on next round
      if (event.type === 'NEXT_ROUND') {
        setLastAnswerResult(null);
        correctTeamThisRoundRef.current = null;
      }
      rawDispatch(event);
    },
    [engineState.activeTeamId]
  );

  // Auto-clear lastAnswerResult after animation completes
  useEffect(() => {
    if (lastAnswerResult) {
      const timer = setTimeout(() => {
        setLastAnswerResult(null);
      }, 600); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [lastAnswerResult]);

  const recordRoundResult = useCallback(
    (songTitle: string, artistName: string): void => {
      const state = engineStateRef.current;
      const lockedInTeams = getLockedInTeams(state.teams);

      // Use the ref captured before the reducer cleared activeTeamId
      const correctTeamId = correctTeamThisRoundRef.current;

      // wrongTeamIds = teams eliminated this round
      const wrongTeamIds = [...state.eliminatedThisRound];

      // noAnswerTeamIds = locked-in teams that didn't buzz (not correct, not wrong)
      const noAnswerTeamIds = lockedInTeams
        .filter((t) => t.id !== correctTeamId && !wrongTeamIds.includes(t.id))
        .map((t) => t.id);

      setRoundResults((prev) => [
        ...prev,
        {
          songTitle,
          artistName,
          correctTeamId,
          wrongTeamIds,
          noAnswerTeamIds,
        },
      ]);
    },
    []
  );

  const resetGame = useCallback((): void => {
    // Reset engine state
    rawDispatch({ type: 'RESET' });
    // Re-add all teams (RESET creates empty teams array)
    TEAM_CONFIGS.forEach((config) => {
      rawDispatch({
        type: 'TEAM_ADDED',
        team: { id: config.id, name: config.name },
      });
    });
    // Reset UI state
    setScreen('setup');
    setLastAnswerResult(null);
    setRoundResults([]);
    correctTeamThisRoundRef.current = null;
  }, []);

  return {
    engineState,
    screen,
    lastAnswerResult,
    roundResults,
    dispatch,
    setScreen,
    resetGame,
    recordRoundResult,
  };
}
