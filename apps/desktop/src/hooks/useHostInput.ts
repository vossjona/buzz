// ABOUTME: Unified input handling hook for the host window.
// ABOUTME: Maps keyboard, gamepad, and USB buzzer input to game actions based on screen and phase.

import { useCallback } from 'react';
import { BuzzerState, BuzzerEvent } from '@buzz/engine';
import { useKeyboardInput } from './useKeyboardInput';
import { useGamepadInput } from './useGamepadInput';
import { useBuzzerInput } from './useBuzzerInput';
import { clampSeek } from './useSeekHandlers';
import { TEAM_CONFIGS } from '../constants/teams';
import type { Screen } from './useGameState';

interface UseHostInputOptions {
  screen: Screen;
  engineState: BuzzerState;
  dispatch: (event: BuzzerEvent) => void;
  isPlayerOpen: boolean;
  /** False while a blocking screen (e.g. Client ID entry) owns the window. */
  isEnabled: boolean;
  /** Host action callbacks — same logic also wired to on-screen buttons. */
  onMarkCorrect: () => void;
  onMarkWrong: () => void;
  onReveal: () => void;
  onNext: () => void;
  onStartGame: () => void;
  onEndGame: () => void;
  getPlaybackSnapshot: () => { positionMs: number; durationMs: number };
  seek: (positionMs: number) => Promise<void>;
}

export function useHostInput(options: UseHostInputOptions): void {
  const {
    screen,
    engineState,
    dispatch,
    isPlayerOpen,
    isEnabled,
    onMarkCorrect,
    onMarkWrong,
    onReveal,
    onNext,
    onStartGame,
    onEndGame,
    getPlaybackSnapshot,
    seek,
  } = options;

  /** Check if a team is eligible to buzz (locked in, not eliminated, phase is armed). */
  const isTeamEligibleToBuzz = useCallback(
    (teamId: string): boolean => {
      if (engineState.phase !== 'armed') return false;
      const team = engineState.teams.find((t) => t.id === teamId);
      if (!team?.lockedIn) return false;
      return !engineState.eliminatedThisRound.includes(teamId);
    },
    [engineState]
  );

  // Handle keyboard input based on current screen and phase
  const handleKeyDown = useCallback(
    async (key: string) => {
      if (!isEnabled) return;

      // Setup screen
      if (screen === 'setup') {
        const teamKey = TEAM_CONFIGS.find((t) => t.key === key);
        if (teamKey) {
          dispatch({ type: 'BUZZ', teamId: teamKey.id });
          return;
        }
        if (key === 'S') {
          onStartGame();
          return;
        }
        return;
      }

      // Game screen
      if (screen === 'game') {
        if (key === 'ESCAPE') {
          onEndGame();
          return;
        }

        if (key === 'ARROWLEFT' || key === 'ARROWRIGHT') {
          const snapshot = getPlaybackSnapshot();
          const delta = key === 'ARROWLEFT' ? -10_000 : 10_000;
          await seek(
            clampSeek(snapshot.positionMs, delta, snapshot.durationMs)
          );
          return;
        }

        const { phase } = engineState;

        if (phase === 'armed') {
          const teamKey = TEAM_CONFIGS.find((t) => t.key === key);
          if (teamKey) {
            if (isTeamEligibleToBuzz(teamKey.id)) {
              dispatch({ type: 'BUZZ', teamId: teamKey.id });
            }
            return;
          }
        }

        if (phase === 'locked') {
          if (key === 'C') {
            onMarkCorrect();
            return;
          }
          if (key === 'W') {
            onMarkWrong();
            return;
          }
        }

        if (key === 'R') {
          onReveal();
          return;
        }

        if (key === 'N') {
          onNext();
          return;
        }
        return;
      }
    },
    [
      screen,
      isEnabled,
      engineState,
      dispatch,
      onMarkCorrect,
      onMarkWrong,
      onReveal,
      onNext,
      onStartGame,
      onEndGame,
      isTeamEligibleToBuzz,
      getPlaybackSnapshot,
      seek,
    ]
  );

  // Handle gamepad/buzzer input (map device index to team)
  const handleDeviceBuzz = useCallback(
    (deviceIndex: number) => {
      if (!isEnabled) return;
      const teamConfig = TEAM_CONFIGS[deviceIndex];
      if (!teamConfig) return;

      if (screen === 'setup') {
        dispatch({ type: 'BUZZ', teamId: teamConfig.id });
        return;
      }

      if (screen === 'game' && isTeamEligibleToBuzz(teamConfig.id)) {
        dispatch({ type: 'BUZZ', teamId: teamConfig.id });
      }
    },
    [screen, isEnabled, dispatch, isTeamEligibleToBuzz]
  );

  // USB buzzers are gated on the Player view being open during gameplay so
  // contestants can't buzz when nothing is being shown to them. Setup-screen
  // arming presses must always work, since pairing happens before the Player
  // view is opened.
  const handleBuzzerPress = useCallback(
    (deviceIndex: number) => {
      if (screen === 'game' && !isPlayerOpen) return;
      handleDeviceBuzz(deviceIndex);
    },
    [screen, isPlayerOpen, handleDeviceBuzz]
  );

  useKeyboardInput(handleKeyDown);
  useGamepadInput(handleDeviceBuzz);
  useBuzzerInput(handleBuzzerPress);
}
