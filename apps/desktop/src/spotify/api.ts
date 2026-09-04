// ABOUTME: Spotify Web API functions for fetching playlists and tracks.
// ABOUTME: Uses @spotify/web-api-ts-sdk; called by the host for "Guess the Song" mode.

import type { Page } from '@spotify/web-api-ts-sdk';
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
 * Fetches the current user's playlists, keeping only those whose songs Buzz
 * can load. Since February 2026 Spotify returns playlist contents to
 * Development Mode apps only for playlists the user owns or collaborates on.
 */
export async function fetchUserPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  const sdk = await getSpotifyClient();
  if (!sdk) {
    throw new Error('Not authenticated with Spotify');
  }
  const { id: userId } = await sdk.currentUser.profile();
  return paginateAll(
    (offset) => sdk.currentUser.playlists.playlists(PAGE_SIZE, offset),
    (pl) =>
      canLoadPlaylistItems(pl, userId) ? mapToPlaylistSummary(pl) : null,
    PAGE_SIZE
  );
}

/**
 * Fetches all tracks in a playlist.
 * Skips local tracks (they can't be played via the Web Playback SDK).
 * Calls `/playlists/{id}/items` directly: the SDK's `getPlaylistItems` still
 * hits `/playlists/{id}/tracks`, which Spotify removed for Development Mode
 * apps in February 2026.
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
      sdk.makeRequest<Page<SdkPlaylistEntry>>(
        'GET',
        `playlists/${playlistId}/items?limit=${PAGE_SIZE}&offset=${offset}`
      ),
    mapPlaylistEntry,
    PAGE_SIZE
  );
}

// --- Pure mapping helpers ---

// Spotify renamed `tracks` to `items` in February 2026. Apps created before
// that still receive `tracks`; newer Development Mode apps receive `items`.
interface SdkPlaylistShape {
  id: string;
  name: string;
  items?: { total: number; href: string } | null;
  tracks?: { total: number; href: string } | null;
  images: Array<{
    url: string;
    height: number | null;
    width: number | null;
  }> | null;
}

interface SdkTrackShape {
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{
      url: string;
      height: number | null;
      width: number | null;
    }> | null;
    release_date?: string;
  };
  duration_ms: number;
  is_local: boolean;
}

interface SdkPlaylistAccess {
  owner: { id: string };
  collaborative: boolean;
}

export function canLoadPlaylistItems(
  pl: SdkPlaylistAccess,
  userId: string
): boolean {
  return pl.owner.id === userId || pl.collaborative;
}

export function mapToPlaylistSummary(
  pl: SdkPlaylistShape
): SpotifyPlaylistSummary {
  return {
    id: pl.id,
    name: pl.name,
    trackCount: pl.items?.total ?? pl.tracks?.total ?? 0,
    imageUrl: pl.images?.[0]?.url ?? null,
  };
}

// One entry of a playlist page. Older apps nest the track under `track`,
// apps created after February 2026 nest it under `item`.
interface SdkPlaylistEntry {
  item?: SdkTrackShape | null;
  track?: SdkTrackShape | null;
}

export function mapPlaylistEntry(
  entry: SdkPlaylistEntry
): SpotifyTrackInfo | null {
  return mapToTrackInfo(entry.item ?? entry.track ?? null);
}

export function mapToTrackInfo(
  track: SdkTrackShape | null
): SpotifyTrackInfo | null {
  if (!track || track.is_local) {
    return null;
  }

  const images = track.album.images ?? [];
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
