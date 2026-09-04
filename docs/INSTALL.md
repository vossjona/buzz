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
2. Windows SmartScreen will warn about an unrecognized app. Click
   **More info**, then **Run anyway**.
3. Follow the installer. Buzz appears in the Start menu.

## 3. Spotify access

Buzz uses a private Spotify integration that works by invitation:

1. Send the **email address of your Spotify account** to the person who gave
   you Buzz — they add you to the allowlist (takes them a minute).
2. In Buzz, click **Connect to Spotify**. Your normal browser opens; log in to
   Spotify (Premium account) and click **Agree**.
3. The browser shows "Connected to Spotify" — close the tab and return to
   Buzz. Your playlists appear.

## 4. Play

- Pairing USB buzzers: see the [Buzzer Guide](BUZZERS.md) — or just use
  keyboard keys 1–4.
- How a game night works: see the [Game Guide](GAME-GUIDE.md).

## Troubleshooting

**The button is stuck on "Connecting…"** — the login window in your browser
was probably closed before finishing. After 5 minutes the button resets and
you can try again (or quit and reopen Buzz).

**Spotify says your account can't use this app** — you're not on the
allowlist yet. Send the email address of your Spotify account to the person
who gave you Buzz, wait for their go-ahead, then try again.

**"Could not listen on port 8080"** — another program on your computer is
using that port. Close it (or restart your computer), then click
**Connect to Spotify** again.

**Songs won't play** — make sure your Spotify account is **Premium** (the
free tier can't be used for playback here), and that no other device is
actively playing on your account.
