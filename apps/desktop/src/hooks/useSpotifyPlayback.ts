// ABOUTME: Hook for managing Spotify playback based on game phase.
// ABOUTME: Pauses on buzz, resumes when re-opened, advances to next random track.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BuzzerPhase } from '@buzz/engine';
import type { SpotifyTrackInfo } from '../spotify';
import {
  initialRevealState,
  toggleAtom as toggleAtomPure,
  revealAll as revealAllPure,
  resetReveal,
  type RevealState,
} from './revealState';

interface UseSpotifyPlaybackOptions {
  /** Current game phase from engine */
  phase: BuzzerPhase;
  /** Loaded tracks from the selected playlist */
  tracks: SpotifyTrackInfo[];
  /** Score needed to win */
  scoreCap: number;
  /** Current team scores */
  teamScores: number[];
  /** Function to play a track */
  playTrack: (uri: string) => Promise<void>;
  /** Function to pause playback */
  pause: () => Promise<void>;
  /** Function to resume playback */
  resume: () => Promise<void>;
  /** Whether the Spotify player is ready */
  isPlayerReady: boolean;
  /** Whether Spotify mode is active */
  isEnabled: boolean;
}

interface UseSpotifyPlaybackReturn {
  /** The currently playing track info */
  currentTrack: SpotifyTrackInfo | null;
  /** Current track number (1-indexed) */
  trackNumber: number;
  /** Total number of tracks in the playlist */
  totalTracks: number;
  /** Whether music is actively playing */
  isPlaying: boolean;
  /** Play the next random track (returns false if no more tracks) */
  playNextTrack: () => Promise<boolean>;
  /** Whether the game is over */
  isGameOver: boolean;
  /** Reason for game over */
  gameOverReason: 'score-cap' | 'playlist-empty' | null;
  /** Whether the current track answer has been revealed (correct answer given) */
  isRevealed: boolean;
  /** Mark the current track as revealed (call when answer is correct) */
  reveal: () => void;
  /** Set of atom ids currently revealed to players. */
  revealedAtoms: Set<string>;
  /** Toggles a single atom's reveal state. */
  toggleAtom: (atomId: string) => void;
  /** Flips every atom of the current track to revealed. */
  revealAll: () => void;
  /** Stop playback (call when ending game or closing player) */
  stop: () => Promise<void>;
  /** Reset playback state for a new game */
  reset: () => void;
  /** Number of unplayed tracks remaining in the playlist */
  remainingTracks: number;
  /** Reset playback state for replay (preserves played song history) */
  softReset: () => void;
}

/**
 * Hook that manages Spotify playback in sync with game phases.
 *
 * Behavior:
 * - armed: Resume playback (song plays while teams can buzz)
 * - locked: Pause playback (team buzzed, waiting for judgment)
 * - resolved: Stay paused (after judgment, before next round)
 * - idle/ready: No playback
 */
