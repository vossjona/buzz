// ABOUTME: React hook for Spotify Web Playback SDK integration.
// ABOUTME: Uses a reducer for state management; provides OAuth authentication, player control, and playlist fetching.

import { useEffect, useCallback, useRef, useReducer } from 'react';
import {
  initiateOAuthFlow,
  runSystemBrowserOAuthFlow,
  extractAuthCode,
  extractAuthError,
  exchangeCodeForToken,
  getStoredAccessToken,
  refreshAccessToken,
  clearStoredTokens,
  isAuthenticated,
  SpotifyPlayerWrapper,
  loadSpotifySDK,
  createSpotifyPlayer,
  fetchUserPlaylists,
  fetchPlaylistTracks,
  type SpotifyPlaybackState,
  type SpotifyPlaylistSummary,
  type SpotifyTrackInfo,
} from '../spotify';

// --- Reducer types and implementation ---

export interface SpotifyState {
  isReady: boolean;
  isAuthenticating: boolean;
  deviceId: string | null;
  accessToken: string | null;
  isPlaying: boolean;
  trackName: string | null;
  trackArtists: string[];
  albumArtUrl: string | null;
  error: string | null;
  playlists: SpotifyPlaylistSummary[];
  isLoadingPlaylists: boolean;
  lastPositionMs: number;
  lastPositionStampMs: number;
}

