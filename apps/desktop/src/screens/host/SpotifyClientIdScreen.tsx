// ABOUTME: Blocking host screen where the host enters their own Spotify Client ID.
// ABOUTME: Shown on first run and again from the setup screen's gear icon.

import { useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { SPOTIFY_CONFIG } from '../../spotify';
import styles from './SpotifyClientIdScreen.module.css';

const DASHBOARD_URL = 'https://developer.spotify.com/dashboard';

export interface SpotifyClientIdScreenProps {
  /** Currently stored Client ID (prefills the field), or null on first run. */
  currentClientId: string | null;
  /** Validates + stores; returns an error message to display, or null on success. */
  onSave: (raw: string) => string | null;
  /** Only provided when an ID already exists; renders a Cancel button. */
  onCancel?: () => void;
}

export function SpotifyClientIdScreen({
  currentClientId,
  onSave,
  onCancel,
}: SpotifyClientIdScreenProps) {
  const [value, setValue] = useState(currentClientId ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(onSave(value));
  };

  return (
    <div className={`screen ${styles.clientIdScreen}`}>
      <h1 className="screenTitle">Spotify Client ID</h1>
      <p className="screenSubtitle">
        Buzz plays music through your own Spotify Developer app. Setting it up
        takes about five minutes and is only needed once.
      </p>

      <div className={`hostSection ${styles.card}`}>
        <ol className={styles.steps}>
          <li>
            Open the Spotify Developer Dashboard and log in with your Spotify
            Premium account. Click <strong>Create app</strong>.
            <button
              type="button"
              className="hostButton secondary"
              onClick={() => void open(DASHBOARD_URL)}
            >
              Open dashboard
            </button>
          </li>
          <li>
            As <strong>Redirect URI</strong> enter exactly{' '}
            <code className={styles.copyable}>
              {SPOTIFY_CONFIG.redirectUri}
            </code>
            <span className={styles.hint}>
              It must be 127.0.0.1, not localhost.
            </span>
          </li>
          <li>
            Under <strong>APIs used</strong> tick <strong>Web API</strong> and{' '}
            <strong>Web Playback SDK</strong>, then save.
          </li>
          <li>
            Open the app&apos;s settings, copy the <strong>Client ID</strong>{' '}
            and paste it here.
          </li>
        </ol>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="spotify-client-id">Client ID</label>
          <input
            id="spotify-client-id"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="32 letters and digits"
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            {onCancel && (
              <button
                type="button"
                className="hostButton secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="hostButton primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
