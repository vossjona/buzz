// ABOUTME: Unit tests for the spotifyReducer pure function.
// ABOUTME: Tests all state transitions and action types.

import { describe, it, expect } from 'vitest';
import {
  spotifyReducer,
  createInitialSpotifyState,
  type SpotifyState,
} from './useSpotify';
import type { SpotifyPlaybackState } from '../spotify';

function makePlayingState(overrides: Partial<SpotifyState> = {}): SpotifyState {
  return {
    ...createInitialSpotifyState(),
    isReady: true,
    deviceId: 'device-123',
    accessToken: 'token-abc',
    isPlaying: true,
    trackName: 'Test Song',
    trackArtists: ['Artist A'],
    albumArtUrl: 'https://example.com/art.jpg',
    playlists: [
      { id: 'pl1', name: 'My Playlist', trackCount: 10, imageUrl: null },
    ],
    ...overrides,
  };
}

function makePlaybackState(
  overrides: Partial<SpotifyPlaybackState> = {}
): SpotifyPlaybackState {
  return {
    context: { uri: null, metadata: {} },
    disallows: {},
    paused: false,
    position: 0,
    repeat_mode: 0,
    shuffle: false,
    track_window: {
      current_track: {
        uri: 'spotify:track:123',
        id: '123',
        type: 'track',
        media_type: 'audio',
        name: 'New Song',
        is_playable: true,
        album: {
          uri: 'spotify:album:456',
          name: 'New Album',
          images: [
            { url: 'https://example.com/large.jpg', height: 640, width: 640 },
            { url: 'https://example.com/medium.jpg', height: 300, width: 300 },
            { url: 'https://example.com/small.jpg', height: 64, width: 64 },
          ],
        },
        artists: [
          { uri: 'spotify:artist:a1', name: 'Artist X' },
          { uri: 'spotify:artist:a2', name: 'Artist Y' },
        ],
      },
      previous_tracks: [],
      next_tracks: [],
    },
    ...overrides,
  };
}

describe('createInitialSpotifyState', () => {
  it('returns the expected initial values', () => {
    const state = createInitialSpotifyState();
    expect(state).toEqual({
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
    });
  });
});

