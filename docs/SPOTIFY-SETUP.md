# Spotify Setup

Buzz plays music through Spotify. You need:

- A **Spotify Premium** account (the Web Playback SDK Buzz uses requires Premium)
- A free **Spotify Developer app** to get a Client ID — takes ~5 minutes, instructions below
- At least one playlist in your account to play with

## 1. Create a Spotify Developer app

1. Go to <https://developer.spotify.com/dashboard> and log in with your Spotify account.
2. Click **Create app**.
3. Fill in:
   - **App name / description**: anything, e.g. "Buzz quiz"
   - **Redirect URI**: exactly `http://127.0.0.1:8080/callback`
     ⚠️ It must be `127.0.0.1`, **not** `localhost` — Spotify rejects `localhost`.
   - **APIs used**: check **Web API** and **Web Playback SDK**.
4. Save, open the app's settings, and copy the **Client ID**.

## 2. Configure Buzz

```bash
cp apps/desktop/.env.example apps/desktop/.env
```

Then open `apps/desktop/.env` and set your Client ID:

```
VITE_SPOTIFY_CLIENT_ID=paste-your-client-id-here
```

If the variable is missing, the Connect button fails with:

```
VITE_SPOTIFY_CLIENT_ID environment variable is not set
```

## 3. Connect inside Buzz

1. Start Buzz and click **Connect to Spotify** on the setup screen.
2. Your browser opens Spotify's authorization page. Approve it.
3. You're redirected back; Buzz now shows your playlists in a dropdown.

## What Buzz asks for (OAuth scopes)

| Scope                                  | Why                                        |
| -------------------------------------- | ------------------------------------------ |
| `streaming`                            | Play tracks via the Web Playback SDK       |
| `user-read-private`, `user-read-email` | Required by the SDK to identify the player |
| `playlist-read-private`                | List your playlists in the setup dropdown  |

## Where your tokens live

Tokens are stored locally in the app's localStorage
(`spotify_access_token`, `spotify_refresh_token`, `spotify_token_expiry`)
and never leave your machine. **Disconnect** in the setup screen clears them.

## Troubleshooting

- **"INVALID_CLIENT: Invalid redirect URI"** — the redirect URI in your
  Spotify app settings doesn't exactly match `http://127.0.0.1:8080/callback`.
- **Player fails right after connecting** — your account has no Premium
  subscription (the SDK emits an account error).
- **Playback stutters when skipping fast** — Buzz spaces track starts ≥1s apart
  and retries DRM hiccups automatically; just wait a moment.
