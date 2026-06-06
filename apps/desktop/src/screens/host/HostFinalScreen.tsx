// ABOUTME: Host-side final screen with confetti, bar chart, and song history.
// ABOUTME: Allows host to close player view and start a new game.

import { useMemo } from 'react';
import { Team } from '@buzz/engine';
import { RoundResult } from '../../hooks/useGameState';
import { Confetti } from '../../components/Confetti';
import { ScoreBarChart } from '../../components/ScoreBarChart';
import { SongHistoryTable } from '../../components/SongHistoryTable';
import { getLockedInTeams, getWinnerTeamIds } from '../../utils/teamUtils';
import styles from './HostFinalScreen.module.css';

interface HostFinalScreenProps {
  teams: Team[];
  roundResults: RoundResult[];
  isPlayerOpen: boolean;
  onClosePlayer: () => void;
  onResetGame: () => void;
}

export function HostFinalScreen({
  teams,
  roundResults,
  isPlayerOpen,
  onClosePlayer,
  onResetGame,
}: HostFinalScreenProps) {
  const lockedInTeams = getLockedInTeams(teams);
  const winnerIds = useMemo(() => getWinnerTeamIds(teams), [teams]);

  return (
    <div className={styles.hostFinalScreen}>
      <Confetti winnerTeamIds={winnerIds} />
      <h1 className="hostTitle">Game Over!</h1>

      <div className="finalContent">
        <div className="finalLeft">
          <ScoreBarChart teams={teams} />
          <div className={styles.hostFinalControls}>
            {isPlayerOpen && (
              <button className="hostButton secondary" onClick={onClosePlayer}>
                Close Player View
              </button>
            )}
            <button className="hostButton primary" onClick={onResetGame}>
              Play Again
            </button>
          </div>
        </div>
        <div className="finalRight">
          <SongHistoryTable roundResults={roundResults} teams={lockedInTeams} />
        </div>
      </div>
    </div>
  );
}
