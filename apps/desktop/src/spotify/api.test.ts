// ABOUTME: Unit tests for the pure Spotify API helpers.
// ABOUTME: Covers playlist/track mapping and offset-pagination orchestration.

import { describe, it, expect } from 'vitest';
import {
  canLoadPlaylistItems,
  mapPlaylistEntry,
  mapToPlaylistSummary,
  mapToTrackInfo,
  paginateAll,
} from './api';

describe('mapToPlaylistSummary', () => {
  it('maps SDK playlist shape to SpotifyPlaylistSummary', () => {
    const result = mapToPlaylistSummary({
      id: 'pl1',
      name: 'My Mix',
      tracks: { total: 42, href: '' },
      images: [{ url: 'https://img/1.jpg', height: 300, width: 300 }],
    });
    expect(result).toEqual({
      id: 'pl1',
      name: 'My Mix',
      trackCount: 42,
      imageUrl: 'https://img/1.jpg',
    });
  });

  it('returns null imageUrl when no images', () => {
    const result = mapToPlaylistSummary({
      id: 'pl2',
      name: 'Empty',
      tracks: { total: 0, href: '' },
      images: [],
    });
    expect(result.imageUrl).toBeNull();
  });

  it('returns null imageUrl when images is null', () => {
    const result = mapToPlaylistSummary({
      id: 'pl3',
      name: 'Null Images',
      tracks: { total: 0, href: '' },
      images: null,
    });
    expect(result.imageUrl).toBeNull();
  });

  it('reads the track count from items (Spotify apps created after February 2026)', () => {
    const result = mapToPlaylistSummary({
      id: 'pl4',
      name: 'New Shape',
      items: { total: 7, href: '' },
      images: null,
    });
    expect(result.trackCount).toBe(7);
  });

  it('prefers items over the deprecated tracks field when both are present', () => {
    const result = mapToPlaylistSummary({
      id: 'pl5',
      name: 'Both',
      items: { total: 7, href: '' },
      tracks: { total: 3, href: '' },
      images: null,
    });
    expect(result.trackCount).toBe(7);
  });
});

describe('mapPlaylistEntry', () => {
  const track = {
    uri: 'spotify:track:abc',
    name: 'Song',
    artists: [{ name: 'Artist' }],
    album: { name: 'Album', images: null },
    duration_ms: 1000,
    is_local: false,
  };

  it('reads the nested object from item (Spotify apps created after February 2026)', () => {
    expect(mapPlaylistEntry({ item: track })?.uri).toBe('spotify:track:abc');
  });

  it('reads the nested object from track (older Spotify apps)', () => {
    expect(mapPlaylistEntry({ track })?.uri).toBe('spotify:track:abc');
  });

  it('returns null for an empty slot', () => {
    expect(mapPlaylistEntry({ item: null })).toBeNull();
  });
});

describe('mapToTrackInfo', () => {
  const base = {
    uri: 'spotify:track:abc',
    name: 'Song',
    artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
    album: {
      name: 'Album',
      images: [
        { url: 'https://img/large.jpg', height: 640, width: 640 },
        { url: 'https://img/med.jpg', height: 300, width: 300 },
        { url: 'https://img/small.jpg', height: 64, width: 64 },
      ],
    },
    duration_ms: 200000,
    is_local: false,
  };

  it('prefers 300x300 album art', () => {
    expect(mapToTrackInfo(base)?.albumArtUrl).toBe('https://img/med.jpg');
  });

  it('falls back to 640px when 300px is missing', () => {
    const no300 = {
      ...base,
      album: {
        ...base.album,
        images: base.album.images.filter((i) => i.height !== 300),
      },
    };
    expect(mapToTrackInfo(no300)?.albumArtUrl).toBe('https://img/large.jpg');
  });

  it('falls back to the first image when neither 300 nor 640 exists', () => {
    const onlyFirst = {
      ...base,
      album: {
        ...base.album,
        images: [{ url: 'only.jpg', height: 100, width: 100 }],
      },
    };
    expect(mapToTrackInfo(onlyFirst)?.albumArtUrl).toBe('only.jpg');
  });

  it('returns null albumArtUrl when no images exist', () => {
    const noImgs = { ...base, album: { ...base.album, images: [] } };
    expect(mapToTrackInfo(noImgs)?.albumArtUrl).toBeNull();
  });

  it('returns null albumArtUrl when images is null', () => {
    const nullImgs = { ...base, album: { ...base.album, images: null } };
    expect(mapToTrackInfo(nullImgs)?.albumArtUrl).toBeNull();
  });

  it('returns null for local tracks', () => {
    expect(mapToTrackInfo({ ...base, is_local: true })).toBeNull();
  });

  it('returns null for null input (empty slot in playlist)', () => {
    expect(mapToTrackInfo(null)).toBeNull();
  });

  it('maps every field correctly', () => {
    expect(mapToTrackInfo(base)).toEqual({
      uri: 'spotify:track:abc',
      name: 'Song',
      artists: ['Artist A', 'Artist B'],
      albumName: 'Album',
      albumArtUrl: 'https://img/med.jpg',
      durationMs: 200000,
      releaseYear: null,
    });
  });
});

