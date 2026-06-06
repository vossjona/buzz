// ABOUTME: Album art display for the Player window in Spotify mode.
// ABOUTME: Atom-aware: each metadata atom renders at its final-layout position,
// ABOUTME: with visibility controlled by the revealedAtoms set.

import { buildAtoms } from '../spotify/atoms';
import type { SpotifyTrackInfo } from '../spotify';
import { AtomToken } from './AtomToken';
import styles from './AlbumArtDisplay.module.css';

interface AlbumArtDisplayProps {
  albumArtUrl: string | null;
  isPlaying: boolean;
  trackNumber: number;
  totalTracks: number;
  /** Kept as a compatibility fast-path; if true, every atom is treated as revealed. */
  isRevealed: boolean;
  trackName: string | null;
  trackArtists: string[];
  releaseYear: string | null;
  albumName: string | null;
  revealedAtoms: Set<string>;
}

export function AlbumArtDisplay({
  albumArtUrl,
  isPlaying,
  trackNumber,
  totalTracks,
  isRevealed,
  trackName,
  trackArtists,
  releaseYear,
  albumName,
  revealedAtoms,
}: AlbumArtDisplayProps) {
  const track: SpotifyTrackInfo | null = trackName
    ? {
        uri: '',
        name: trackName,
        artists: trackArtists,
        albumName: albumName ?? '',
        albumArtUrl,
        durationMs: 0,
        releaseYear,
      }
    : null;

  const atoms = track ? buildAtoms(track) : [];
  const isBroadcast = (id: string) => isRevealed || revealedAtoms.has(id);

  const titleAtoms = atoms.filter((a) => a.field === 'title');
  const artistAtoms = atoms.filter((a) => a.field === 'artist');
  const albumAtoms = atoms.filter((a) => a.field === 'album');
  const yearAtom = atoms.find((a) => a.field === 'year');
  const coverAtom = atoms.find((a) => a.field === 'cover');

  return (
    <div className={styles.albumArtDisplay}>
      <div className={styles.albumArtContainer}>
        {coverAtom && isBroadcast(coverAtom.id) ? (
          <img
            src={coverAtom.content}
            alt="Album artwork"
            className={styles.albumArtImage}
          />
        ) : (
          <div className={styles.albumArtPlaceholder}>
            <span className={styles.musicIcon}>🎵</span>
          </div>
        )}

        {isPlaying && (
          <div className={styles.musicBars}>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
            <div className={styles.bar}></div>
          </div>
        )}

        {!isPlaying && trackNumber > 0 && (
          <div className={styles.pausedIndicator}>
            <span className={styles.pauseIcon}>⏸</span>
          </div>
        )}
      </div>

      {track && (
        <div className={styles.revealedTrackInfo}>
          <div className={styles.titleRow}>
            {titleAtoms.map((a) => (
              <AtomToken
                key={a.id}
                content={a.content}
                broadcast={isBroadcast(a.id)}
              />
            ))}
          </div>
          <div className={styles.artistRow}>
            {artistAtoms.map((a) => (
              <AtomToken
                key={a.id}
                content={a.content}
                broadcast={isBroadcast(a.id)}
              />
            ))}
          </div>
          <div className={styles.albumRow}>
            {albumAtoms.map((a) => (
              <AtomToken
                key={a.id}
                content={a.content}
                broadcast={isBroadcast(a.id)}
              />
            ))}
          </div>
          {yearAtom && (
            <div className={styles.yearRow}>
              <AtomToken
                content={yearAtom.content}
                broadcast={isBroadcast(yearAtom.id)}
                variant="scalar"
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.trackCounter}>
        <span className={styles.trackLabel}>Song</span>
        <span className={styles.trackNumber}>{trackNumber}</span>
        <span className={styles.trackSeparator}>/</span>
        <span className={styles.trackTotal}>{totalTracks}</span>
      </div>
    </div>
  );
}