export type SpotifyAction =
  | { type: 'PLAYER_READY'; deviceId: string }
  | { type: 'PLAYER_NOT_READY' }
  | { type: 'PLAYBACK_STATE_CHANGED'; state: SpotifyPlaybackState }
  | { type: 'PLAYBACK_STATE_CLEARED' }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; accessToken: string }
  | { type: 'AUTH_FAILED'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'PLAYLISTS_LOADING' }
  | { type: 'PLAYLISTS_LOADED'; playlists: SpotifyPlaylistSummary[] }
  | { type: 'PLAYLISTS_DONE' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

export function createInitialSpotifyState(): SpotifyState {
  return {
    isReady: false,
    isAuthenticating: false,
    deviceId: null,
    accessToken: null,
    isPlaying: false,
    trackName: null,
    trackArtists: [],
    albumArtUrl: null,
    error: null,
    playlists: [],
    isLoadingPlaylists: false,
    lastPositionMs: 0,
    lastPositionStampMs: 0,
  };
}

export function spotifyReducer(
  state: SpotifyState,
  action: SpotifyAction
): SpotifyState {
  switch (action.type) {
    case 'PLAYER_READY':
      return {
        ...state,
        deviceId: action.deviceId,
        isReady: true,
        isAuthenticating: false,
      };

    case 'PLAYER_NOT_READY':
      return { ...state, deviceId: null, isReady: false };

    case 'PLAYBACK_STATE_CHANGED': {
      const track = action.state.track_window?.current_track;
      const images = track?.album?.images ?? [];
      const albumArtUrl =
        images.find((img) => img.height === 300)?.url ?? images[0]?.url ?? null;
      return {
        ...state,
        isPlaying: !action.state.paused,
        trackName: track?.name ?? null,
        trackArtists: track?.artists?.map((a) => a.name) ?? [],
        albumArtUrl,
        lastPositionMs: action.state.position,
        lastPositionStampMs: Date.now(),
      };
    }

    case 'PLAYBACK_STATE_CLEARED':
      return {
        ...state,
        isPlaying: false,
        trackName: null,
        trackArtists: [],
        albumArtUrl: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        error: action.error,
        isReady: false,
        deviceId: null,
        accessToken: null,
      };

    case 'LOGIN_START':
      return { ...state, error: null, isAuthenticating: true };

    case 'LOGIN_SUCCESS':
      return { ...state, accessToken: action.accessToken };

    case 'AUTH_FAILED':
      return { ...state, error: action.error, isAuthenticating: false };

    case 'LOGOUT':
      return createInitialSpotifyState();

    case 'PLAYLISTS_LOADING':
      return { ...state, isLoadingPlaylists: true };

    case 'PLAYLISTS_LOADED':
      return { ...state, playlists: action.playlists };

    case 'PLAYLISTS_DONE':
      return { ...state, isLoadingPlaylists: false };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

// --- Hook public interface ---

/**
 * Return value from the useSpotify hook.
 */
export interface UseSpotifyResult {
  /** Whether the Spotify SDK is initialized and ready */
  isReady: boolean;
  /** Whether currently in the OAuth flow */
  isAuthenticating: boolean;
  /** The Spotify Connect device ID */
  deviceId: string | null;
  /** The current access token (for API calls) */
  accessToken: string | null;
  /** Whether music is currently playing */
  isPlaying: boolean;
  /** Current track name, if any */
  trackName: string | null;
  /** Current track artists */
  trackArtists: string[];
  /** Current album art URL */
  albumArtUrl: string | null;
  /** Current error message, if any */
  error: string | null;
  /** User's playlists (loaded after authentication) */
  playlists: SpotifyPlaylistSummary[];
  /** Whether playlists are loading */
  isLoadingPlaylists: boolean;
  /** Last known position in the current track (ms), from SDK state change */
  lastPositionMs: number;
  /** Wall-clock timestamp (Date.now()) when lastPositionMs was captured */
  lastPositionStampMs: number;
  /** Initiates the Spotify login flow */
  login: () => Promise<void>;
  /** Logs out and clears tokens */
  logout: () => void;
  /** Plays a specific track by URI */
  playTrack: (uri: string) => Promise<void>;
  /** Pauses playback */
  pause: () => Promise<void>;
  /** Resumes playback */
  resume: () => Promise<void>;
  /** Seeks to a position in the current track (ms) */
  seek: (positionMs: number) => Promise<void>;
  /** Loads tracks from a playlist */
  loadPlaylistTracks: (playlistId: string) => Promise<SpotifyTrackInfo[]>;
}

// --- Hook implementation ---

/**
 * Hook that provides Spotify Web Playback SDK integration.
 *
 * Handles:
 * - OAuth PKCE authentication flow
 * - SDK script loading
 * - Player initialization
 * - Playback state tracking
 * - Playlist and track fetching
 */
export function useSpotify(): UseSpotifyResult {
  const [state, dispatch] = useReducer(
    spotifyReducer,
    undefined,
    createInitialSpotifyState
  );

  // Player wrapper instance
  const playerRef = useRef<SpotifyPlayerWrapper | null>(null);

  // Flag to prevent double initialization
  const initializingRef = useRef(false);

  // Prevents StrictMode's double-mounted effect from racing two /api/token exchanges on the same single-use code.
  const callbackHandledRef = useRef(false);

  /**
   * Gets a valid access token, refreshing if needed.
   * Also dispatches LOGIN_SUCCESS on success — callers that only need the
   * reducer hydrated should use hydrateTokenState() instead.
   */
  const getValidToken = useCallback(async (): Promise<string | null> => {
    let token = getStoredAccessToken();
    if (!token) {
      const refreshResult = await refreshAccessToken();
      token = refreshResult?.access_token ?? null;
    }
    if (token) {
      dispatch({ type: 'LOGIN_SUCCESS', accessToken: token });
    }
    return token;
  }, []);

  /**
   * Pulls the stored token into reducer state. Returns true when authenticated.
   * Use this at call sites that need the reducer hydrated but don't themselves
   * consume the token value (the SDK client factory handles auth internally).
   */
  const hydrateTokenState = useCallback(async (): Promise<boolean> => {
    return (await getValidToken()) !== null;
  }, [getValidToken]);

  /**
   * Loads user playlists from Spotify API.
   */
  const loadPlaylists = useCallback(async () => {
    dispatch({ type: 'PLAYLISTS_LOADING' });
    try {
      const userPlaylists = await fetchUserPlaylists();
      dispatch({ type: 'PLAYLISTS_LOADED', playlists: userPlaylists });
    } catch (err) {
      console.error('[useSpotify] Failed to load playlists:', err);
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Failed to load playlists',
      });
    } finally {
      dispatch({ type: 'PLAYLISTS_DONE' });
    }
  }, []);

  /**
   * Initializes the Spotify player.
   */
  const initializePlayer = useCallback(async () => {
    if (initializingRef.current || playerRef.current?.isReady()) {
      return;
    }

    initializingRef.current = true;
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      // Load SDK if not already loaded
      await loadSpotifySDK();

      // Create player with callbacks
      const player = createSpotifyPlayer({
        onReady: (id) => {
          dispatch({ type: 'PLAYER_READY', deviceId: id });
        },
        onNotReady: () => {
          dispatch({ type: 'PLAYER_NOT_READY' });
        },
        onStateChanged: (playbackState: SpotifyPlaybackState | null) => {
          if (playbackState) {
            dispatch({ type: 'PLAYBACK_STATE_CHANGED', state: playbackState });
          } else {
            dispatch({ type: 'PLAYBACK_STATE_CLEARED' });
          }
        },
        onError: (err) => {
          console.error('[useSpotify] Player error:', err);

          // Handle auth errors by clearing tokens
          if (err.type === 'authentication_error') {
            clearStoredTokens();
            dispatch({
              type: 'AUTH_ERROR',
              error: `${err.type}: ${err.message}`,
            });
          } else {
            dispatch({
              type: 'SET_ERROR',
              error: `${err.type}: ${err.message}`,
            });
          }
        },
      });

      // Initialize player
      await player.initialize('Buzz Music Player', getValidToken);
      playerRef.current = player;

      // Load playlists after player is ready.
      if (await hydrateTokenState()) {
        await loadPlaylists();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to initialize player';
      console.error('[useSpotify] Initialization error:', message);
      dispatch({ type: 'AUTH_FAILED', error: message });
    } finally {
      initializingRef.current = false;
    }
  }, [getValidToken, hydrateTokenState, loadPlaylists]);

  /**
   * Handles the OAuth callback by exchanging the code for tokens.
   */
  const handleAuthCallback = useCallback(async () => {
    const code = extractAuthCode();
    const authError = extractAuthError();

    if (authError) {
      dispatch({
        type: 'AUTH_FAILED',
        error: `Authentication failed: ${authError}`,
      });
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      dispatch({ type: 'LOGIN_START' });
      try {
        const tokenData = await exchangeCodeForToken(code);
        dispatch({
          type: 'LOGIN_SUCCESS',
          accessToken: tokenData.access_token,
        });
        // Token is now stored, initialize player
        await initializePlayer();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Token exchange failed';
        dispatch({ type: 'AUTH_FAILED', error: message });
      }
    }
  }, [initializePlayer]);

  /**
   * Check for existing auth or callback on mount.
   */
  useEffect(() => {
    const init = async () => {
      // Check for OAuth callback
      if (extractAuthCode()) {
        if (callbackHandledRef.current) return;
        callbackHandledRef.current = true;
        await handleAuthCallback();
        return;
      }

      // Check for existing valid token
      if (isAuthenticated()) {
        const token = getStoredAccessToken();
        if (token) {
          dispatch({ type: 'LOGIN_SUCCESS', accessToken: token });
        }
        await initializePlayer();
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      playerRef.current?.disconnect();
    };
  }, [handleAuthCallback, initializePlayer]);

  /**
   * Initiates the Spotify login flow.
   * Dev: redirects the webview (Vite serves the callback on port 8080).
   * Prod: system browser + local callback server; resolves in place.
   */
  const login = useCallback(async () => {
    dispatch({ type: 'LOGIN_START' });
    try {
      if (import.meta.env.DEV) {
        await initiateOAuthFlow();
        // The webview navigates away; the callback is handled on remount.
        return;
      }
      const code = await runSystemBrowserOAuthFlow();
      const tokenData = await exchangeCodeForToken(code);
      dispatch({ type: 'LOGIN_SUCCESS', accessToken: tokenData.access_token });
      await initializePlayer();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start login';
      dispatch({ type: 'AUTH_FAILED', error: message });
    }
  }, [initializePlayer]);

  /**
   * Logs out and clears all auth data.
   */
  const logout = useCallback(() => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    clearStoredTokens();
    dispatch({ type: 'LOGOUT' });
  }, []);

  /**
   * Plays a specific track by URI.
   */
  const playTrack = useCallback(async (uri: string) => {
    if (!playerRef.current?.isReady()) {
      dispatch({ type: 'SET_ERROR', error: 'Player not ready' });
      return;
    }

    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await playerRef.current.playTrack(uri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Playback failed';
      dispatch({ type: 'SET_ERROR', error: message });
    }
  }, []);

  /**
   * Pauses playback.
   */
  const pause = useCallback(async () => {
    if (!playerRef.current?.isReady()) {
      return;
    }

    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await playerRef.current.pause();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pause failed';
      dispatch({ type: 'SET_ERROR', error: message });
    }
  }, []);

  /**
   * Resumes playback.
   */
  const resume = useCallback(async () => {
    if (!playerRef.current?.isReady()) {
      return;
    }

    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await playerRef.current.resume();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resume failed';
      dispatch({ type: 'SET_ERROR', error: message });
    }
  }, []);

  /**
   * Seeks to a position in the current track (ms).
   */
  const seek = useCallback(async (positionMs: number) => {
    if (!playerRef.current?.isReady()) {
      return;
    }

    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await playerRef.current.seek(positionMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Seek failed';
      dispatch({ type: 'SET_ERROR', error: message });
    }
  }, []);

  /**
   * Loads tracks from a playlist.
   */
  const loadPlaylistTracks = useCallback(
    async (playlistId: string): Promise<SpotifyTrackInfo[]> => {
      return fetchPlaylistTracks(playlistId);
    },
    []
  );

  return {
    ...state,
    login,
    logout,
    playTrack,
    pause,
    resume,
    seek,
    loadPlaylistTracks,
  };
}
