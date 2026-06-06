// ABOUTME: Buzzer pairing panel for the Host Setup Screen.
// ABOUTME: Shows monitoring status, paired buzzers with team colors, and clear button.

import { TEAM_CONFIGS } from '../constants/teams';
import type { PairedBuzzer } from '../hooks/useBuzzerPairing';
import styles from './BuzzerPairingPanel.module.css';

interface BuzzerPairingPanelProps {
  pairedBuzzers: PairedBuzzer[];
  isMonitoring: boolean;
  onClearPairings: () => void;
}

export function BuzzerPairingPanel({
  pairedBuzzers,
  isMonitoring,
  onClearPairings,
}: BuzzerPairingPanelProps) {
  return (
    <div className={styles.buzzerPairingSection}>
      <h3>USB Buzzers</h3>

      <div className={styles.buzzerStatus}>
        <span
          className={`${styles.buzzerStatusDot} ${isMonitoring ? styles.active : ''}`}
        ></span>
        <span>{isMonitoring ? 'Monitoring' : 'Inactive'}</span>
      </div>

      {pairedBuzzers.length > 0 ? (
        <div className={styles.buzzerPairedList}>
          {pairedBuzzers.map((buzzer) => {
            const teamConfig = TEAM_CONFIGS[buzzer.buzzer_index];
            return (
              <div key={buzzer.device_path} className={styles.buzzerPairedRow}>
                <span
                  className={styles.buzzerTeamDot}
                  style={{ background: teamConfig?.color ?? '#888' }}
                ></span>
                <span className={styles.buzzerLabel}>
                  Buzzer {buzzer.buzzer_index + 1}
                </span>
                <span className={styles.buzzerTeamName}>
                  {teamConfig?.name ?? 'Unknown'}
                </span>
              </div>
            );
          })}
          <button
            className={styles.buzzerClearButton}
            onClick={onClearPairings}
          >
            Clear Pairings
          </button>
        </div>
      ) : (
        <p className={styles.buzzerHint}>
          {isMonitoring
            ? 'Press a buzzer to assign it to the next team'
            : 'Start monitoring to detect buzzers'}
        </p>
      )}
    </div>
  );
}
