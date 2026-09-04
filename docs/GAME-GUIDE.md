# Game Guide

How to host a round of Buzz: a "guess the song" quiz for 2–4 teams,
played from your own Spotify playlists, with one shared host screen and
a second Player window for the contestants.

## Before you start

- Spotify connected and a playlist selected ([Spotify setup](SPOTIFY-SETUP.md))
- Optional: USB buzzers paired ([buzzer guide](BUZZERS.md)); keyboard keys 1–4 work too

## Setup screen

| Setting           | What it does                               | Default | Range                 |
| ----------------- | ------------------------------------------ | ------- | --------------------- |
| Playlist          | Source of songs (random order, no repeats) | —       | any of your playlists |
| Score to win      | Game ends when a team reaches this         | 10      | 1–100                 |
| Answer Time Limit | How long a team may answer after buzzing   | 10 s    | Off, 3 s–260 s        |

The gear icon (⚙) in the top-right corner of this screen changes your
Spotify Client ID.

Steps:

1. Lock in teams: each team presses its key (1 Red, 2 Blue, 3 Green, 4 Yellow)
   or its paired buzzer. Minimum 2 teams.
2. Click **Open Player View** (enabled once Spotify is connected and a playlist
   is selected) and move that window to the screen the contestants see.
   USB buzzers only work in-game while this window is open.
3. Press **S** to start. A Ready–Set–Go countdown plays, then the first song.

## A round

1. **Music plays** (armed). Teams listen and race to buzz.
2. **A team buzzes** (locked): music pauses, the Player view flashes the team's
   color, and the answer timer runs. In the final 3 seconds a 3-2-1 overlay
   counts down and a time's-up sound plays — the host still judges.
3. **Host judges**: **C** correct (+1 point, round resolves) or **W** wrong
   (team is out for this round; music resumes and the others may buzz).
   If every team is wrong the round resolves with no points.
4. **Reveal**: press **R** to reveal the song, or click individual parts of the
   track info on the host screen (title, artist, album, year, cover art) to
   reveal them one by one — useful for hints.
5. **N** loads the next song (it skips the current one if nothing was revealed).

## Host keys

| Key   | When         | Action                |
| ----- | ------------ | --------------------- |
| 1–4   | setup        | Lock in / unlock team |
| S     | setup        | Start game (2+ teams) |
| 1–4   | armed        | Buzz for that team    |
| ← / → | in game      | Seek song −/+10 s     |
| C / W | after a buzz | Judge correct / wrong |
| R     | in game      | Reveal song           |
| N     | in game      | Next song / skip      |
| Esc   | in game      | End game              |

Scores can also be adjusted any time with the +/− buttons next to each team.

## Game end

The game ends when a team reaches the score cap, the playlist runs out of
songs, or the host presses Esc. The final screen shows confetti for the
winners, a score chart, and a song-by-song history of who got what.
