// ABOUTME: OAuth PKCE flow utilities for Spotify authentication.
// ABOUTME: Handles code generation, authorization URL, and token exchange.

import type { SpotifyTokenResponse } from './types';
import { logger } from '../logging/logger';

/**
 * Spotify OAuth configuration. The Client ID is not part of this object: each
 * host registers their own Spotify Developer app and Buzz stores the ID in
 * localStorage (see getStoredClientId / storeClientId).
 */
export const SPOTIFY_CONFIG = {
  /** Redirect URI for OAuth callback - must use 127.0.0.1, not localhost (Spotify requirement) */
  redirectUri: 'http://127.0.0.1:8080/callback',
  /** Required OAuth scopes - includes playlist access for "Guess the Song" mode */
  scopes: [
    'streaming',
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
  ],
  /** Spotify authorization endpoint */
  authEndpoint: 'https://accounts.spotify.com/authorize',
  /** Spotify token endpoint */
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
} as const;

/** Storage keys for PKCE and tokens */
const STORAGE_KEYS = {
  codeVerifier: 'spotify_pkce_code_verifier',
  accessToken: 'spotify_access_token',
  refreshToken: 'spotify_refresh_token',
  tokenExpiry: 'spotify_token_expiry',
  oauthState: 'spotify_oauth_state',
  clientId: 'spotify_client_id',
} as const;

/** Spotify Client IDs are 32 hex characters; anything else is a paste error. */
const CLIENT_ID_PATTERN = /^[0-9a-f]{32}$/i;

/**
 * Trims a pasted Client ID and returns it when it has Spotify's format,
 * otherwise null.
 */
export function normalizeClientId(raw: string): string | null {
  const trimmed = raw.trim();
  return CLIENT_ID_PATTERN.test(trimmed) ? trimmed : null;
}

/** The Client ID the host entered on first run, or null before that. */
export function getStoredClientId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.clientId);
}

export function storeClientId(clientId: string): void {
  localStorage.setItem(STORAGE_KEYS.clientId, clientId);
}

/** Client ID for OAuth calls. Throws when the host has not entered one yet. */
export function requireClientId(): string {
  const clientId = getStoredClientId();
  if (!clientId) {
    throw new Error('Spotify Client ID is not set');
  }
  return clientId;
}

/**
 * Generates a cryptographically secure random string for the code verifier.
 * @param length - Length of the string (default: 64)
 */
function generateRandomString(length: number = 64): string {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('');
}

/**
 * Generates the code challenge from the verifier using SHA-256.
 * @param verifier - The code verifier string
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Base64 URL encode the digest
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds the Spotify authorize URL, storing the PKCE code verifier and
 * the CSRF state in sessionStorage for later validation.
 */
export async function buildAuthorizeUrl(): Promise<string> {
  const clientId = requireClientId();

  const codeVerifier = generateRandomString(64);
  sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const state = generateRandomString(16);
  sessionStorage.setItem(STORAGE_KEYS.oauthState, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: SPOTIFY_CONFIG.redirectUri,
    scope: SPOTIFY_CONFIG.scopes.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  });

  return `${SPOTIFY_CONFIG.authEndpoint}?${params.toString()}`;
}

/**
 * Initiates the dev-mode OAuth flow by redirecting the webview to Spotify.
 * Only used in dev, where Vite serves the app on the redirect port.
 */
export async function initiateOAuthFlow(): Promise<void> {
  window.location.href = await buildAuthorizeUrl();
}

/**
 * Parses an OAuth callback URL into its code/state/error parts.
 */
export function parseCallbackUrl(url: string): {
  code: string | null;
  state: string | null;
  error: string | null;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { code: null, state: null, error: 'invalid callback URL' };
  }
  return {
    code: parsed.searchParams.get('code'),
    state: parsed.searchParams.get('state'),
    error: parsed.searchParams.get('error'),
  };
}

/**
 * Validates a received OAuth state against the value stored at flow start.
 */
export function validateOAuthState(receivedState: string | null): boolean {
  const expected = sessionStorage.getItem(STORAGE_KEYS.oauthState);
  return expected !== null && receivedState === expected;
}

/**
 * Extracts the authorization code from the callback URL.
 * @returns The authorization code, or null if not present
 */
export function extractAuthCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

/**
 * Checks if there's an error in the callback URL.
 * @returns The error message, or null if no error
 */
export function extractAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('error');
}

/**
 * Exchanges the authorization code for access and refresh tokens.
 * @param code - The authorization code from the callback
 */
export async function exchangeCodeForToken(
  code: string
): Promise<SpotifyTokenResponse> {
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the login flow.');
  }

  const params = new URLSearchParams({
    client_id: requireClientId(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_CONFIG.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    logger.warn('spotify.auth', 'Token exchange failed', {
      context: {
        status: response.status,
        error: error.error_description || error.error,
      },
    });
    throw new Error(
      `Token exchange failed: ${error.error_description || error.error}`
    );
  }

  const tokenData: SpotifyTokenResponse = await response.json();

  // Store tokens
  storeTokens(tokenData);

  // Clean up code verifier
  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);

  // Clear the URL params
  window.history.replaceState({}, document.title, window.location.pathname);

  return tokenData;
}

/**
 * Stores the tokens in localStorage.
 */
function storeTokens(tokenData: SpotifyTokenResponse): void {
  const expiryTime = Date.now() + tokenData.expires_in * 1000;

  localStorage.setItem(STORAGE_KEYS.accessToken, tokenData.access_token);
  localStorage.setItem(STORAGE_KEYS.tokenExpiry, expiryTime.toString());

  if (tokenData.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, tokenData.refresh_token);
  }
}

/**
 * Gets the stored access token if it's still valid.
 * @returns The access token, or null if expired or not found
 */
export function getStoredAccessToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  const expiry = localStorage.getItem(STORAGE_KEYS.tokenExpiry);

  if (!token || !expiry) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expiryTime = parseInt(expiry, 10);
  if (Date.now() > expiryTime - 5 * 60 * 1000) {
    return null;
  }

  return token;
}

/**
 * Gets the stored refresh token.
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

/**
 * Gets the stored access-token expiry as an absolute epoch-ms timestamp.
 */
export function getStoredTokenExpiry(): number | null {
  const expiry = localStorage.getItem(STORAGE_KEYS.tokenExpiry);
  if (!expiry) return null;
  const parsed = parseInt(expiry, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** In-flight refresh promise — coalesces concurrent callers. */
let refreshInFlight: Promise<SpotifyTokenResponse | null> | null = null;

/**
 * Refreshes the access token using the refresh token.
 *
 * Concurrent callers share a single in-flight HTTP request. This prevents
 * Spotify's single-use PKCE refresh tokens from racing when the Host window
 * and player callback both call this at the same time.
 */
export async function refreshAccessToken(): Promise<SpotifyTokenResponse | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = doRefresh().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function doRefresh(): Promise<SpotifyTokenResponse | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: requireClientId(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    logger.warn('spotify.auth', 'Token refresh failed', {
      context: { status: response.status, body },
    });
    clearStoredTokens();
    return null;
  }

  const tokenData: SpotifyTokenResponse = await response.json();
  storeTokens(tokenData);
  return tokenData;
}

/**
 * Clears all stored tokens and auth data.
 */
export function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.tokenExpiry);
  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
  sessionStorage.removeItem(STORAGE_KEYS.oauthState);
}

/**
 * Checks if the user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  return getStoredAccessToken() !== null;
}
