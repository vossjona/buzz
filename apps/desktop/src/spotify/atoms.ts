// ABOUTME: Splits a Spotify track into clickable "atoms" for the host hint surface.
// ABOUTME: Text fields split on whitespace; images and scalars become whole-value atoms.

import type { SpotifyTrackInfo } from './types';

export type AtomField = 'title' | 'artist' | 'cover' | 'year' | 'album';

export type AtomId = string;

export interface Atom {
  id: AtomId;
  field: AtomField;
  /** Rendered content: the word for text fields, the URL for cover, the value for year. */
  content: string;
}

function splitWords(value: string): string[] {
  return value.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Builds the ordered atom list for a track.
 * Order: title → artist(s) → album → year → cover.
 */
export function buildAtoms(track: SpotifyTrackInfo): Atom[] {
  const atoms: Atom[] = [];

  splitWords(track.name).forEach((word, i) => {
    atoms.push({ id: `title:${i}`, field: 'title', content: word });
  });

  track.artists.forEach((artist, ai) => {
    splitWords(artist).forEach((word, wi) => {
      atoms.push({ id: `artist:${ai}:${wi}`, field: 'artist', content: word });
    });
  });

  splitWords(track.albumName).forEach((word, i) => {
    atoms.push({ id: `album:${i}`, field: 'album', content: word });
  });

  if (track.releaseYear !== null) {
    atoms.push({ id: 'year', field: 'year', content: track.releaseYear });
  }

  if (track.albumArtUrl !== null) {
    atoms.push({ id: 'cover', field: 'cover', content: track.albumArtUrl });
  }

  return atoms;
}
