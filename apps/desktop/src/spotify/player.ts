// ABOUTME: Web Playback SDK wrapper for Spotify player control.
// ABOUTME: Handles player initialization, events, and playback control.

import type {
  SpotifyPlayer,
  SpotifyPlaybackState,
  SpotifyReadyEvent,
  SpotifyError,
} from './types';
import { logger } from '../logging/logger';

/**
 * Callback types for player events.
 */
export interface PlayerCallbacks {
  onReady?: (deviceId: string) => void;
  onNotReady?: (deviceId: string) => void;
  onStateChanged?: (state: SpotifyPlaybackState | null) => void;
  onError?: (error: SpotifyError & { type: string }) => void;
}

/**
 * Wrapper class for Spotify Web Playback SDK.
 */
export class SpotifyPlayerWrapper {
  private player: SpotifyPlayer | null = null;
  private deviceId: string | null = null;
  private accessToken: string | null = null;
  private callbacks: PlayerCallbacks;
  private isInitialized = false;
  private lastPlayTrackTime = 0;
  private static readonly PLAY_SETTLE_MS = 800;
  private static readonly PLAY_COOLDOWN_MS = 1000;

  // DRM recovery state
  private lastPlayedUri: string | null = null;
  private recoveryAttempt = 0;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private isPausedIntentionally = false;
  private static readonly MAX_RECOVERY_ATTEMPTS = 3;

  constructor(callbacks: PlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Checks if the player is initialized and ready.
   */
  isReady(): boolean {
    return this.isInitialized && this.deviceId !== null;
  }

  /**
   * Initializes the Spotify player.
   * Must be called after the SDK script is loaded.
   *
   * @param name - Name shown in Spotify Connect
   * @param getToken - Async function that returns the access token
   */
  async initialize(
    name: string,
    getToken: () => Promise<string | null>
  ): Promise<void> {
    if (!window.Spotify) {
      throw new Error('Spotify SDK not loaded');
    }

    // Get initial token
    const token = await getToken();
    if (!token) {
      throw new Error('No access token available');
    }
    this.accessToken = token;

    // Create player instance
    this.player = new window.Spotify.Player({
      name,
      getOAuthToken: (callback) => {
        // Refresh token if needed
        getToken().then((newToken) => {
          if (newToken) {
            this.accessToken = newToken;
            callback(newToken);
          }
        });
      },
      volume: 0.5,
    });

    // Set up event listeners
    this.setupEventListeners();

    // Connect to Spotify
    const connected = await this.player.connect();
    if (!connected) {
      throw new Error('Failed to connect to Spotify');
    }
  }

  /**
   * Sets up event listeners for the player.
   */
  private setupEventListeners(): void {
    if (!this.player) return;

    this.player.addListener('ready', (data: SpotifyReadyEvent) => {
      console.log('[Spotify] Player ready with device ID:', data.device_id);
      this.deviceId = data.device_id;
      this.isInitialized = true;
      this.callbacks.onReady?.(data.device_id);
    });

    this.player.addListener('not_ready', (data) => {
      console.log('[Spotify] Player not ready:', data.device_id);
      this.deviceId = null;
      this.isInitialized = false;
      this.callbacks.onNotReady?.(data.device_id);
    });

    this.player.addListener('player_state_changed', (state) => {
      this.callbacks.onStateChanged?.(state);
    });

    // Error listeners (non-playback)
    const errorTypes = [
      'initialization_error',
      'authentication_error',
      'account_error',
    ] as const;

    for (const errorType of errorTypes) {
      this.player.addListener(errorType, (error: SpotifyError) => {
        logger.error('spotify.player', `${errorType}: ${error.message}`, {
          context: { errorType },
        });
        this.callbacks.onError?.({ ...error, type: errorType });
      });
    }

    // Playback error with DRM recovery
    this.player.addListener('playback_error', (error: SpotifyError) => {
      logger.error('spotify.player', `playback_error: ${error.message}`, {
        context: { errorType: 'playback_error' },
      });
      this.callbacks.onError?.({ ...error, type: 'playback_error' });
      this.scheduleRecovery();
    });
  }

  /**
   * Plays a track by URI.
   * Uses the Spotify Web API to start playback on this device.
   *
   * @param trackUri - Spotify track URI (e.g., "spotify:track:xxx")
   */
  async playTrack(trackUri: string): Promise<void> {
    if (!this.deviceId || !this.accessToken) {
      throw new Error('Player not ready or no token');
    }

    // Reset DRM recovery state for new track
    this.cancelRecovery();
    this.lastPlayedUri = trackUri;
    this.recoveryAttempt = 0;
    this.isPausedIntentionally = false;

    // Throttle: enforce minimum gap between successive playTrack calls
    // to avoid overwhelming Spotify's DRM license endpoint
    const elapsed = Date.now() - this.lastPlayTrackTime;
    const cooldownRemaining = SpotifyPlayerWrapper.PLAY_COOLDOWN_MS - elapsed;
    if (cooldownRemaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, cooldownRemaining));
    }

