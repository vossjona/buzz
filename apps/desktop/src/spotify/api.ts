// ABOUTME: Spotify Web API functions for fetching playlists and tracks.
// ABOUTME: Uses @spotify/web-api-ts-sdk; called by the host for "Guess the Song" mode.

import type { SpotifyPlaylistSummary, SpotifyTrackInfo } from './types';
import { getSpotifyClient } from './client';

const PAGE_SIZE = 50;

/**
 * Iterates every page of a Spotify offset-paginated endpoint and flat-maps the
 * items. `map` returns null to drop an item. Exported for direct unit testing
 * without an SDK seam.
 */
export async function paginateAll<TItem, TMapped>(
  fetchPage: (
    offset: number
  ) => Promise<{ items: TItem[]; next: string | null }>,
  map: (item: TItem) => TMapped | null,
  pageSize: number
): Promise<TMapped[]> {
  const results: TMapped[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(offset);
    for (const item of page.items) {
      const mapped = map(item);
      if (mapped !== null) results.push(mapped);
    }
    if (!page.next) break;
    offset += pageSize;
  }

  return results;
}

/**
 * Fetches all of the current user's playlists.
 */
export async function fetchUserPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  const sdk = await getSpotifyClient();
  if (!sdk) {
    throw new Error('Not authenticated with Spotify');
  }
  return paginateAll(
    (offset) => sdk.currentUser.playlists.playlists(PAGE_SIZE, offset),
    mapToPlaylistSummary,
    PAGE_SIZE
  );
}

/**
 * Fetches all tracks in a playlist.
 * Skips local tracks (they can't be played via the Web Playback SDK).
 */
export async function fetchPlaylistTracks(
  playlistId: string
): Promise<SpotifyTrackInfo[]> {
  const sdk = await getSpotifyClient();
  if (!sdk) {
    throw new Error('Not authenticated with Spotify');
  }
  return paginateAll(
    (offset) =>
      sdk.playlists.getPlaylistItems(
        playlistId,
        undefined,
        undefined,
        PAGE_SIZE,
        offset
      ),
    (item) => mapToTrackInfo(item.track),
    PAGE_SIZE
  );
}

// --- Pure mapping helpers ---

interface SdkPlaylistShape {
  id: string;
  name: string;
  tracks: { total: number; href: string } | null;
  images: Array<{ url: string; height: number | null; width: number | null }>;
}

interface SdkTrackShape {
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number | null; width: number | null }>;
    release_date?: string;
  };
  duration_ms: number;
  is_local: boolean;
}

export function mapToPlaylistSummary(
  pl: SdkPlaylistShape
): SpotifyPlaylistSummary {
  return {
    id: pl.id,
    name: pl.name,
    trackCount: pl.tracks?.total ?? 0,
    imageUrl: pl.images[0]?.url ?? null,
  };
}

export function mapToTrackInfo(
  track: SdkTrackShape | null
): SpotifyTrackInfo | null {
  if (!track || track.is_local) {
    return null;
  }

  const images = track.album.images;
  const albumArtUrl =
    images.find((img) => img.height === 300)?.url ??
    images.find((img) => img.height === 640)?.url ??
    images[0]?.url ??
    null;

  const releaseYear = track.album.release_date
    ? track.album.release_date.slice(0, 4)
    : null;

  return {
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((a) => a.name),
    albumName: track.album.name,
    albumArtUrl,
    durationMs: track.duration_ms,
    releaseYear,
  };
}
