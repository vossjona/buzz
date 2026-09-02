// ABOUTME: Unit tests for the Spotify auth module.
// ABOUTME: Covers PKCE refresh coalescing and failure recovery.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  refreshAccessToken,
  parseCallbackUrl,
  validateOAuthState,
} from './auth';

const makeTokenResponse = (overrides: Record<string, unknown> = {}) => ({
  access_token: 'access-1',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'refresh-1',
  scope: 'streaming',
  ...overrides,
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('spotify_refresh_token', 'initial-refresh-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces concurrent calls into a single HTTP request', async () => {
    const tokenResponse = makeTokenResponse();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(tokenResponse), { status: 200 })
      );

    const [a, b, c] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(tokenResponse);
    expect(b).toEqual(tokenResponse);
    expect(c).toEqual(tokenResponse);
  });

  it('allows a fresh refresh after the in-flight one settles', async () => {
    const first = makeTokenResponse({
      access_token: 'a1',
      refresh_token: 'r1',
    });
    const second = makeTokenResponse({
      access_token: 'a2',
      refresh_token: 'r2',
    });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(first), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(second), { status: 200 })
      );

    const a = await refreshAccessToken();
    const b = await refreshAccessToken();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(a).toEqual(first);
    expect(b).toEqual(second);
  });

  it('clears the in-flight promise after failure so the next call retries', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(makeTokenResponse({ access_token: 'recovered' })),
          { status: 200 }
        )
      );

    const failed = await refreshAccessToken();
    expect(failed).toBeNull();

    // Existing behavior: a 400 clears stored tokens. Put a token back so the
    // next call has something to work with.
    localStorage.setItem('spotify_refresh_token', 'retry-token');

    const recovered = await refreshAccessToken();
    expect(recovered?.access_token).toBe('recovered');
  });

  it('returns null immediately when no refresh token is stored', async () => {
    localStorage.removeItem('spotify_refresh_token');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('parseCallbackUrl', () => {
  it('extracts code and state from a callback URL', () => {
    const result = parseCallbackUrl(
      'http://127.0.0.1:8080/callback?code=abc123&state=xyz789'
    );
    expect(result).toEqual({ code: 'abc123', state: 'xyz789', error: null });
  });

  it('extracts an OAuth error', () => {
    const result = parseCallbackUrl(
      'http://127.0.0.1:8080/callback?error=access_denied&state=xyz789'
    );
    expect(result.error).toBe('access_denied');
    expect(result.code).toBeNull();
  });

  it('returns an error for a malformed URL', () => {
    const result = parseCallbackUrl('not a url');
    expect(result).toEqual({
      code: null,
      state: null,
      error: 'invalid callback URL',
    });
  });
});

describe('validateOAuthState', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('accepts a state matching the stored value', () => {
    sessionStorage.setItem('spotify_oauth_state', 'expected-state');
    expect(validateOAuthState('expected-state')).toBe(true);
  });

  it('rejects a mismatched state', () => {
    sessionStorage.setItem('spotify_oauth_state', 'expected-state');
    expect(validateOAuthState('wrong-state')).toBe(false);
  });

  it('rejects when no state was stored', () => {
    expect(validateOAuthState('anything')).toBe(false);
  });

  it('rejects null state', () => {
    sessionStorage.setItem('spotify_oauth_state', 'expected-state');
    expect(validateOAuthState(null)).toBe(false);
  });
});
