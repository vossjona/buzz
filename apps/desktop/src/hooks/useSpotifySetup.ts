// ABOUTME: Hook for Spotify setup orchestration and lifecycle management.
// ABOUTME: Handles playlist loading, game reset/close with music, auto-reveal, and game-over detection.

import { useCallback, useEffect } from 'react';
import type { UseSpotifyResult } from './useSpotify';
import type { Screen } from './useGameState';
import type { BuzzerPhase } from '@buzz/engine';
import type { SpotifyPlaylistSummary, SpotifyTrackInfo } from '../spotify';

interface SpotifyPlaybackActions {
  currentTrack: { name: string; artists: string[] } | null;
  isRevealed: boolean;
  isGameOver: boolean;
  reveal: () => void;
  stop: () => Promise<void>;
  reset: () => void;
  softReset: () => void;
  playNextTrack: () => Promise<boolean>;
}

interface UseSpotifySetupOptions {
  spotify: UseSpotifyResult;
  spotifyPlayback: SpotifyPlaybackActions;
  screen: Screen;
  enginePhase: BuzzerPhase;
  setSpotifyTracks: (tracks: SpotifyTrackInfo[]) => void;
  setSelectedPlaylist: (playlist: SpotifyPlaylistSummary | null) => void;
  setIsLoadingTracks: (loading: boolean) => void;
  recordRoundResult: (songTitle: string, artistName: string) => void;
  setScreen: (screen: Screen) => void;
  resetGame: () => void;
  closePlayer: () => void;
}

interface UseSpotifySetupReturn {
  handleSelectPlaylist: (
    playlist: SpotifyPlaylistSummary | null
  ) => Promise<void>;
  handleResetGame: () => Promise<void>;
  handleClosePlayer: () => Promise<void>;
}

export function useSpotifySetup(
  options: UseSpotifySetupOptions
): UseSpotifySetupReturn {
  const {
    spotify,
    spotifyPlayback,
    screen,
    enginePhase,
    setSpotifyTracks,
    setSelectedPlaylist,
    setIsLoadingTracks,
    recordRoundResult,
    setScreen,
    resetGame,
    closePlayer,
  } = options;

  // Load tracks when playlist is selected
  const handleSelectPlaylist = useCallback(
    async (playlist: SpotifyPlaylistSummary | null) => {
      setSelectedPlaylist(playlist);
      spotifyPlayback.reset();
      if (!playlist) {
        setSpotifyTracks([]);
        return;
      }

      setIsLoadingTracks(true);
      try {
        const tracks = await spotify.loadPlaylistTracks(playlist.id);
        setSpotifyTracks(tracks);
      } catch (err) {
        console.error('Failed to load playlist tracks:', err);
        setSpotifyTracks([]);
      } finally {
        setIsLoadingTracks(false);
      }
    },
    [
      spotify,
      spotifyPlayback,
      setSelectedPlaylist,
      setSpotifyTracks,
      setIsLoadingTracks,
    ]
  );

  // Handle game reset (stop music and reset Spotify state)
  const handleResetGame = useCallback(async () => {
    await spotifyPlayback.stop();
    resetGame();
    spotifyPlayback.softReset();
  }, [resetGame, spotifyPlayback]);

  // Handle closing player window (stop music first)
  const handleClosePlayer = useCallback(async () => {
    await spotifyPlayback.stop();
    closePlayer();
  }, [closePlayer, spotifyPlayback]);

  // Auto-reveal song when round resolves (covers the all-wrong scenario)
  useEffect(() => {
    if (enginePhase === 'resolved' && !spotifyPlayback.isRevealed) {
      spotifyPlayback.reveal();
    }
  }, [enginePhase, spotifyPlayback]);

  // Handle game over (score cap reached or playlist exhausted)
  useEffect(() => {
    if (screen === 'game' && spotifyPlayback.isGameOver) {
      const track = spotifyPlayback.currentTrack;
      recordRoundResult(track?.name ?? '', track?.artists[0] ?? '');
      setScreen('final');
    }
  }, [
    screen,
    spotifyPlayback.isGameOver,
    setScreen,
    spotifyPlayback.currentTrack,
    recordRoundResult,
  ]);

  return {
    handleSelectPlaylist,
    handleResetGame,
    handleClosePlayer,
  };
}
