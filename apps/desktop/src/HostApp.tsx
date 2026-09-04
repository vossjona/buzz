// ABOUTME: Host window orchestrator component.
// ABOUTME: Wires hooks together and routes to the correct screen — contains no business logic.

import { useCallback, useMemo, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useGameSetup } from './hooks/useGameSetup';
import { useHostInput } from './hooks/useHostInput';
import { useBuzzerPairing } from './hooks/useBuzzerPairing';
import { usePlayerWindow } from './hooks/usePlayerWindow';
import { useStateEmitter } from './hooks/useStateEmitter';
import { useSpotify } from './hooks/useSpotify';
import { useSpotifyPlayback } from './hooks/useSpotifyPlayback';
import { useSpotifySetup } from './hooks/useSpotifySetup';
import {
  useAnswerCountdown,
  progressToPulseDuration,
  remainingMsToTimeoutIntroStep,
} from './hooks/useAnswerCountdown';
import { useCountdownAudio } from './hooks/useCountdownAudio';
import { useAnswerFeedbackAudio } from './hooks/useAnswerFeedbackAudio';
import { useTimesUpAudio } from './hooks/useTimesUpAudio';
import { useGameStartIntro } from './hooks/useGameStartIntro';
import { SequenceOverlay } from './components/SequenceOverlay';
import type { IntroState } from './events/types';
import { HostSetupScreen } from './screens/host/HostSetupScreen';
import { HostGameScreen } from './screens/host/HostGameScreen';
import { HostFinalScreen } from './screens/host/HostFinalScreen';
import { SpotifyClientIdScreen } from './screens/host/SpotifyClientIdScreen';
import { getLockedInTeams } from './utils/teamUtils';

const GAME_START_INTRO_STEPS: [string, string, string] = [
  'Ready',
  'Set',
  'Go!',
];
const TIMEOUT_INTRO_STEPS: [string, string, string] = ['3', '2', '1'];

