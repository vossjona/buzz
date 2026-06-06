# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Buzz is a local-only desktop music-quiz buzzer game (guess the song from Spotify playlists) built with Tauri v2 + React + TypeScript. It's a pnpm monorepo with clear package boundaries.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Tauri desktop app in dev mode
pnpm build            # Build production desktop app
pnpm test             # Run all package tests (vitest)
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm typecheck        # TypeScript type checking
pnpm check            # Run all checks (format, lint, typecheck, test)
```

Run a single test file:

```bash
pnpm --filter @buzz/engine test -- src/reducer.test.ts
```

## Architecture

```
buzz/
├── apps/desktop/         # Tauri v2 + React + Vite
│   ├── src/              # React components
│   └── src-tauri/        # Rust backend (minimal)
├── packages/
│   └── engine/           # Pure TS game engine (no UI deps)
└── docs/ARCHITECTURE.md  # Detailed architecture docs
```

**Package dependencies flow**: `desktop` → `engine`

**Key entry points**:

- Game engine: `packages/engine/src/reducer.ts`
- UI orchestration: `apps/desktop/src/HostApp.tsx` + `apps/desktop/src/PlayerApp.tsx`
- Spotify integration: `apps/desktop/src/spotify/`

## Code Conventions

- **ABOUTME comments**: Every source file starts with two lines:

  ```typescript
  // ABOUTME: Brief description of what this file does.
  // ABOUTME: Additional context if needed.
  ```

- **State machine pattern**: Game phases flow `setup → armed → locked → resolved`

- **Immutable state**: The engine is a pure reducer — `reducer(state, event)` always returns new state objects, never mutates in place

## CSS Architecture

Styles are split into three tiers:

1. **Global tokens & reset** (`apps/desktop/src/styles/global.css`) — CSS custom properties (`:root`), universal reset, `body`, `#root`. Never add component styles here.

2. **Shared styles** (`apps/desktop/src/styles/shared.css`) — Cross-component classes used by multiple screens/components (e.g., `.screen`, `.hostButton`, `.finalContent`). Only add styles here if they're genuinely shared across 2+ unrelated components. These use camelCase class names and are global (not modules).

3. **Component modules** (`ComponentName.module.css`, co-located next to `.tsx`) — All component-specific styles. Use camelCase class names. Import as `import styles from './ComponentName.module.css'`.

**When adding new styles:**

- New component? Create a co-located `ComponentName.module.css` with camelCase classes.
- Shared across multiple components? Add to `apps/desktop/src/styles/shared.css`.
- New design token? Add to `:root` in `apps/desktop/src/styles/global.css`.
- Never add component-specific styles to `global.css` or `shared.css`.

## Tech Stack

- **Runtime**: Node.js 20+, pnpm 9+
- **Frontend**: React 18, Vite 6, TypeScript 5.7 (strict mode)
- **Desktop**: Tauri v2 (requires Rust via rustup)
- **Testing**: Vitest
- **Linting**: ESLint 9 (flat config), Prettier

## Troubleshooting

- **Tauri CLI not found**: Always run via `pnpm dev`, not `tauri` directly
- **Port 8080 in use**: `lsof -ti:8080 | xargs kill -9`
- **Xcode license**: `sudo xcodebuild -license accept`
