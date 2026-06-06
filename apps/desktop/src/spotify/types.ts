// ABOUTME: TypeScript type declarations for Spotify Web Playback SDK and API.
// ABOUTME: Defines global Spotify object, player events, playback state, and playlist types.

/**
 * Spotify Web Playback SDK player instance.
 */
export interface SpotifyPlayer {
  /** Connect the player to Spotify */
  connect(): Promise<boolean>;
  /** Disconnect the player */
  disconnect(): void;
  /** Add event listener */
  addListener<T extends SpotifyEventType>(
    event: T,
    callback: SpotifyEventCallbacks[T]
  ): void;
  /** Remove event listener */
  removeListener(event: SpotifyEventType): void;
  /** Get current playback state */
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  /** Set player name */
  setName(name: string): Promise<void>;
  /** Get player volume (0-1) */
  getVolume(): Promise<number>;
  /** Set player volume (0-1) */
  setVolume(volume: number): Promise<void>;
  /** Pause playback */
  pause(): Promise<void>;
  /** Resume playback */
  resume(): Promise<void>;
  /** Toggle play/pause */
  togglePlay(): Promise<void>;
  /** Seek to position in ms */
  seek(position_ms: number): Promise<void>;
  /** Skip to previous track */
  previousTrack(): Promise<void>;
  /** Skip to next track */
  nextTrack(): Promise<void>;
  /** Activate this element (for autoplay) */
  activateElement(): Promise<void>;
}

/**
 * Options for creating a Spotify player.
 */
export interface SpotifyPlayerOptions {
  /** Name shown in Spotify Connect */
  name: string;
  /** Callback to get the access token */
  getOAuthToken: (callback: (token: string) => void) => void;
  /** Initial volume (0-1) */
  volume?: number;
}

/**
 * Spotify event types.
 */
export type SpotifyEventType =
  | 'ready'
  | 'not_ready'
  | 'player_state_changed'
  | 'initialization_error'
  | 'authentication_error'
  | 'account_error'
  | 'playback_error';

/**
 * Event callback type mapping.
 */
export interface SpotifyEventCallbacks {
  ready: (data: SpotifyReadyEvent) => void;
  not_ready: (data: SpotifyNotReadyEvent) => void;
  player_state_changed: (state: SpotifyPlaybackState | null) => void;
  initialization_error: (error: SpotifyError) => void;
  authentication_error: (error: SpotifyError) => void;
  account_error: (error: SpotifyError) => void;
  playback_error: (error: SpotifyError) => void;
}

/**
 * Ready event data.
 */
export interface SpotifyReadyEvent {
  device_id: string;
}

/**
 * Not ready event data.
 */
export interface SpotifyNotReadyEvent {
  device_id: string;
}

/**
 * Spotify error object.
 */
export interface SpotifyError {
  message: string;
}

/**
 * Current playback state.
 */
export interface SpotifyPlaybackState {
  /** Current context (album, playlist, etc.) */
  context: {
    uri: string | null;
    metadata: Record<string, unknown>;
  };
  /** Disallowed actions */
  disallows: {
    pausing?: boolean;
    peeking_next?: boolean;
    peeking_prev?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
  };
  /** Whether playback is paused */
  paused: boolean;
  /** Current position in ms */
  position: number;
  /** Repeat mode: 0 = off, 1 = context, 2 = track */
  repeat_mode: 0 | 1 | 2;
  /** Whether shuffle is enabled */
  shuffle: boolean;
  /** Current track info */
  track_window: {
    current_track: SpotifyTrack;
    previous_tracks: SpotifyTrack[];
    next_tracks: SpotifyTrack[];
  };
}

/**
 * Spotify track info from SDK.
 */
export interface SpotifyTrack {
  /** Track URI */
  uri: string;
  /** Track ID */
  id: string | null;
  /** Track type */
  type: 'track' | 'episode' | 'ad';
  /** Media type */
  media_type: 'audio' | 'video';
  /** Track name */
  name: string;
  /** Whether this is playable */
  is_playable: boolean;
  /** Album info */
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  /** Artists */
  artists: Array<{ uri: string; name: string }>;
}

/**
 * OAuth token response from Spotify.
 */
export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/**
 * Playlist summary for selection UI.
 */
export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  trackCount: number;
  imageUrl: string | null;
}

/**
 * Track info for game use.
 */
export interface SpotifyTrackInfo {
  uri: string;
  name: string;
  artists: string[];
  albumName: string;
  albumArtUrl: string | null;
  durationMs: number;
  releaseYear: string | null;
}

/**
 * Global Spotify SDK namespace.
 */
declare global {
  interface Window {
    Spotify?: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export {};