describe('spotifyReducer', () => {
  describe('PLAYER_READY', () => {
    it('sets deviceId, isReady, and clears isAuthenticating', () => {
      const state = createInitialSpotifyState();
      const result = spotifyReducer(state, {
        type: 'PLAYER_READY',
        deviceId: 'device-xyz',
      });
      expect(result.deviceId).toBe('device-xyz');
      expect(result.isReady).toBe(true);
      expect(result.isAuthenticating).toBe(false);
    });
  });

  describe('PLAYER_NOT_READY', () => {
    it('clears deviceId and isReady', () => {
      const state = makePlayingState();
      const result = spotifyReducer(state, { type: 'PLAYER_NOT_READY' });
      expect(result.deviceId).toBeNull();
      expect(result.isReady).toBe(false);
      // Other fields preserved
      expect(result.isPlaying).toBe(true);
      expect(result.trackName).toBe('Test Song');
    });
  });

  describe('PLAYBACK_STATE_CHANGED', () => {
    it('extracts track info and prefers 300px album art', () => {
      const state = createInitialSpotifyState();
      const playback = makePlaybackState();
      const result = spotifyReducer(state, {
        type: 'PLAYBACK_STATE_CHANGED',
        state: playback,
      });
      expect(result.isPlaying).toBe(true);
      expect(result.trackName).toBe('New Song');
      expect(result.trackArtists).toEqual(['Artist X', 'Artist Y']);
      expect(result.albumArtUrl).toBe('https://example.com/medium.jpg');
    });

    it('falls back to first image when no 300px image exists', () => {
      const playback = makePlaybackState();
      playback.track_window.current_track.album.images = [
        { url: 'https://example.com/only.jpg', height: 640, width: 640 },
      ];
      const result = spotifyReducer(createInitialSpotifyState(), {
        type: 'PLAYBACK_STATE_CHANGED',
        state: playback,
      });
      expect(result.albumArtUrl).toBe('https://example.com/only.jpg');
    });

    it('sets albumArtUrl to null when no images exist', () => {
      const playback = makePlaybackState();
      playback.track_window.current_track.album.images = [];
      const result = spotifyReducer(createInitialSpotifyState(), {
        type: 'PLAYBACK_STATE_CHANGED',
        state: playback,
      });
      expect(result.albumArtUrl).toBeNull();
    });

    it('reflects paused state', () => {
      const playback = makePlaybackState({ paused: true });
      const result = spotifyReducer(createInitialSpotifyState(), {
        type: 'PLAYBACK_STATE_CHANGED',
        state: playback,
      });
      expect(result.isPlaying).toBe(false);
    });
  });

  describe('PLAYBACK_STATE_CLEARED', () => {
    it('clears playback fields but preserves auth state', () => {
      const state = makePlayingState();
      const result = spotifyReducer(state, { type: 'PLAYBACK_STATE_CLEARED' });
      expect(result.isPlaying).toBe(false);
      expect(result.trackName).toBeNull();
      expect(result.trackArtists).toEqual([]);
      expect(result.albumArtUrl).toBeNull();
      // Auth state preserved
      expect(result.isReady).toBe(true);
      expect(result.deviceId).toBe('device-123');
      expect(result.accessToken).toBe('token-abc');
    });
  });

  describe('AUTH_ERROR', () => {
    it('clears auth state and sets error, but preserves playback fields', () => {
      const state = makePlayingState();
      const result = spotifyReducer(state, {
        type: 'AUTH_ERROR',
        error: 'authentication_error: Token expired',
      });
      expect(result.isReady).toBe(false);
      expect(result.deviceId).toBeNull();
      expect(result.accessToken).toBeNull();
      expect(result.error).toBe('authentication_error: Token expired');
      // Playback fields preserved (player will stop on its own)
      expect(result.trackName).toBe('Test Song');
    });
  });

  describe('LOGIN_START', () => {
    it('clears error and sets isAuthenticating', () => {
      const state = { ...createInitialSpotifyState(), error: 'old error' };
      const result = spotifyReducer(state, { type: 'LOGIN_START' });
      expect(result.error).toBeNull();
      expect(result.isAuthenticating).toBe(true);
    });
  });

  describe('LOGIN_SUCCESS', () => {
    it('sets the access token', () => {
      const state = createInitialSpotifyState();
      const result = spotifyReducer(state, {
        type: 'LOGIN_SUCCESS',
        accessToken: 'new-token',
      });
      expect(result.accessToken).toBe('new-token');
    });
  });

  describe('AUTH_FAILED', () => {
    it('sets error and clears isAuthenticating', () => {
      const state = { ...createInitialSpotifyState(), isAuthenticating: true };
      const result = spotifyReducer(state, {
        type: 'AUTH_FAILED',
        error: 'Token exchange failed',
      });
      expect(result.error).toBe('Token exchange failed');
      expect(result.isAuthenticating).toBe(false);
    });
  });

  describe('LOGOUT', () => {
    it('resets all state to initial values', () => {
      const state = makePlayingState({
        error: 'some error',
        isLoadingPlaylists: true,
        isAuthenticating: true,
      });
      const result = spotifyReducer(state, { type: 'LOGOUT' });
      expect(result).toEqual(createInitialSpotifyState());
    });
  });

  describe('PLAYLISTS_LOADING', () => {
    it('sets isLoadingPlaylists to true', () => {
      const state = createInitialSpotifyState();
      const result = spotifyReducer(state, { type: 'PLAYLISTS_LOADING' });
      expect(result.isLoadingPlaylists).toBe(true);
    });
  });

  describe('PLAYLISTS_LOADED', () => {
    it('sets the playlists array', () => {
      const playlists = [
        {
          id: 'p1',
          name: 'Rock',
          trackCount: 50,
          imageUrl: 'https://example.com/rock.jpg',
        },
      ];
      const state = createInitialSpotifyState();
      const result = spotifyReducer(state, {
        type: 'PLAYLISTS_LOADED',
        playlists,
      });
      expect(result.playlists).toEqual(playlists);
    });
  });

  describe('PLAYLISTS_DONE', () => {
    it('sets isLoadingPlaylists to false', () => {
      const state = {
        ...createInitialSpotifyState(),
        isLoadingPlaylists: true,
      };
      const result = spotifyReducer(state, { type: 'PLAYLISTS_DONE' });
      expect(result.isLoadingPlaylists).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('sets the error message', () => {
      const state = createInitialSpotifyState();
      const result = spotifyReducer(state, {
        type: 'SET_ERROR',
        error: 'Playback failed',
      });
      expect(result.error).toBe('Playback failed');
    });
  });

  describe('CLEAR_ERROR', () => {
    it('clears the error', () => {
      const state = { ...createInitialSpotifyState(), error: 'old error' };
      const result = spotifyReducer(state, { type: 'CLEAR_ERROR' });
      expect(result.error).toBeNull();
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const state = makePlayingState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = spotifyReducer(state, { type: 'UNKNOWN' } as any);
      expect(result).toBe(state);
    });
  });
});