describe('paginateAll', () => {
  it('returns an empty array when the first page is empty and has no next', async () => {
    const result = await paginateAll(
      async () => ({ items: [], next: null }),
      (x: number) => x,
      50
    );
    expect(result).toEqual([]);
  });

  it('stops after one page when next is null', async () => {
    let calls = 0;
    await paginateAll(
      async () => {
        calls++;
        return { items: [1], next: null };
      },
      (x: number) => x,
      50
    );
    expect(calls).toBe(1);
  });

  it('accumulates items across multiple pages', async () => {
    const pages = [
      { items: [1, 2], next: 'p2' },
      { items: [3, 4], next: 'p3' },
      { items: [5], next: null },
    ];
    let i = 0;
    const result = await paginateAll(
      async () => pages[i++],
      (x: number) => x,
      2
    );
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('increments offset by pageSize between calls', async () => {
    const offsets: number[] = [];
    await paginateAll(
      async (offset) => {
        offsets.push(offset);
        return { items: [], next: offsets.length < 3 ? 'more' : null };
      },
      (x: unknown) => x,
      50
    );
    expect(offsets).toEqual([0, 50, 100]);
  });

  it('drops items where map returns null', async () => {
    const result = await paginateAll(
      async () => ({ items: [1, 2, 3, 4], next: null }),
      (x: number) => (x % 2 === 0 ? x : null),
      50
    );
    expect(result).toEqual([2, 4]);
  });
});

describe('mapToTrackInfo — releaseYear', () => {
  function sdkTrack(release_date: string | undefined) {
    return {
      uri: 'spotify:track:1',
      name: 'Title',
      artists: [{ name: 'A' }],
      album: {
        name: 'Album',
        images: [],
        ...(release_date !== undefined ? { release_date } : {}),
      },
      duration_ms: 1000,
      is_local: false,
    };
  }

  it('extracts a 4-digit year from an ISO date', () => {
    const info = mapToTrackInfo(sdkTrack('1996-09-03'));
    expect(info?.releaseYear).toBe('1996');
  });

  it('extracts a year from a year-only release date', () => {
    const info = mapToTrackInfo(sdkTrack('1975'));
    expect(info?.releaseYear).toBe('1975');
  });

  it('returns null when release_date is missing', () => {
    const info = mapToTrackInfo(sdkTrack(undefined));
    expect(info?.releaseYear).toBeNull();
  });
});

describe('canLoadPlaylistItems', () => {
  it('is true for a playlist the user owns', () => {
    expect(
      canLoadPlaylistItems({ owner: { id: 'me' }, collaborative: false }, 'me')
    ).toBe(true);
  });

  it('is true for a collaborative playlist owned by someone else', () => {
    expect(
      canLoadPlaylistItems(
        { owner: { id: 'friend' }, collaborative: true },
        'me'
      )
    ).toBe(true);
  });

  it('is false for a followed playlist owned by someone else', () => {
    expect(
      canLoadPlaylistItems(
        { owner: { id: 'spotify' }, collaborative: false },
        'me'
      )
    ).toBe(false);
  });
});
