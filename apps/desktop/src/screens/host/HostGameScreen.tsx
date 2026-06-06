// ABOUTME: Host-side game screen showing the current Spotify track and controls.
// ABOUTME: Displays all information the host needs to run a song-quiz round.

import { BuzzerState } from '@buzz/engine';
import { AtomToken } from '../../components/AtomToken';
import { HostActionButton } from '../../components/HostActionButton';
import { ProgressBar } from '../../components/ProgressBar';
import { TeamScoreRow } from '../../components/TeamScoreRow';
import { getTeamConfig } from '../../constants/teams';
import type { SpotifyTrackInfo } from '../../spotify';
import { buildAtoms } from '../../spotify/atoms';
import { getLockedInTeams } from '../../utils/teamUtils';
import styles from './HostGameScreen.module.css';

interface SpotifyPlaybackState {
  currentTrack: SpotifyTrackInfo | null;
  trackNumber: number;
  totalTracks: number;
  isPlaying: boolean;
  isRevealed: boolean;
  revealedAtoms: Set<string>;
}

interface HostGameScreenProps {
  engineState: BuzzerState;
  /** Spotify playback state */
  spotifyPlayback: SpotifyPlaybackState;
  /** Adjust a team's score by ±1 */
  onAdjustScore: (teamId: string, delta: -1 | 1) => void;
  /** Toggle broadcast of a single Spotify atom (host-only reveal). */
  onToggleAtom: (atomId: string) => void;
  /** Seek the current Spotify track to a specific position (ms). */
  onSeek: (positionMs: number) => void;
  /** Spotify playback timing data for progress-bar extrapolation. */
  playback: { lastPositionMs: number; lastPositionStampMs: number };
  /** Mark the current answer correct. */
  onMarkCorrect: () => void;
  /** Mark the current answer wrong. */
  onMarkWrong: () => void;
  /** Reveal the Spotify track info to players. */
  onReveal: () => void;
  /** Advance to the next song. */
  onNext: () => void;
  /** End the game and jump to the final screen. */
  onEndGame: () => void;
}

