// ABOUTME: Barrel export for Spotify integration module.
// ABOUTME: Re-exports auth, player, API, and types for easy importing.

export {
  SPOTIFY_CONFIG,
  initiateOAuthFlow,
  extractAuthCode,
  extractAuthError,
  exchangeCodeForToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  refreshAccessToken,
  clearStoredTokens,
  isAuthenticated,
} from './auth';

export { runSystemBrowserOAuthFlow } from './systemBrowserAuth';

export {
  SpotifyPlayerWrapper,
  loadSpotifySDK,
  createSpotifyPlayer,
  type PlayerCallbacks,
} from './player';

export { fetchUserPlaylists, fetchPlaylistTracks } from './api';

export type {
  SpotifyPlayer,
  SpotifyPlayerOptions,
  SpotifyEventType,
  SpotifyEventCallbacks,
  SpotifyReadyEvent,
  SpotifyNotReadyEvent,
  SpotifyError,
  SpotifyPlaybackState,
  SpotifyTrack,
  SpotifyTokenResponse,
  SpotifyPlaylistSummary,
  SpotifyTrackInfo,
} from './types';
