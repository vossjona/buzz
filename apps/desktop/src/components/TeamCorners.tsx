// ABOUTME: Displays teams in the four corners of the screen during gameplay.
// ABOUTME: Keeps the center area clear for the question display.

import { Team } from '@buzz/engine';
import { TEAM_CONFIGS, TeamConfig } from '../constants/teams';
import { AnswerResult } from '../hooks/useGameState';
import styles from './TeamCorners.module.css';

const CORNER_POSITIONS = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
] as const;
type CornerPosition = (typeof CORNER_POSITIONS)[number];

interface TeamCornerProps {
  team: Team;
  config: TeamConfig;
  isActive: boolean;
  isPulsing: boolean;
  isEliminated: boolean;
  position: CornerPosition;
  /** Whether this corner should play jump animation */
  isJumping: boolean;
  /** Whether this corner should play shake animation */
  isShaking: boolean;
}

function TeamCorner({
  team,
  config,
  isActive,
  isPulsing,
  isEliminated,
  position,
  isJumping,
  isShaking,
}: TeamCornerProps) {
  // Calculate scale from score: 1 + (score × 0.025), capped at 2.25
  const scoreScale = Math.min(1 + team.score * 0.025, 2.25);

  const classes = [
    styles.teamCorner,
    styles[position],
    isActive && styles.active,
    isPulsing && !isEliminated && styles.pulsing,
    isEliminated && styles.eliminated,
    isJumping && styles.jumping,
    isShaking && styles.shaking,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={
        {
          '--team-color': config.color,
          '--score-scale': scoreScale,
        } as React.CSSProperties
      }
    >
      <div className={styles.cornerName}>{config.name}</div>
      <div className={styles.cornerScore}>{team.score}</div>
    </div>
  );
}

interface TeamCornersProps {
  teams: Team[];
  activeTeamId?: string | null;
  /** Whether corners should pulse (armed phase) */
  isPulsing?: boolean;
  /** Team IDs that are eliminated this round */
  eliminatedTeamIds?: string[];
  /** Last answer result for animations */
  lastAnswerResult?: AnswerResult | null;
}

export function TeamCorners({
  teams,
  activeTeamId,
  isPulsing = false,
  eliminatedTeamIds = [],
  lastAnswerResult = null,
}: TeamCornersProps) {
  return (
    <div className={styles.teamCorners}>
      {TEAM_CONFIGS.map((config, index) => {
        const team = teams.find((t) => t.id === config.id);
        if (!team) return null;

        // Determine animation state from lastAnswerResult
        const isJumping =
          lastAnswerResult?.teamId === config.id && lastAnswerResult.correct;
        const isShaking =
          lastAnswerResult?.teamId === config.id && !lastAnswerResult.correct;

        return (
          <TeamCorner
            key={config.id}
            team={team}
            config={config}
            isActive={activeTeamId === config.id}
            isPulsing={isPulsing}
            isEliminated={eliminatedTeamIds.includes(config.id)}
            position={CORNER_POSITIONS[index]}
            isJumping={isJumping}
            isShaking={isShaking}
          />
        );
      })}
    </div>
  );
}
