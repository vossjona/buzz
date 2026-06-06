// ABOUTME: Host-side progress bar for the currently-playing Spotify track.
// ABOUTME: Extrapolates position locally between SDK events; click-to-seek.

import { useEffect, useState } from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** Last known position in ms. */
  lastPositionMs: number;
  /** Wall-clock timestamp when lastPositionMs was captured. */
  lastPositionStampMs: number;
  /** Track duration in ms. */
  durationMs: number;
  /** Whether playback is currently advancing. */
  isPlaying: boolean;
  /** Called when the user clicks at a fraction [0, 1] of the bar. */
  onSeek: (positionMs: number) => void;
}

export function ProgressBar({
  lastPositionMs,
  lastPositionStampMs,
  durationMs,
  isPlaying,
  onSeek,
}: ProgressBarProps) {
  const [displayPosition, setDisplayPosition] = useState(lastPositionMs);

  useEffect(() => {
    if (!isPlaying) {
      setDisplayPosition(lastPositionMs);
      return;
    }
    const id = setInterval(() => {
      setDisplayPosition(
        Math.min(
          lastPositionMs + (Date.now() - lastPositionStampMs),
          durationMs
        )
      );
    }, 250);
    return () => clearInterval(id);
  }, [isPlaying, lastPositionMs, lastPositionStampMs, durationMs]);

  const pct = durationMs > 0 ? (displayPosition / durationMs) * 100 : 0;

  function handleClick(e: React.MouseEvent<HTMLDivElement>): void {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    onSeek(Math.floor(fraction * durationMs));
  }

  return (
    <div
      className={styles.bar}
      onClick={handleClick}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={durationMs}
      aria-valuenow={displayPosition}
    >
      <div className={styles.fill} style={{ width: `${pct}%` }} />
      <div className={styles.time}>
        {formatMs(displayPosition)} / {formatMs(durationMs)}
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
