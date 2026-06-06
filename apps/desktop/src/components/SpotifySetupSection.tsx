// ABOUTME: Spotify setup section for the Host Setup Screen.
// ABOUTME: Shows connection button, playlist selector, and score cap input.

import type { SpotifyPlaylistSummary } from '../spotify';
import styles from './SpotifySetupSection.module.css';

interface SpotifySetupSectionProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  playlists: SpotifyPlaylistSummary[];
  isLoadingPlaylists: boolean;
  selectedPlaylist: SpotifyPlaylistSummary | null;
  onSelectPlaylist: (playlist: SpotifyPlaylistSummary | null) => void;
  scoreCap: number;
  onScoreCapChange: (cap: number) => void;
  error: string | null;
  remainingTracks: number | null;
}

export function SpotifySetupSection({
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  playlists,
  isLoadingPlaylists,
  selectedPlaylist,
  onSelectPlaylist,
  scoreCap,
  onScoreCapChange,
  error,
  remainingTracks,
}: SpotifySetupSectionProps) {
  const handlePlaylistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const playlistId = e.target.value;
    if (!playlistId) {
      onSelectPlaylist(null);
      return;
    }
    const playlist = playlists.find((p) => p.id === playlistId) ?? null;
    onSelectPlaylist(playlist);
  };

  const handleScoreCapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      onScoreCapChange(value);
    }
  };

  return (
    <div className={styles.spotifySetupSection}>
      <h3>Spotify</h3>

      {error && <div className={styles.spotifyError}>{error}</div>}

      {!isConnected ? (
        <button
          className={styles.spotifyConnectButton}
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect to Spotify'}
        </button>
      ) : (
        <div className={styles.spotifyConnected}>
          <div className={styles.spotifyStatus}>
            <span className={styles.spotifyStatusDot}></span>
            <span>Connected</span>
            <button
              className={styles.spotifyDisconnectLink}
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </div>

          <div className={styles.spotifyPlaylistSelect}>
            <label htmlFor="playlist-select">Playlist:</label>
            <select
              id="playlist-select"
              value={selectedPlaylist?.id ?? ''}
              onChange={handlePlaylistChange}
              disabled={isLoadingPlaylists}
            >
              <option value="">
                {isLoadingPlaylists ? 'Loading...' : 'Select a playlist'}
              </option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} ({playlist.trackCount} tracks)
                </option>
              ))}
            </select>
          </div>

          {remainingTracks !== null && selectedPlaylist && (
            <p className={styles.spotifyRemainingTracks}>
              {remainingTracks} / {selectedPlaylist.trackCount} songs remaining
            </p>
          )}

          <div className={styles.spotifyScoreCap}>
            <label htmlFor="score-cap">Score to win:</label>
            <input
              id="score-cap"
              type="number"
              min="1"
              max="100"
              value={scoreCap}
              onChange={handleScoreCapChange}
            />
            <span className={styles.scoreCapUnit}>pts</span>
          </div>
        </div>
      )}
    </div>
  );
}
