// ABOUTME: Table showing per-round results with correct/wrong/no-answer indicators.
// ABOUTME: Used on all 3 final screen variants to show game history.

import { Team } from '@buzz/engine';
import { getTeamConfig } from '../constants/teams';
import { RoundResult } from '../hooks/useGameState';
import styles from './SongHistoryTable.module.css';

interface SongHistoryTableProps {
  roundResults: RoundResult[];
  teams: Team[];
}

export function SongHistoryTable({
  roundResults,
  teams,
}: SongHistoryTableProps) {
  if (roundResults.length === 0) {
    return null;
  }

  return (
    <div className={styles.songHistoryTableContainer}>
      <table className={styles.songHistoryTable}>
        <thead>
          <tr>
            <th className={styles.colNumberHeader}>#</th>
            <th className={styles.colSongHeader}>Song</th>
            {teams.map((team) => {
              const config = getTeamConfig(team.id);
              return (
                <th
                  key={team.id}
                  className={styles.colTeamHeader}
                  style={
                    { '--team-color': config?.color } as React.CSSProperties
                  }
                >
                  {config?.name.replace('Team ', '') ?? team.id}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {roundResults.map((result, index) => {
            const label = result.artistName
              ? `${result.songTitle} – ${result.artistName}`
              : result.songTitle;

            return (
              <tr key={index}>
                <td className={styles.colNumber}>{index + 1}</td>
                <td className={styles.colSong}>{label}</td>
                {teams.map((team) => {
                  let className = styles.colTeam + ' ';
                  let symbol: string;

                  if (team.id === result.correctTeamId) {
                    className += styles.correct;
                    symbol = '✓';
                  } else if (result.wrongTeamIds.includes(team.id)) {
                    className += styles.wrong;
                    symbol = '✗';
                  } else {
                    className += styles.noAnswer;
                    symbol = '—';
                  }

                  return (
                    <td key={team.id} className={className}>
                      {symbol}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
