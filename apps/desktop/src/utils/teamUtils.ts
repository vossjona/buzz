// ABOUTME: Shared utility functions for team filtering and scoring.
// ABOUTME: Eliminates duplicated team logic across screen components.

import { Team } from '@buzz/engine';

/** Returns only teams that locked in during setup. */
export function getLockedInTeams(teams: Team[]): Team[] {
  return teams.filter((t) => t.lockedIn);
}

/**
 * Returns the IDs of teams with the highest score (ties possible).
 * Only considers locked-in teams and requires score > 0.
 */
export function getWinnerTeamIds(teams: Team[]): string[] {
  const lockedIn = getLockedInTeams(teams);
  const sorted = [...lockedIn].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;

  if (topScore <= 0) return [];

  return sorted.filter((t) => t.score === topScore).map((t) => t.id);
}