    this.lastPlayTrackTime = Date.now();
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          uris: [trackUri],
        }),
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(
        `Failed to play track: ${error.error?.message || response.statusText}`
      );
    }
  }

  /**
   * Pauses playback.
   */
  async pause(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    this.isPausedIntentionally = true;
    this.cancelRecovery();
    await this.player.pause();
  }

  /**
   * Resumes playback.
   */
  async resume(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    this.isPausedIntentionally = false;

    // Wait for DRM license to settle after a recent playTrack() call
    const elapsed = Date.now() - this.lastPlayTrackTime;
    const remaining = SpotifyPlayerWrapper.PLAY_SETTLE_MS - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    await this.player.resume();
  }

  /**
   * Seeks to a position in the current track.
   * @param positionMs - Target position in milliseconds
   */
  async seek(positionMs: number): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    await this.player.seek(Math.max(0, Math.floor(positionMs)));
  }

  /**
   * Cancels any pending DRM recovery timer.
   */
  private cancelRecovery(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /**
   * Schedules a DRM recovery attempt after a playback_error.
   * Checks if the track started playing on its own; if not, retries the play API call.
   * Uses fast first retry (500ms) then exponential backoff (4s, 6s).
   */
  private scheduleRecovery(): void {
    // Don't stack timers — let the current one run
    if (this.recoveryTimer !== null) return;

    if (
      !this.lastPlayedUri ||
      this.recoveryAttempt >= SpotifyPlayerWrapper.MAX_RECOVERY_ATTEMPTS ||
      this.isPausedIntentionally
    ) {
      return;
    }

    this.recoveryAttempt++;
    // First attempt: fast retry (500ms). Subsequent: escalate (2s, 4s).
    const delay =
      this.recoveryAttempt === 1 ? 500 : this.recoveryAttempt * 2000;
    const uri = this.lastPlayedUri;

    console.log(
      `[Spotify] DRM recovery: scheduled attempt ${this.recoveryAttempt} in ${delay}ms`
    );

    this.recoveryTimer = setTimeout(async () => {
      this.recoveryTimer = null;

      // Bail if paused intentionally or a different track is now active
      if (this.isPausedIntentionally || this.lastPlayedUri !== uri) return;

      try {
        const state = await this.player?.getCurrentState();
        if (state && !state.paused) {
          // Track is playing — DRM recovered on its own
          this.recoveryAttempt = 0;
          console.log(
            `[Spotify] DRM recovery: track is now playing, no action needed`
          );
          return;
        }

        if (!this.player || !this.deviceId || !this.accessToken) return;

        console.log(
          `[Spotify] DRM recovery: retrying play (attempt ${this.recoveryAttempt})`
        );
        this.lastPlayTrackTime = Date.now();

        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.accessToken}`,
            },
            body: JSON.stringify({ uris: [uri] }),
          }
        );

        if (!response.ok && response.status !== 204) {
          logger.warn(
            'spotify.player',
            `DRM recovery: play call returned ${response.status}`,
            {
              context: {
                status: response.status,
                attempt: this.recoveryAttempt,
                drm: true,
              },
            }
          );
        }
        // If this retry also fails, the playback_error listener will fire
        // again and call scheduleRecovery() for the next attempt.
      } catch (err) {
        logger.error('spotify.player', 'DRM recovery error', {
          stack: err instanceof Error ? err.stack : undefined,
          context: {
            attempt: this.recoveryAttempt,
            drm: true,
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }, delay);
  }

  /**
   * Disconnects the player.
   */
  disconnect(): void {
    this.cancelRecovery();
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isInitialized = false;
    }
  }
}

/**
 * Loads the Spotify Web Playback SDK script.
 * @returns Promise that resolves when the SDK is ready
 */
export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Spotify) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src="https://sdk.scdn.co/spotify-player.js"]'
    );
    if (existingScript) {
      // Wait for the existing script to load
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
      return;
    }

    // Set up the callback before loading
    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve();
    };

    // Create and append the script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = () => {
      reject(new Error('Failed to load Spotify SDK'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Creates a new Spotify player wrapper.
 */
export function createSpotifyPlayer(
  callbacks: PlayerCallbacks = {}
): SpotifyPlayerWrapper {
  return new SpotifyPlayerWrapper(callbacks);
}
