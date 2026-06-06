// ABOUTME: Slider component for setting answer time limit with non-linear scaling.
// ABOUTME: Fine-grained control at lower values (1s increments) up to coarse at high values.

import styles from './AnswerTimeLimitSlider.module.css';

interface AnswerTimeLimitSliderProps {
  /** Current value in seconds (0 = disabled) */
  value: number;
  /** Called when value changes */
  onChange: (seconds: number) => void;
}

/**
 * Non-linear slider steps:
 * - 0 (Off) and 3-10 seconds: 1 second increments (9 values: 0,3,4,5,6,7,8,9,10)
 *   (1s and 2s are excluded so the 3-2-1 timeout overlay always has room to play out)
 * - 10-60 seconds: 5 second increments (10 values: 15,20,25,30,35,40,45,50,55,60)
 * - 60-260 seconds: 20 second increments (10 values: 80,100,120,140,160,180,200,220,240,260)
 *
 * Total: 29 slider positions (0-28)
 */
const SLIDER_VALUES = [
  // Off + 3-10 seconds (1s increments)
  0, 3, 4, 5, 6, 7, 8, 9, 10,
  // 10-60 seconds (5s increments)
  15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
  // 60-260 seconds (20s increments)
  80, 100, 120, 140, 160, 180, 200, 220, 240, 260,
];

const MAX_SLIDER_INDEX = SLIDER_VALUES.length - 1;

/**
 * Converts a seconds value to the nearest slider index.
 */
function secondsToSliderIndex(seconds: number): number {
  // Find the closest value in SLIDER_VALUES
  let closestIndex = 0;
  let closestDiff = Math.abs(SLIDER_VALUES[0] - seconds);

  for (let i = 1; i < SLIDER_VALUES.length; i++) {
    const diff = Math.abs(SLIDER_VALUES[i] - seconds);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Formats seconds for display (e.g., "5s", "1m 30s", "Off")
 */
function formatTimeLimit(seconds: number): string {
  if (seconds === 0) return 'Off';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${minutes}m`;
  return `${minutes}m ${secs}s`;
}

export function AnswerTimeLimitSlider({
  value,
  onChange,
}: AnswerTimeLimitSliderProps) {
  const sliderIndex = secondsToSliderIndex(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    onChange(SLIDER_VALUES[index]);
  };

  return (
    <div className={styles.answerTimeLimitSlider}>
      <div className={styles.sliderHeader}>
        <label htmlFor="answer-time-limit">Answer Time Limit</label>
        <span className={styles.sliderValue}>{formatTimeLimit(value)}</span>
      </div>
      <input
        id="answer-time-limit"
        type="range"
        min={0}
        max={MAX_SLIDER_INDEX}
        value={sliderIndex}
        onChange={handleSliderChange}
        className={styles.timeLimitRange}
      />
      <div className={styles.sliderLabels}>
        <span>Off</span>
        <span>10s</span>
        <span>1m</span>
        <span>4m 20s</span>
      </div>
    </div>
  );
}
