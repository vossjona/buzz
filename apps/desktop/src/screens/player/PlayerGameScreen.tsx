// ABOUTME: Player-side game screen showing album art and team corners.
// ABOUTME: Display-only view without host controls or answer details.

import { BuzzerState } from '@buzz/engine';
import { TeamCorners } from '../../components/TeamCorners';
import { BuzzFrame } from '../../components/BuzzFrame';
import { AlbumArtDisplay } from '../../components/AlbumArtDisplay';
import { getTeamConfig } from '../../constants/teams';
import { SpotifyDisplayState, CountdownState } from '../../events/types';
import { AnswerResult } from '../../hooks/useGameState';
import {
  progressToPulseDuration,
  progressToPulseIntensity,
} from '../../hooks/useAnswerCountdown';
import { getLockedInTeams } from '../../utils/teamUtils';

interface PlayerGameScreenProps {
  engineState: BuzzerState;
  lastAnswerResult: AnswerResult | null;
  /** Spotify display state */
  spotify: SpotifyDisplayState;
  /** Answer countdown state (for pulse animation intensity) */
  countdown?: CountdownState;
}

export function PlayerGameScreen({
  engineState,
  lastAnswerResult,
  spotify,
  countdown,
}: PlayerGameScreenProps) {
  const { phase, activeTeamId, teams, eliminatedThisRound } = engineState;
  const activeTeamConfig = activeTeamId ? getTeamConfig(activeTeamId) : null;

  // Only show teams that locked in during setup
  const lockedInTeams = getLockedInTeams(teams);

  // Determine if corners should pulse (armed phase)
  const isPulsing = phase === 'armed';

  return (
    <div className="screen gameScreen">
      <AlbumArtDisplay
        albumArtUrl={spotify.albumArtUrl}
        isPlaying={spotify.isPlaying}
        trackNumber={spotify.trackNumber}
        totalTracks={spotify.totalTracks}
        isRevealed={spotify.isRevealed}
        trackName={spotify.trackName}
        trackArtists={spotify.trackArtists}
        releaseYear={spotify.releaseYear}
        albumName={spotify.albumName}
        revealedAtoms={new Set(spotify.revealedAtoms)}
      />

      <TeamCorners
        teams={lockedInTeams}
        activeTeamId={activeTeamId}
        isPulsing={isPulsing}
        eliminatedTeamIds={eliminatedThisRound}
        lastAnswerResult={lastAnswerResult}
      />

      {/* Buzz overlay when a team has buzzed */}
      {phase === 'locked' && activeTeamConfig && (
        <BuzzFrame
          color={activeTeamConfig.color}
          teamName={activeTeamConfig.name}
          pulseDuration={
            countdown?.isRunning
              ? progressToPulseDuration(countdown.progress)
              : undefined
          }
          pulseIntensity={
            countdown?.isRunning
              ? progressToPulseIntensity(countdown.progress)
              : undefined
          }
        />
      )}

      {/* No host controls shown on player view */}
    </div>
  );
}
