// ABOUTME: Host-side team row with score and ±1 adjustment buttons.
// ABOUTME: Dispatches SCORE_ADJUSTED events via the onAdjust callback.

import type { Team } from '@buzz/engine';
import type { CSSProperties } from 'react';
import { getTeamConfig } from '../constants/teams';
import styles from './TeamScoreRow.module.css';

interface TeamScoreRowProps {
  team: Team;
  isActive: boolean;
  onAdjust: (delta: -1 | 1) => void;
}

export function TeamScoreRow({ team, isActive, onAdjust }: TeamScoreRowProps) {
  const config = getTeamConfig(team.id);
  if (!config) return null;

  return (
    <div
      className={`${styles.row} ${isActive ? styles.active : ''}`}
      style={{ '--team-color': config.color } as CSSProperties}
    >
      <span className={styles.name}>{config.name}</span>
      <span className={styles.score}>{team.score}</span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onAdjust(-1)}
        aria-label={`Subtract 1 from ${config.name}`}
      >
        −
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onAdjust(1)}
        aria-label={`Add 1 to ${config.name}`}
      >
        +
      </button>
    </div>
  );
}
