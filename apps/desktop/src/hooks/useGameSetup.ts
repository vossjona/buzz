// ABOUTME: Hook for song-quiz pre-game setup state.
// ABOUTME: Owns playlist, tracks, score cap and answer-time-limit configuration.

import { useEffect, useState } from 'react';
import type { SpotifyPlaylistSummary, SpotifyTrackInfo } from '../spotify';

// Persisted across the full-page reload that Spotify's OAuth redirect causes.
const STORAGE_KEYS = {
  scoreCap: 'buzz:setup:scoreCap',
  answerTimeout: 'buzz:setup:answerTimeout',
} as const;

export interface UseGameSetupReturn {
  selectedPlaylist: SpotifyPlaylistSummary | null;
  setSelectedPlaylist: (playlist: SpotifyPlaylistSummary | null) => void;
  spotifyTracks: SpotifyTrackInfo[];
  setSpotifyTracks: (tracks: SpotifyTrackInfo[]) => void;
  scoreCap: number;
  setScoreCap: (cap: number) => void;
  isLoadingTracks: boolean;
  setIsLoadingTracks: (loading: boolean) => void;
  answerTimeoutSeconds: number;
  setAnswerTimeoutSeconds: (seconds: number) => void;
}

export function useGameSetup(): UseGameSetupReturn {
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<SpotifyPlaylistSummary | null>(null);
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrackInfo[]>([]);
  const [scoreCap, setScoreCap] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.scoreCap);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 10;
  });
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [answerTimeoutSeconds, setAnswerTimeoutSeconds] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.answerTimeout);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (!Number.isFinite(parsed) || parsed < 0) return 10;
    // Legacy values 1 and 2 are no longer representable on the slider
    // (the 3-2-1 overlay needs at least 3s to play out).
    if (parsed > 0 && parsed < 3) return 10;
    return parsed;
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.scoreCap, String(scoreCap));
  }, [scoreCap]);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEYS.answerTimeout,
      String(answerTimeoutSeconds)
    );
  }, [answerTimeoutSeconds]);

  return {
    selectedPlaylist,
    setSelectedPlaylist,
    spotifyTracks,
    setSpotifyTracks,
    scoreCap,
    setScoreCap,
    isLoadingTracks,
    setIsLoadingTracks,
    answerTimeoutSeconds,
    setAnswerTimeoutSeconds,
  };
}
