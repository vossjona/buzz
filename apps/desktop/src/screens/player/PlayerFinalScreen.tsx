// ABOUTME: Player-side final screen with confetti, bar chart, and song history.
// ABOUTME: Display-only view without restart prompt.

import { useMemo } from 'react';
import { Team } from '@buzz/engine';
import { RoundResult } from '../../hooks/useGameState';
import { Confetti } from '../../components/Confetti';
import { ScoreBarChart } from '../../components/ScoreBarChart';
import { SongHistoryTable } from '../../components/SongHistoryTable';
import { getLockedInTeams, getWinnerTeamIds } from '../../utils/teamUtils';

interface PlayerFinalScreenProps {
  teams: Team[];
  roundResults: RoundResult[];
}

export function PlayerFinalScreen({
  teams,
  roundResults,
}: PlayerFinalScreenProps) {
  const lockedInTeams = getLockedInTeams(teams);
  const winnerIds = useMemo(() => getWinnerTeamIds(teams), [teams]);

  return (
    <div className="screen finalScreen">
      <Confetti winnerTeamIds={winnerIds} />
      <h1 className="screenTitle">Game Over!</h1>

      <div className="finalContent">
        <div className="finalLeft">
          <ScoreBarChart teams={teams} />
        </div>
        <div className="finalRight">
          <SongHistoryTable roundResults={roundResults} teams={lockedInTeams} />
        </div>
      </div>
    </div>
  );
}
