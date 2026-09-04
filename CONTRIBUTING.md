# Contributing to Buzz

## Dev environment

Follow the prerequisites in the [README](README.md#prerequisites-macos)
(Rust, Node 22+, pnpm 9). Then:

```bash
pnpm install
pnpm dev
```

## Repo layout

pnpm monorepo:

- `apps/desktop` — Tauri v2 + React app. React in `src/`, Rust in `src-tauri/`.
- `packages/engine` — pure TypeScript game engine, no UI dependencies.
  State machine: `setup → armed → locked → resolved`. Entry: `src/reducer.ts`.

## Checks

| Command                             | What                                        |
| ----------------------------------- | ------------------------------------------- |
| `pnpm check`                        | Everything below (CI runs this on every PR) |
| `pnpm format` / `pnpm format:check` | Prettier                                    |
| `pnpm lint`                         | ESLint                                      |
| `pnpm typecheck`                    | tsc, strict mode                            |
| `pnpm test`                         | Vitest                                      |

Single test file: `pnpm --filter @buzz/engine test -- src/reducer.test.ts`

## Conventions

- Every source file starts with two `// ABOUTME:` comment lines describing it.
- CSS is tiered: design tokens in `apps/desktop/src/styles/global.css`, genuinely shared
  classes in `apps/desktop/src/styles/shared.css`, everything else in co-located
  `Component.module.css` files (camelCase class names).
- Engine state is immutable — reducers return copies, never mutate.
- Prefer simple, readable solutions over clever ones.

## Pull requests

- `pnpm check` must pass — CI enforces it.
- Keep PRs focused; one logical change per PR.
