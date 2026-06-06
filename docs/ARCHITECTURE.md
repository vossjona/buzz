# Buzz Architecture

This document describes the architecture of the Buzz music-quiz buzzer game (guess the song from Spotify playlists).

## Overview

Buzz follows a modular monorepo architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     apps/desktop                            │
│              (Tauri v2 + React + Vite)                      │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   React     │  │   Tauri     │  │   Spotify   │         │
│  │ Components  │  │   Shell     │  │ integration │         │
│  └──────┬──────┘  └─────────────┘  └─────────────┘         │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │ uses
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      packages/                              │
│                                                             │
│  ┌─────────────┐                                           │
│  │   engine    │                                           │
│  │ Game Logic  │                                           │
│  └─────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Package Boundaries

### @buzz/engine

**Purpose**: Pure TypeScript game engine with deterministic state transitions.

**Responsibilities**:

- Team-based buzzer state management (`setup → armed → locked → resolved`)
- Score tracking
- Round progression and per-round elimination of wrong-answering teams

**Key Exports**:

- `createInitialState()` - Returns the initial state (`setup` phase, no teams)
- `reducer(state, event)` - Pure `(state, event) → newState` reducer
- `BuzzerState` / `BuzzerPhase` / `BuzzerEvent` / `Team` - Type definitions

**Events** (`BuzzerEvent`):

- `TEAM_ADDED` - Add a team (setup only)
- `BUZZ` - In setup toggles a team's lock-in; in armed the first locked-in,
  non-eliminated team to buzz wins and locks the round
- `START_GAME` - setup → armed (requires ≥2 teams locked in)
- `ANSWER_MARKED` - Mark the buzzed team's answer correct/wrong (locked only)
- `NEXT_ROUND` - Re-arm for a new round (from armed/locked/resolved)
- `RESET` - Reset to the initial state
- `SCORE_ADJUSTED` - Apply a ±1 score delta to a team in any phase

**Design Principles**:

- No UI dependencies
- Pure reducer function `(state, event) → newState`
- Invalid events in the wrong phase are silently ignored (state returned unchanged)
- New state objects are always returned (no in-place mutation)

### @buzz/desktop

**Purpose**: Tauri v2 desktop application with React UI.

**Responsibilities**:

- Render game UI (separate Host and Player windows)
- Handle host controls (keyboard) and buzzer input (gamepad / USB HID)
- Orchestrate the engine reducer and Spotify playback
- Manage application windows via Tauri

**Architecture**:

```
┌──────────────────────────────────────────────────┐
│         HostApp.tsx / PlayerApp.tsx               │
│  ┌─────────────────────────────────┐             │
│  │        React State              │             │
│  │  - buzzer state (from reducer)  │             │
│  │  - Spotify playback             │             │
│  └─────────────────────────────────┘             │
│                 │                                 │
│    ┌────────────┼────────────┐                    │
│    ▼            ▼            ▼                    │
│  SetupScreen GameScreen  FinalScreen             │
│  (Host/Player variants)                          │
└──────────────────────────────────────────────────┘
         │
         ▼
    @buzz/engine
```

## Data Flow

### Music Flow

The "question" content comes from a Spotify playlist, not a JSON question bank:

```
1. Host authenticates with Spotify (OAuth PKCE) and picks a playlist
   (apps/desktop/src/spotify/, useSpotify.ts)
2. The playlist's tracks are loaded into useSpotifyPlayback.ts
3. selectRandomTrack() picks a random not-yet-played track index
4. playTrack(uri) streams it via the Spotify Web Playback SDK
5. Playback is driven by the engine phase (see below)
6. Game over when the score cap is reached or the playlist runs out
   (gameOverReason: 'score-cap' | 'playlist-empty')
```

### Round Flow

The engine reducer drives both gameplay and (via `useSpotifyPlayback`) playback:

```
1. setup: host adds teams; teams toggle lock-in via BUZZ; START_GAME → armed
2. armed: a random track plays; first locked-in, non-eliminated team to BUZZ
          → locked (playback pauses)
3. locked: host marks ANSWER_MARKED:
           - correct → resolved (+1 score, playback resumes briefly)
           - wrong, teams remain → armed (team eliminated this round, resumes)
           - wrong, all eliminated → resolved (no point)
4. NEXT_ROUND re-arms for the next track (from armed/locked/resolved)
5. Repeat until score cap reached or playlist exhausted → final screen
```

### Input Handling

Input is handled by dedicated React hooks in `apps/desktop/src/hooks/`:

- `useKeyboardInput.ts` / `useHostInput.ts` - Keyboard events (host controls)
- `useGamepadInput.ts` - Gamepad API polling (buzzer input)
- `useBuzzerInput.ts` - USB HID buzzers via Tauri events

These produce `BuzzerEvent`s that are dispatched through the engine reducer.

## State Management

The application uses a simple state management approach:

1. **Engine State**: A `BuzzerState` value advanced by the pure `reducer(state, event)`
2. **Playback State**: Managed by `useSpotifyPlayback.ts`, synced to the engine phase
3. **UI State**: React `useState` for UI-specific concerns (e.g. revealed atoms)

No external state management library (Redux, Zustand) is needed due to:

- Single source of truth (the engine reducer)
- Simple UI requirements
- Unidirectional data flow

## Testing Strategy

| Package / area | Test Focus                                     |
| -------------- | ---------------------------------------------- |
| engine         | Reducer state transitions, scoring, edge cases |
| desktop        | Spotify client/auth/atoms, hooks, reveal state |

## Future Considerations

### Planned Features

- Multiple game modes (timed variants)
- Score persistence

### Extension Points

- `@buzz/engine`: Add new `BuzzerEvent` types and phases for game variants
