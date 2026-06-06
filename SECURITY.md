# Security

## Reporting

Please report vulnerabilities privately via
[GitHub security advisories](https://github.com/vossjona/buzz/security/advisories/new)
rather than public issues.

## Security model

Buzz is a local-only desktop app: no server, no accounts, no telemetry.
The only external communication is with Spotify (OAuth + playback).

### Spotify tokens

- Auth uses OAuth 2.0 PKCE; the only secret on your machine is your own
  access/refresh token pair.
- Tokens are stored in the app's localStorage
  (`spotify_access_token`, `spotify_refresh_token`, `spotify_token_expiry`)
  and are sent only to Spotify endpoints (`accounts.spotify.com`,
  `api.spotify.com`, and the Web Playback SDK's `*.spotify.com` websockets).
- "Disconnect" on the setup screen clears them.
- Scopes are limited to streaming, profile read, email read, and private-playlist read.

### Content Security Policy

The Tauri webview CSP (`apps/desktop/src-tauri/tauri.conf.json`) allows
`'unsafe-inline'` for `script-src` and `style-src`. This is required by the
Spotify Web Playback SDK (loaded from `sdk.scdn.co`), which injects inline
script/styles. `connect-src` is restricted to Spotify endpoints and Tauri IPC.
