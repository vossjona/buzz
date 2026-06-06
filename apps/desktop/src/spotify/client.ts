// ABOUTME: Factory for @spotify/web-api-ts-sdk instances bound to our PKCE tokens.
// ABOUTME: Ensures a fresh access token before each SDK instance is created.

import { SpotifyApi, type AccessToken } from '@spotify/web-api-ts-sdk';
import {
  SPOTIFY_CONFIG,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredTokenExpiry,
  refreshAccessToken,
} from './auth';

/**
 * Builds the AccessToken payload the SDK needs.
 *
 * Must pass a realistic future `expires` / `expires_in`. The SDK's
 * ProvidedAccessTokenStrategy triggers its own `/api/token` refresh on every
 * call when `expires <= Date.now()`, which would race with our PKCE refresh
 * and revoke our stored refresh_token. See:
 * node_modules/@spotify/web-api-ts-sdk/.../ProvidedAccessTokenStrategy.js
 *
 * When no stored expiry is available we fall back to a 5-minute window — long
 * enough for any single SDK call we make and short enough that the next
 * getSpotifyClient() call will refresh via our own flow.
 */
export function buildTokenPayload(
  accessToken: string,
  refreshToken: string,
  storedExpiry: number | null
): AccessToken {
  const fallbackMs = 5 * 60 * 1000;
  const expires = storedExpiry ?? Date.now() + fallbackMs;
  const expiresIn = Math.max(60, Math.floor((expires - Date.now()) / 1000));
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: refreshToken,
    expires,
  };
}

/**
 * Returns a SpotifyApi client bound to a valid access token.
 * Triggers a refresh if the stored token is missing or near expiry.
 * Returns null if no refresh token is available (user not logged in).
 */
export async function getSpotifyClient(): Promise<SpotifyApi | null> {
  let accessToken = getStoredAccessToken();

  if (!accessToken) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      return null;
    }
    accessToken = refreshed.access_token;
  }

  const tokenPayload = buildTokenPayload(
    accessToken,
    getStoredRefreshToken() ?? '',
    getStoredTokenExpiry()
  );

  return SpotifyApi.withAccessToken(SPOTIFY_CONFIG.clientId, tokenPayload);
}
