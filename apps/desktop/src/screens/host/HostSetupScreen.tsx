// ABOUTME: Host-side setup screen showing team lock-in status and pre-game settings.
// ABOUTME: Two-column layout: teams on left, game settings on right.

import { BuzzerState } from '@buzz/engine';
import { TEAM_CONFIGS } from '../../constants/teams';
import styles from './HostSetupScreen.module.css';
import { getLockedInTeams } from '../../utils/teamUtils';
import { HostActionButton } from '../../components/HostActionButton';
import { SpotifySetupSection } from '../../components/SpotifySetupSection';
import { AnswerTimeLimitSlider } from '../../components/AnswerTimeLimitSlider';
import { BuzzerPairingPanel } from '../../components/BuzzerPairingPanel';
import type { SpotifyPlaylistSummary } from '../../spotify';
import type { BuzzerPairingHook } from '../../hooks/useBuzzerPairing';

interface SpotifySetupState {
  isConnected: boolean;
  isConnecting: boolean;
  playlists: SpotifyPlaylistSummary[];
  isLoadingPlaylists: boolean;
  selectedPlaylist: SpotifyPlaylistSummary | null;
  scoreCap: number;
  error: string | null;
  remainingTracks: number | null;
}

interface HostSetupScreenProps {
  engineState: BuzzerState;
  isPlayerOpen: boolean;
  onOpenPlayer: () => void;
  spotifyState: SpotifySetupState;
  onSpotifyConnect: () => void;
  onSpotifyDisconnect: () => void;
  onSelectPlaylist: (playlist: SpotifyPlaylistSummary | null) => void;
  onScoreCapChange: (cap: number) => void;
  /** Answer time limit in seconds (0 = disabled) */
  answerTimeoutSeconds: number;
  /** Callback when answer time limit changes */
  onAnswerTimeoutChange: (seconds: number) => void;
  /** USB HID buzzer pairing state and controls */
  buzzerPairing?: BuzzerPairingHook;
  /** Start the game (same logic as pressing S). */
  onStartGame: () => void;
  /** Opens the Spotify Client ID screen. */
  onOpenSpotifySettings: () => void;
}

export function HostSetupScreen({
  engineState,
  isPlayerOpen,
  onOpenPlayer,
  spotifyState,
  onSpotifyConnect,
  onSpotifyDisconnect,
  onSelectPlaylist,
  onScoreCapChange,
  answerTimeoutSeconds,
  onAnswerTimeoutChange,
  buzzerPairing,
  onStartGame,
  onOpenSpotifySettings,
}: HostSetupScreenProps) {
  const lockedInTeams = getLockedInTeams(engineState.teams);
  const lockedInCount = lockedInTeams.length;

  const canOpenPlayer =
    spotifyState.isConnected && spotifyState.selectedPlaylist !== null;

  return (
    <div className={styles.hostSetupScreen}>
      <h1 className="hostTitle">Buzz! - Host Control</h1>
      <button
        type="button"
        className={styles.settingsButton}
        onClick={onOpenSpotifySettings}
        aria-label="Spotify settings"
        title="Spotify settings"
      >
        ⚙
      </button>

      <div className={styles.hostSetupColumns}>
        {/* Left column: Teams */}
        <div className={styles.hostSetupLeft}>
          <div className="hostSection">
            <h2>Teams</h2>
            <p className={styles.teamCount}>
              {lockedInCount} / {TEAM_CONFIGS.length} locked in
            </p>

            <div className={styles.teamList}>
              {TEAM_CONFIGS.map((config) => {
                const team = engineState.teams.find((t) => t.id === config.id);
                const isLockedIn = team?.lockedIn ?? false;

                return (
                  <div
                    key={config.id}
                    className={`${styles.teamRow} ${isLockedIn ? styles.lockedIn : ''}`}
                    style={
                      { '--team-color': config.color } as React.CSSProperties
                    }
                  >
                    <span className={styles.teamKey}>{config.key}</span>
                    <span className={styles.teamName}>{config.name}</span>
                    <span className={styles.teamStatus}>
                      {isLockedIn ? 'Ready' : 'Press ' + config.key}
                    </span>
                  </div>
                );
              })}
            </div>

            {buzzerPairing && (
              <BuzzerPairingPanel
                pairedBuzzers={buzzerPairing.pairedBuzzers}
                isMonitoring={buzzerPairing.isMonitoring}
                onClearPairings={buzzerPairing.clearPairings}
              />
            )}
          </div>
        </div>

        {/* Right column: Settings */}
        <div className={styles.hostSetupRight}>
          <div className="hostSection">
            <AnswerTimeLimitSlider
              value={answerTimeoutSeconds}
              onChange={onAnswerTimeoutChange}
            />

            <SpotifySetupSection
              isConnected={spotifyState.isConnected}
              isConnecting={spotifyState.isConnecting}
              onConnect={onSpotifyConnect}
              onDisconnect={onSpotifyDisconnect}
              playlists={spotifyState.playlists}
              isLoadingPlaylists={spotifyState.isLoadingPlaylists}
              selectedPlaylist={spotifyState.selectedPlaylist}
              onSelectPlaylist={onSelectPlaylist}
              scoreCap={spotifyState.scoreCap}
              onScoreCapChange={onScoreCapChange}
              error={spotifyState.error}
              remainingTracks={spotifyState.remainingTracks ?? null}
            />

            <div className={styles.playerViewSection}>
              <button
                className="hostButton"
                onClick={onOpenPlayer}
                disabled={isPlayerOpen || !canOpenPlayer}
              >
                {isPlayerOpen
                  ? 'Player View Open'
                  : canOpenPlayer
                    ? 'Open Player View'
                    : 'Connect Spotify & Select Playlist'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hostControls">
        <HostActionButton
          keyName="S"
          label={
            lockedInCount >= 2
              ? 'Start Game'
              : `Lock in ${2 - lockedInCount} more team${2 - lockedInCount !== 1 ? 's' : ''}`
          }
          onClick={onStartGame}
          disabled={lockedInCount < 2}
        />
      </div>
    </div>
  );
}
