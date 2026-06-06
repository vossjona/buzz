// ABOUTME: Configuration for team colors, names, and keyboard bindings.
// ABOUTME: Defines the 4 teams that can participate in the buzzer game.

export interface TeamConfig {
  id: string;
  name: string;
  color: string;
  key: string;
}

export const TEAM_CONFIGS: TeamConfig[] = [
  { id: 'team-1', name: 'Team Red', color: '#e94560', key: '1' },
  { id: 'team-2', name: 'Team Blue', color: '#3b82f6', key: '2' },
  { id: 'team-3', name: 'Team Green', color: '#22c55e', key: '3' },
  { id: 'team-4', name: 'Team Yellow', color: '#f59e0b', key: '4' },
];

export function getTeamConfig(teamId: string): TeamConfig | undefined {
  return TEAM_CONFIGS.find((t) => t.id === teamId);
}

export function getTeamColor(teamId: string): string {
  return getTeamConfig(teamId)?.color ?? '#888888';
}
