# Installing Buzz

Buzz is a desktop app. You don't need any developer tools — just download,
install, and play. You DO need **Spotify Premium** (the game plays full songs
through your Spotify account).

## 1. Download

Go to the [latest release](https://github.com/vossjona/buzz/releases/latest)
and download the file for your computer:

| Your computer                      | File to download               |
| ---------------------------------- | ------------------------------ |
| Mac (Apple Silicon, 2020 or later) | `Buzz_<version>_aarch64.dmg`   |
| Windows                            | `Buzz_<version>_x64-setup.exe` |

Intel Macs are not supported.

## 2. Install

### macOS

1. Open the downloaded `.dmg` and drag **Buzz** into **Applications**.
2. The app is not signed with an Apple certificate, so macOS blocks the
   first launch. This is expected — here's the workaround:
3. Double-click Buzz. macOS will claim the app "is damaged and can't be
   opened" — it isn't; that's how macOS phrases "not signed".
4. Open the **Terminal** app (find it with Spotlight: press ⌘-Space, type
   "Terminal"), paste this line, and press Enter:

   ```bash
   xattr -cr /Applications/Buzz.app
   ```

5. This is only needed once — afterwards Buzz opens normally.

### Windows

1. Run the downloaded `…-setup.exe`.
2. Some newer Windows 11 PCs have a separate, stricter feature called
   **Smart App Control** turned on (it's usually only active on fresh
   Windows installs). If it blocks the installer outright — a dialog says
   "Smart App Control blocked an app", with only OK and "Get apps from
   the Store" buttons and no "Run anyway" option — you have to turn it
   off before you can run Buzz:
   1. Open the **Windows Security** app.
   2. Go to **App & browser control** → **Smart App Control settings**.
   3. Set it to **Off**.

   Before you do this: once Smart App Control is off, it can't be turned
   back on without resetting or reinstalling Windows. Only turn it off if
   you're fine with that.

   Then run the installer again and continue with step 3 below.

3. Windows SmartScreen will warn about an unrecognized app. Click
   **More info**, then **Run anyway**.
4. Follow the installer. Buzz appears in the Start menu.

## 3. Spotify access

Buzz plays music through your own free Spotify Developer app — about 5
minutes to set up, once:

1. Create a Spotify Developer app and set its **Redirect URI** to exactly
   `http://127.0.0.1:8080/callback` — see
   [Spotify setup, step 1](SPOTIFY-SETUP.md#1-create-a-spotify-developer-app)
   for the full walkthrough.
2. The first time you open Buzz, it shows a **Spotify Client ID** screen.
   Paste the Client ID from your new app there and save.
3. Click **Connect to Spotify**. Your normal browser opens; log in to
   Spotify (Premium account) and click **Agree**.
4. The browser shows "Connected to Spotify" — close the tab and return to
   Buzz. Your playlists appear.

Need to use a different Client ID later? Click the gear icon (⚙) in the
top-right corner of the setup screen — saving a new one disconnects Spotify.

## 4. Play

- Pairing USB buzzers: see the [Buzzer Guide](BUZZERS.md) — or just use
  keyboard keys 1–4.
- How a game night works: see the [Game Guide](GAME-GUIDE.md).

## Troubleshooting

**The button is stuck on "Connecting…"** — the login window in your browser
was probably closed before finishing. After 5 minutes the button resets and
you can try again (or quit and reopen Buzz).

**Buzz says the Client ID looks wrong** — Buzz only accepts a full
32-character Client ID. Make sure you copied the **Client ID** from your
Spotify app's settings, not the Client Secret or the app name.

**"INVALID_CLIENT: Invalid redirect URI" in the browser** — the redirect URI
in your Spotify app's settings doesn't exactly match
`http://127.0.0.1:8080/callback`. Fix it on the
[developer dashboard](https://developer.spotify.com/dashboard) and try again.

**"Could not listen on port 8080"** — another program on your computer is
using that port. Close it (or restart your computer), then click
**Connect to Spotify** again.

**The installer won't start / "Smart App Control blocked an app"** — your
PC has Windows's Smart App Control feature turned on, which blocks
unsigned apps like Buzz with no override. Turn it off in the Windows
Security app: **App & browser control** → **Smart App Control settings**
→ **Off**. Note that this can't be undone without resetting or
reinstalling Windows. Then run the installer again.

**Songs won't play** — make sure your Spotify account is **Premium** (the
free tier can't be used for playback here), and that no other device is
actively playing on your account.
