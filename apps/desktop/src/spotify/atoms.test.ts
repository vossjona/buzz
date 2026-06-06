// ABOUTME: Tests for the atom splitter utility.
// ABOUTME: Covers word-split of text fields and single-atom treatment of image/scalar fields.

import { describe, it, expect } from 'vitest';
import { buildAtoms } from './atoms';
import type { SpotifyTrackInfo } from './types';

const sampleTrack: SpotifyTrackInfo = {
  uri: 'spotify:track:1',
  name: 'Oops... I did it again!',
  artists: ['Britney Spears'],
  albumName: 'Oops!... I Did It Again',
  albumArtUrl: 'https://example.com/a.jpg',
  durationMs: 210000,
  releaseYear: '2000',
};

describe('buildAtoms', () => {
  it('splits the title on whitespace, one atom per word', () => {
    const atoms = buildAtoms(sampleTrack);
    const titleAtoms = atoms.filter((a) => a.field === 'title');
    expect(titleAtoms.map((a) => a.content)).toEqual([
      'Oops...',
      'I',
      'did',
      'it',
      'again!',
    ]);
    expect(titleAtoms.map((a) => a.id)).toEqual([
      'title:0',
      'title:1',
      'title:2',
      'title:3',
      'title:4',
    ]);
  });

  it('splits artist names on whitespace across multiple artists', () => {
    const track = { ...sampleTrack, artists: ['Lady Gaga', 'Bradley Cooper'] };
    const atoms = buildAtoms(track);
    const artistAtoms = atoms.filter((a) => a.field === 'artist');
    expect(artistAtoms.map((a) => a.content)).toEqual([
      'Lady',
      'Gaga',
      'Bradley',
      'Cooper',
    ]);
    expect(artistAtoms.map((a) => a.id)).toEqual([
      'artist:0:0',
      'artist:0:1',
      'artist:1:0',
      'artist:1:1',
    ]);
  });

  it('emits one cover atom when albumArtUrl is present', () => {
    const atoms = buildAtoms(sampleTrack);
    const cover = atoms.find((a) => a.field === 'cover');
    expect(cover?.id).toBe('cover');
    expect(cover?.content).toBe('https://example.com/a.jpg');
  });

  it('omits the cover atom when albumArtUrl is null', () => {
    const atoms = buildAtoms({ ...sampleTrack, albumArtUrl: null });
    expect(atoms.find((a) => a.field === 'cover')).toBeUndefined();
  });

  it('emits one year atom when releaseYear is present', () => {
    const atoms = buildAtoms(sampleTrack);
    const year = atoms.find((a) => a.field === 'year');
    expect(year?.id).toBe('year');
    expect(year?.content).toBe('2000');
  });

  it('omits the year atom when releaseYear is null', () => {
    const atoms = buildAtoms({ ...sampleTrack, releaseYear: null });
    expect(atoms.find((a) => a.field === 'year')).toBeUndefined();
  });

  it('splits album name on whitespace', () => {
    const atoms = buildAtoms(sampleTrack);
    const albumAtoms = atoms.filter((a) => a.field === 'album');
    expect(albumAtoms.map((a) => a.content)).toEqual([
      'Oops!...',
      'I',
      'Did',
      'It',
      'Again',
    ]);
    expect(albumAtoms[0].id).toBe('album:0');
  });

  it('collapses runs of whitespace (no empty atoms)', () => {
    const track = { ...sampleTrack, name: 'Hello   world' };
    const atoms = buildAtoms(track).filter((a) => a.field === 'title');
    expect(atoms.map((a) => a.content)).toEqual(['Hello', 'world']);
  });
});
