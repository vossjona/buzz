// ABOUTME: Player-side setup screen showing team lock-in with 4-quarter layout.
// ABOUTME: Display-only view of teams locking in, no keyboard hints.

import { BuzzerState } from '@buzz/engine';
import { TEAM_CONFIGS } from '../../constants/teams';
import styles from './PlayerSetupScreen.module.css';

interface PlayerSetupScreenProps {
  engineState: BuzzerState;
}

const QUARTER_POSITIONS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

export function PlayerSetupScreen({ engineState }: PlayerSetupScreenProps) {
  return (
    <div className={styles.setupScreenFull}>
      {/* Four team quarters */}
      <div className={styles.setupQuarters}>
        {TEAM_CONFIGS.map((config, index) => {
          const team = engineState.teams.find((t) => t.id === config.id);
          const isLockedIn = team?.lockedIn ?? false;
          const position = QUARTER_POSITIONS[index];

          return (
            <div
              key={config.id}
              className={`${styles.setupQuarter} ${styles[position]} ${isLockedIn ? styles.lockedIn : ''}`}
              style={{ '--team-color': config.color } as React.CSSProperties}
            >
              <div className={styles.quarterFill} />
              <div className={styles.quarterContent}>
                <span className={styles.quarterName}>{config.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Header overlay */}
      <div className={styles.setupHeaderOverlay}>
        <h1 className={styles.setupTitle}>Buzz!</h1>
      </div>

      {/* Waiting indicator (no keyboard hints for player) */}
      <div className={styles.setupStartOverlay}>
        <span className={styles.waitingText}>Waiting for host to start...</span>
      </div>
    </div>
  );
}
