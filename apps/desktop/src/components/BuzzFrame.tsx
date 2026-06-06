// ABOUTME: Full-screen colored border overlay when a team buzzes.
// ABOUTME: Provides dramatic visual feedback with dynamic pulse speed and intensity based on countdown.

import styles from './BuzzFrame.module.css';

interface BuzzFrameProps {
  color: string;
  teamName: string;
  /** Pulse animation duration in seconds (default 1.5s, faster = more urgent) */
  pulseDuration?: number;
  /** Pulse intensity multiplier (default 1.0, higher = more intense glow) */
  pulseIntensity?: number;
}

export function BuzzFrame({
  color,
  teamName,
  pulseDuration = 1.5,
  pulseIntensity = 1.0,
}: BuzzFrameProps) {
  return (
    <div
      className={styles.buzzFrame}
      style={
        {
          '--buzz-color': color,
          '--pulse-duration': `${pulseDuration}s`,
          '--pulse-intensity': pulseIntensity,
        } as React.CSSProperties
      }
    >
      <div className={styles.buzzTeamName}>{teamName}</div>
    </div>
  );
}