export function HostApp() {
  const {
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
  } = useGameSetup();

  // Spotify integration
  const spotify = useSpotify();

  // The Client ID screen blocks everything else on first run and while editing.
  const [isEditingClientId, setIsEditingClientId] = useState(false);
  const showClientIdScreen = spotify.clientId === null || isEditingClientId;

  const handleSaveClientId = useCallback(
    (raw: string) => {
      const error = spotify.saveClientId(raw);
      if (!error) setIsEditingClientId(false);
      return error;
    },
    [spotify]
  );

  const {
    engineState,
    screen,
    lastAnswerResult,
    roundResults,
    dispatch,
    setScreen,
    resetGame,
    recordRoundResult,
  } = useGameState();

  const {
    isOpen: isPlayerOpen,
    isReady: isPlayerReady,
    openPlayer,
    closePlayer,
  } = usePlayerWindow();

  // Audio feedback for correct/wrong answers
  const { playCorrectSound, playWrongSound } = useAnswerFeedbackAudio({
    isEnabled: true,
  });

  // Distinct sound for "time's up" (separate from a host-marked wrong answer)
  const { playTimesUpSound } = useTimesUpAudio({ isEnabled: true });

  // Answer countdown timer - plays the "time's up" sound when time expires (host must still judge)
  const handleAnswerTimeout = useCallback(() => {
    playTimesUpSound();
  }, [playTimesUpSound]);

  const {
    progress: countdownProgress,
    isRunning: countdownIsRunning,
    remainingMs: countdownRemainingMs,
  } = useAnswerCountdown({
    isActive: engineState.phase === 'locked' && screen === 'game',
    durationSeconds: answerTimeoutSeconds,
    onTimeout: handleAnswerTimeout,
  });

  const timeoutIntroStep = remainingMsToTimeoutIntroStep(countdownRemainingMs);

  // Game-start "Ready, Set, Go!" intro sequence
  const { introStep: gameStartIntroStep, startIntro: startGameStartIntro } =
    useGameStartIntro();

  const intro: IntroState | null =
    gameStartIntroStep !== null
      ? { kind: 'gameStart', step: gameStartIntroStep }
      : timeoutIntroStep !== null
        ? { kind: 'answerCountdown', step: timeoutIntroStep }
        : null;

  // Calculate pulse duration for audio sync
  const pulseDuration = progressToPulseDuration(countdownProgress);

  // Audio feedback for countdown (synced with pulse animation)
  useCountdownAudio({
    pulseDurationSeconds: pulseDuration,
    progress: countdownProgress,
    isActive: countdownIsRunning,
    isEnabled: answerTimeoutSeconds > 0,
  });

  // Get team scores for playback control
  const teamScores = useMemo(
    () => engineState.teams.map((t) => t.score),
    [engineState.teams]
  );

  // Spotify playback control during the game
  const spotifyPlayback = useSpotifyPlayback({
    phase: engineState.phase,
    tracks: spotifyTracks,
    scoreCap,
    teamScores,
    playTrack: spotify.playTrack,
    pause: spotify.pause,
    resume: spotify.resume,
    isPlayerReady: spotify.isReady,
    isEnabled: screen === 'game',
  });

  const { handleSelectPlaylist, handleResetGame, handleClosePlayer } =
    useSpotifySetup({
      spotify,
      spotifyPlayback,
      screen,
      enginePhase: engineState.phase,
      setSpotifyTracks,
      setSelectedPlaylist,
      setIsLoadingTracks,
      recordRoundResult,
      setScreen,
      resetGame,
      closePlayer,
    });

  // Emit state to player window (only when player is ready to receive)
  useStateEmitter({
    engineState,
    screen,
    lastAnswerResult,
    isPlayerReady,
    spotify: {
      albumArtUrl: spotifyPlayback.currentTrack?.albumArtUrl ?? null,
      isPlaying: spotifyPlayback.isPlaying,
      trackNumber: spotifyPlayback.trackNumber,
      totalTracks: spotifyPlayback.totalTracks,
      isRevealed: spotifyPlayback.isRevealed,
      trackName: spotifyPlayback.currentTrack?.name ?? null,
      trackArtists: spotifyPlayback.currentTrack?.artists ?? [],
      revealedAtoms: Array.from(spotifyPlayback.revealedAtoms),
      releaseYear: spotifyPlayback.currentTrack?.releaseYear ?? null,
      albumName: spotifyPlayback.currentTrack?.albumName ?? null,
    },
    countdown: countdownIsRunning
      ? {
          progress: countdownProgress,
          isRunning: countdownIsRunning,
        }
      : undefined,
    roundResults,
    intro,
  });

  // Host action callbacks — shared between keyboard shortcuts and on-screen buttons.
  const onMarkCorrect = useCallback(() => {
    playCorrectSound();
    dispatch({ type: 'ANSWER_MARKED', correct: true });
    spotifyPlayback.reveal();
  }, [playCorrectSound, dispatch, spotifyPlayback]);

  const onMarkWrong = useCallback(() => {
    playWrongSound();
    dispatch({ type: 'ANSWER_MARKED', correct: false });
  }, [playWrongSound, dispatch]);

  const onReveal = useCallback(() => {
    if (!spotifyPlayback.isRevealed) {
      spotifyPlayback.reveal();
    }
  }, [spotifyPlayback]);

  const onNext = useCallback(async () => {
    const track = spotifyPlayback.currentTrack;
    recordRoundResult(track?.name ?? '', track?.artists[0] ?? '');
    const hasMore = await spotifyPlayback.playNextTrack();
    if (hasMore) {
      dispatch({ type: 'NEXT_ROUND' });
    }
  }, [spotifyPlayback, recordRoundResult, dispatch]);

  const onStartGame = useCallback(() => {
    const lockedInCount = getLockedInTeams(engineState.teams).length;
    if (lockedInCount < 2) return;
    dispatch({ type: 'START_GAME' });
    setScreen('game');

    // The first track only starts after the "Ready, Set, Go!" intro completes.
    startGameStartIntro(() => {
      if (spotify.isReady) {
        void spotifyPlayback.playNextTrack();
      }
    });
  }, [
    engineState.teams,
    dispatch,
    setScreen,
    spotify.isReady,
    spotifyPlayback,
    startGameStartIntro,
  ]);

  const onEndGame = useCallback(async () => {
    const track = spotifyPlayback.currentTrack;
    recordRoundResult(track?.name ?? '', track?.artists[0] ?? '');
    await spotifyPlayback.stop();
    setScreen('final');
  }, [spotifyPlayback, recordRoundResult, setScreen]);

  useHostInput({
    screen,
    engineState,
    dispatch,
    isPlayerOpen,
    isEnabled: !showClientIdScreen,
    onMarkCorrect,
    onMarkWrong,
    onReveal,
    onNext,
    onStartGame,
    onEndGame,
    getPlaybackSnapshot: () => {
      const track = spotifyPlayback.currentTrack;
      const baseMs = spotify.lastPositionMs;
      const stamp = spotify.lastPositionStampMs;
      const extrapolated = spotifyPlayback.isPlaying
        ? baseMs + (Date.now() - stamp)
        : baseMs;
      return {
        positionMs: Math.max(0, extrapolated),
        durationMs: track?.durationMs ?? 0,
      };
    },
    seek: spotify.seek,
  });

  // USB HID buzzer pairing
  const buzzerPairing = useBuzzerPairing();

  // Spotify setup state object for HostSetupScreen
  const spotifySetupState = {
    isConnected: spotify.isReady,
    isConnecting: spotify.isAuthenticating,
    playlists: spotify.playlists,
    isLoadingPlaylists: spotify.isLoadingPlaylists || isLoadingTracks,
    selectedPlaylist,
    scoreCap,
    error: spotify.error,
    remainingTracks:
      spotifyTracks.length > 0 &&
      spotifyPlayback.remainingTracks < spotifyTracks.length
        ? spotifyPlayback.remainingTracks
        : null,
  };

  if (showClientIdScreen) {
    return (
      <div className="app hostApp">
        <SpotifyClientIdScreen
          currentClientId={spotify.clientId}
          onSave={handleSaveClientId}
          onCancel={
            spotify.clientId ? () => setIsEditingClientId(false) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="app hostApp">
      <SequenceOverlay
        steps={GAME_START_INTRO_STEPS}
        currentStep={intro?.kind === 'gameStart' ? intro.step : null}
        color="var(--color-text)"
      />
      <SequenceOverlay
        steps={TIMEOUT_INTRO_STEPS}
        currentStep={intro?.kind === 'answerCountdown' ? intro.step : null}
        color="var(--buzz-color)"
      />
      {screen === 'setup' && (
        <HostSetupScreen
          engineState={engineState}
          isPlayerOpen={isPlayerOpen}
          onOpenPlayer={openPlayer}
          spotifyState={spotifySetupState}
          onSpotifyConnect={spotify.login}
          onSpotifyDisconnect={spotify.logout}
          onSelectPlaylist={handleSelectPlaylist}
          onScoreCapChange={setScoreCap}
          answerTimeoutSeconds={answerTimeoutSeconds}
          onAnswerTimeoutChange={setAnswerTimeoutSeconds}
          buzzerPairing={buzzerPairing}
          onStartGame={onStartGame}
          onOpenSpotifySettings={() => setIsEditingClientId(true)}
        />
      )}
      {screen === 'game' && (
        <HostGameScreen
          engineState={engineState}
          spotifyPlayback={{
            currentTrack: spotifyPlayback.currentTrack,
            trackNumber: spotifyPlayback.trackNumber,
            totalTracks: spotifyPlayback.totalTracks,
            isPlaying: spotifyPlayback.isPlaying,
            isRevealed: spotifyPlayback.isRevealed,
            revealedAtoms: spotifyPlayback.revealedAtoms,
          }}
          onAdjustScore={(teamId, delta) =>
            dispatch({ type: 'SCORE_ADJUSTED', teamId, delta })
          }
          onToggleAtom={(id) => spotifyPlayback.toggleAtom(id)}
          onSeek={spotify.seek}
          playback={{
            lastPositionMs: spotify.lastPositionMs,
            lastPositionStampMs: spotify.lastPositionStampMs,
          }}
          onMarkCorrect={onMarkCorrect}
          onMarkWrong={onMarkWrong}
          onReveal={onReveal}
          onNext={onNext}
          onEndGame={onEndGame}
        />
      )}
      {screen === 'final' && (
        <HostFinalScreen
          teams={engineState.teams}
          roundResults={roundResults}
          isPlayerOpen={isPlayerOpen}
          onClosePlayer={handleClosePlayer}
          onResetGame={handleResetGame}
        />
      )}
    </div>
  );
}