export function useSpotifyPlayback(
  options: UseSpotifyPlaybackOptions
): UseSpotifyPlaybackReturn {
  const {
    phase,
    tracks,
    scoreCap,
    teamScores,
    playTrack,
    pause,
    resume,
    isPlayerReady,
    isEnabled,
  } = options;

  // Track which songs have been played (by index)
  const [playedIndices, setPlayedIndices] = useState<Set<number>>(new Set());
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<
    'score-cap' | 'playlist-empty' | null
  >(null);
  const [revealState, setRevealState] =
    useState<RevealState>(initialRevealState);
  const isRevealed = revealState.isRevealed;
  const revealedAtoms = revealState.revealedAtoms;

  // Track previous phase to detect transitions
  const prevPhaseRef = useRef<BuzzerPhase>(phase);

  // Concurrency lock for playNextTrack to prevent overlapping calls
  const isPlayingNextRef = useRef(false);

  // Derived values
  const currentTrack =
    currentTrackIndex !== null ? (tracks[currentTrackIndex] ?? null) : null;
  const trackNumber = playedIndices.size;
  const totalTracks = tracks.length;
  const isGameOver = gameOverReason !== null;
  const remainingTracks = tracks.length - playedIndices.size;

  // Check if score cap is reached
  const scoreCapReached = teamScores.some((score) => score >= scoreCap);

  /**
   * Select a random unplayed track index.
   * Returns null if all tracks have been played.
   */
  const selectRandomTrack = useCallback((): number | null => {
    const availableIndices = tracks
      .map((_, i) => i)
      .filter((i) => !playedIndices.has(i));

    if (availableIndices.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    return availableIndices[randomIndex];
  }, [tracks, playedIndices]);

  /**
   * Play the next random track.
   * Returns true if a track was started, false if no more tracks.
   * Note: Only checks isPlayerReady, not isEnabled, to allow initial track start
   * during screen transition.
   */
  const playNextTrack = useCallback(async (): Promise<boolean> => {
    // Concurrency guard: prevent overlapping calls from rapid key presses
    if (isPlayingNextRef.current) {
      return false;
    }
    isPlayingNextRef.current = true;

    try {
      if (!isPlayerReady) {
        return false;
      }

      // Check end conditions first
      if (scoreCapReached) {
        setGameOverReason('score-cap');
        return false;
      }

      const nextIndex = selectRandomTrack();
      if (nextIndex === null) {
        setGameOverReason('playlist-empty');
        return false;
      }

      const track = tracks[nextIndex];
      if (!track) {
        return false;
      }

      try {
        await playTrack(track.uri);
        setCurrentTrackIndex(nextIndex);
        setPlayedIndices((prev) => new Set([...prev, nextIndex]));
        setIsPlaying(true);
        setRevealState(resetReveal); // Reset reveal state for new track
        return true;
      } catch (err) {
        console.error('[useSpotifyPlayback] Failed to play track:', err);
        return false;
      }
    } finally {
      isPlayingNextRef.current = false;
    }
  }, [isPlayerReady, scoreCapReached, selectRandomTrack, tracks, playTrack]);

  /**
   * Handle phase transitions for playback control.
   */
  useEffect(() => {
    if (!isEnabled || !isPlayerReady || currentTrack === null) {
      return;
    }

    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Only react to phase changes
    if (phase === prevPhase) {
      return;
    }

    const handlePhaseChange = async () => {
      // armed: Resume playback (team answered wrong, song continues)
      if (phase === 'armed' && prevPhase !== 'armed') {
        try {
          await resume();
          setIsPlaying(true);
        } catch (err) {
          console.error('[useSpotifyPlayback] Failed to resume:', err);
        }
      }

      // locked: Pause playback (team buzzed)
      if (phase === 'locked') {
        try {
          await pause();
          setIsPlaying(false);
        } catch (err) {
          console.error('[useSpotifyPlayback] Failed to pause:', err);
        }
      }

      // resolved: Resume playback (correct answer given, song continues until next round)
      if (phase === 'resolved' && prevPhase === 'locked') {
        try {
          await resume();
          setIsPlaying(true);
        } catch (err) {
          console.error('[useSpotifyPlayback] Failed to resume:', err);
        }
      }
    };

    handlePhaseChange();
  }, [phase, isEnabled, isPlayerReady, currentTrack, pause, resume]);

  /**
   * Check for game over conditions.
   */
  useEffect(() => {
    if (!isEnabled || isGameOver) {
      return;
    }

    if (scoreCapReached) {
      setGameOverReason('score-cap');
    }
  }, [isEnabled, isGameOver, scoreCapReached]);

  /**
   * Flip every atom of the current track to revealed (correct answer given).
   */
  const revealAll = useCallback(() => {
    setRevealState(revealAllPure);
  }, []);

  /**
   * Toggle a single atom's reveal state.
   */
  const toggleAtom = useCallback((atomId: string) => {
    setRevealState((prev) => toggleAtomPure(prev, atomId));
  }, []);

  /**
   * Mark the current track as revealed (correct answer given).
   * Back-compat alias for revealAll.
   */
  const reveal = revealAll;

  /**
   * Stop playback completely (e.g., when closing player or ending game).
   */
  const stop = useCallback(async () => {
    try {
      await pause();
      setIsPlaying(false);
    } catch (err) {
      console.error('[useSpotifyPlayback] Failed to stop:', err);
    }
  }, [pause]);

  /**
   * Reset playback state for a new game.
   */
  const reset = useCallback(() => {
    setPlayedIndices(new Set());
    setCurrentTrackIndex(null);
    setIsPlaying(false);
    setGameOverReason(null);
    setRevealState(resetReveal);
    isPlayingNextRef.current = false;
  }, []);

  /**
   * Reset playback state for replay (preserves played song history).
   */
  const softReset = useCallback(() => {
    setCurrentTrackIndex(null);
    setIsPlaying(false);
    setGameOverReason(null);
    setRevealState(resetReveal);
    isPlayingNextRef.current = false;
  }, []);

  return {
    currentTrack,
    trackNumber,
    totalTracks,
    remainingTracks,
    isPlaying,
    playNextTrack,
    isGameOver,
    gameOverReason,
    isRevealed,
    reveal,
    revealedAtoms,
    toggleAtom,
    revealAll,
    stop,
    reset,
    softReset,
  };
}
