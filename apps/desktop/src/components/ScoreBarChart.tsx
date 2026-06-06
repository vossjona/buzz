// ABOUTME: Horizontal bar chart showing final scores for each team.
// ABOUTME: Used on all 3 final screen variants with winner highlight.

import { Team } from '@buzz/engine';
import { getTeamConfig } from '../constants/teams';
import { getLockedInTeams, getWinnerTeamIds } from '../utils/teamUtils';
import styles from './ScoreBarChart.module.css';

interface ScoreBarChartProps {
  teams: Team[];
}

export function ScoreBarChart({ teams }: ScoreBarChartProps) {
  const sortedTeams = [...getLockedInTeams(teams)].sort(
    (a, b) => b.score - a.score
  );

  const maxScore = sortedTeams[0]?.score ?? 1;
  const winnerIds = getWinnerTeamIds(teams);

  return (
    <div className={styles.scoreBarChart}>
      {sortedTeams.map((team) => {
        const config = getTeamConfig(team.id);
        if (!config) return null;
        const widthPercent = maxScore > 0 ? (team.score / maxScore) * 100 : 0;
        const isWinner = winnerIds.includes(team.id);

        return (
          <div
            key={team.id}
            className={`${styles.scoreBarRow}${isWinner ? ` ${styles.winner}` : ''}`}
            style={{ '--team-color': config.color } as React.CSSProperties}
          >
            <span className={styles.scoreBarName}>
              {isWinner && <span className={styles.winnerStar}>★</span>}
              {config.name}
            </span>
            <div className={styles.scoreBarTrack}>
              <div
                className={styles.scoreBarFill}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className={styles.scoreBarValue}>{team.score}</span>
          </div>
        );
      })}
    </div>
  );
}