export function HostGameScreen({
  engineState,
  spotifyPlayback,
  onAdjustScore,
  onToggleAtom,
  onSeek,
  playback,
  onMarkCorrect,
  onMarkWrong,
  onReveal,
  onNext,
  onEndGame,
}: HostGameScreenProps) {
  const { phase, activeTeamId, teams } = engineState;
  const activeTeamConfig = activeTeamId ? getTeamConfig(activeTeamId) : null;

  // Only show teams that locked in during setup
  const lockedInTeams = getLockedInTeams(teams);

  const currentTrack = spotifyPlayback.currentTrack;

  const phaseClass: Record<string, string> = {
    armed: styles.phaseArmed,
    locked: styles.phaseLocked,
    resolved: styles.phaseResolved,
  };

  const isRevealed = spotifyPlayback.isRevealed;
  const showRevealHint =
    !isRevealed && (phase === 'armed' || phase === 'locked');
  const nLabel = isRevealed ? 'Next Song' : 'Skip';

  return (
    <div className={styles.hostGameScreen}>
      {/* Track counter */}
      <div className={styles.hostQuestionHeader}>
        <span className={styles.questionNumber}>
          Song {spotifyPlayback.trackNumber}/{spotifyPlayback.totalTracks}
        </span>
        <span className={`${styles.phaseBadge} ${phaseClass[phase] ?? ''}`}>
          {phase.toUpperCase()}
        </span>
        <span
          className={`${styles.playbackIndicator} ${spotifyPlayback.isPlaying ? styles.playing : styles.paused}`}
        >
          {spotifyPlayback.isPlaying ? '▶ Playing' : '⏸ Paused'}
        </span>
      </div>

      {/* Track info — host always sees title/artist/album/year so they can judge */}
      {currentTrack ? (
        (() => {
          const atoms = buildAtoms(currentTrack);
          const isBroadcast = (id: string) =>
            spotifyPlayback.isRevealed || spotifyPlayback.revealedAtoms.has(id);
          const titleAtoms = atoms.filter((a) => a.field === 'title');
          const artistAtoms = atoms.filter((a) => a.field === 'artist');
          const albumAtoms = atoms.filter((a) => a.field === 'album');
          const yearAtom = atoms.find((a) => a.field === 'year');
          const coverAtom = atoms.find((a) => a.field === 'cover');
          return (
            <div className={styles.hostSpotifySection}>
              {coverAtom && (
                <button
                  type="button"
                  className={`${styles.hostAlbumArt} ${
                    isBroadcast(coverAtom.id)
                      ? styles.coverBroadcast
                      : styles.coverHidden
                  }`}
                  onClick={() => onToggleAtom(coverAtom.id)}
                  aria-label={
                    isBroadcast(coverAtom.id)
                      ? 'Hide cover from players'
                      : 'Reveal cover to players'
                  }
                >
                  <img src={coverAtom.content} alt="Album artwork" />
                </button>
              )}
              <div className={styles.hostTrackInfo}>
                <h2>Song Info (Host Only — click to reveal)</h2>
                <div className={styles.hostAtomRow}>
                  {titleAtoms.map((a) => (
                    <AtomToken
                      key={a.id}
                      content={a.content}
                      broadcast={isBroadcast(a.id)}
                      onClick={() => onToggleAtom(a.id)}
                    />
                  ))}
                </div>
                <div className={styles.hostAtomRow}>
                  {artistAtoms.map((a) => (
                    <AtomToken
                      key={a.id}
                      content={a.content}
                      broadcast={isBroadcast(a.id)}
                      onClick={() => onToggleAtom(a.id)}
                    />
                  ))}
                </div>
                <div className={styles.hostAtomRow}>
                  {albumAtoms.map((a) => (
                    <AtomToken
                      key={a.id}
                      content={a.content}
                      broadcast={isBroadcast(a.id)}
                      onClick={() => onToggleAtom(a.id)}
                    />
                  ))}
                </div>
                {yearAtom && (
                  <div className={styles.hostYearRow}>
                    <AtomToken
                      content={yearAtom.content}
                      broadcast={isBroadcast(yearAtom.id)}
                      onClick={() => onToggleAtom(yearAtom.id)}
                      variant="scalar"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        <div className={styles.hostSpotifySection}>
          <div className={styles.hostTrackInfo}>
            <h2>Waiting for Song</h2>
            <p>🎵 No song playing yet</p>
          </div>
        </div>
      )}

      {currentTrack && (
        <ProgressBar
          lastPositionMs={playback.lastPositionMs}
          lastPositionStampMs={playback.lastPositionStampMs}
          durationMs={currentTrack.durationMs}
          isPlaying={spotifyPlayback.isPlaying}
          onSeek={onSeek}
        />
      )}

      {/* Buzzed team indicator */}
      {phase === 'locked' && activeTeamConfig && (
        <div
          className={styles.hostBuzzedSection}
          style={
            { '--team-color': activeTeamConfig.color } as React.CSSProperties
          }
        >
          <span className={styles.buzzedLabel}>
            {activeTeamConfig.name} buzzed!
          </span>
        </div>
      )}

      {/* Team scores sidebar */}
      <div className={styles.hostScoresSection}>
        <h2>Scores</h2>
        <div className={styles.hostScoreList}>
          {lockedInTeams.map((team) => (
            <TeamScoreRow
              key={team.id}
              team={team}
              isActive={activeTeamId === team.id}
              onAdjust={(delta) => onAdjustScore(team.id, delta)}
            />
          ))}
        </div>
      </div>

      {/* Host controls */}
      <div className="hostControls">
        {(() => {
          if (phase === 'armed') {
            return (
              <div className={styles.hintRow}>
                {showRevealHint && (
                  <HostActionButton
                    keyName="R"
                    label="Reveal"
                    onClick={onReveal}
                  />
                )}
                <HostActionButton keyName="N" label={nLabel} onClick={onNext} />
                <HostActionButton
                  keyName="Esc"
                  label="End Game"
                  onClick={onEndGame}
                />
              </div>
            );
          }
          if (phase === 'locked') {
            return (
              <div className={styles.hintRow}>
                <HostActionButton
                  keyName="C"
                  label="Correct"
                  onClick={onMarkCorrect}
                />
                <HostActionButton
                  keyName="W"
                  label="Wrong"
                  onClick={onMarkWrong}
                />
                {showRevealHint && (
                  <HostActionButton
                    keyName="R"
                    label="Reveal"
                    onClick={onReveal}
                  />
                )}
                <HostActionButton keyName="N" label={nLabel} onClick={onNext} />
                <HostActionButton
                  keyName="Esc"
                  label="End Game"
                  onClick={onEndGame}
                />
              </div>
            );
          }
          return (
            <div className={styles.hintRow}>
              <HostActionButton keyName="N" label="Next" onClick={onNext} />
              <HostActionButton
                keyName="Esc"
                label="End Game"
                onClick={onEndGame}
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
