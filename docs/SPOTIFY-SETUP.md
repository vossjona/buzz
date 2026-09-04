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

## 2. Enter the Client ID in Buzz

The first time you launch Buzz, it shows a **Spotify Client ID** screen.
Paste the Client ID you copied above and save.

Need to change it later? Click the gear icon (⚙) in the top-right corner of
the setup screen — saving a new Client ID disconnects Spotify.

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

Tokens, and the Client ID you entered, are stored locally in the app's
localStorage (`spotify_access_token`, `spotify_refresh_token`,
`spotify_token_expiry`, `spotify_client_id`) and never leave your machine.
The Client ID is a public identifier used by the PKCE flow, not a secret.
**Disconnect** in the setup screen clears the tokens.

## Troubleshooting

- **"A Spotify Client ID is 32 letters and digits. Check what you copied
  from the dashboard."** — Buzz only accepts a full 32-character Client ID.
  Copy the **Client ID** field from your app's settings, not the Client
  Secret or the app name.
- **"INVALID_CLIENT: Invalid redirect URI"** — the redirect URI in your
  Spotify app settings doesn't exactly match `http://127.0.0.1:8080/callback`.
- **Player fails right after connecting** — your account has no Premium
  subscription (the SDK emits an account error).
- **Playback stutters when skipping fast** — Buzz spaces track starts ≥1s apart
  and retries DRM hiccups automatically; just wait a moment.
