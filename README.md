# algorithm-visualizer

A web app that visualizes sorting algorithms with side-by-side animations.
All algorithms sort the same shuffled array at the same speed, so you can
watch how their strategies and step counts differ.

Currently implemented:

- **Bubble Sort** — adjacent compare & swap
- **Selection Sort** — tracks the minimum candidate (purple ring), swaps at most once per pass
- **Quick Sort** — rightmost pivot, with partition range / boundary overlays

Features:

- Play / pause / shuffle, adjustable bar count (5–50) and animation speed (0.2×–10×)
- Japanese / English UI (`/ja/` and `/en/` routes, auto-detected from the browser language)
- Every board shares the same initial array for a fair comparison

## Tech stack

React 18 + TypeScript, Mantine UI, i18next, Parcel, Vitest + Testing Library.

## Development setup

Development is designed to run inside a container. Two equivalent options:

### Option A: Dev Container (recommended for editors)

If your editor supports Dev Containers (VS Code, Cursor, etc.):

1. (one time) Install the Dev Containers extension.
2. Open the project folder "in container" (Reopen in Container).

That's all — the devcontainer reuses the `app` service from
`docker-compose.yml` (with `overrideCommand: false`), so opening it
automatically installs dependencies (first time takes a few minutes) and
starts the dev server on http://localhost:1234/ja/ (port 1234 is
forwarded). Watch startup progress with `docker compose logs -f app` from
the host; run `yarn test` etc. directly in the editor's integrated
terminal (it is inside the container). To restart the dev server, run
`docker compose restart app` or "Rebuild Container".

### Option B: Docker Compose (CLI)

```bash
docker compose up -d --build
```

The first run installs dependencies inside the container (this takes a few
minutes) and then starts the dev server. The app is served at:

- http://localhost:1234/ja/ (Japanese)
- http://localhost:1234/en/ (English)

Hot reload works through the volume mount. To run any project command, use
`docker compose exec`:

```bash
docker compose exec -T app bash -c 'yarn test'
```

> **Note:** the container keeps its own `node_modules` in an anonymous
> volume. If you open the project on the host (outside a devcontainer),
> your editor needs a host-side `node_modules` for IntelliSense — install
> it with `COREPACK_ENABLE_AUTO_PIN=0 yarn install --frozen-lockfile`
> (the env var prevents host yarn from adding a `packageManager` field to
> `package.json`). Don't delete the host `node_modules` while the container
> is running; it breaks the container's volume mountpoint
> (recover with `docker compose up -d --force-recreate`).

## Commands

Run these inside the container (via `docker compose exec -T app bash -c '...'`
or a Dev Container terminal):

| Command           | Purpose                                |
| ----------------- | -------------------------------------- |
| `yarn dev`        | Start the Parcel dev server            |
| `yarn build`      | Production build into `public/`        |
| `yarn typecheck`  | TypeScript type check (`tsc --noEmit`) |
| `yarn lint`       | ESLint                                 |
| `yarn lint:fix`   | ESLint with auto-fix                   |
| `yarn format`     | Prettier check                         |
| `yarn format:fix` | Prettier write                         |
| `yarn test`       | Vitest (logic + UI specs)              |

Before committing, make sure all of these pass with zero warnings/errors:

```bash
docker compose exec -T app bash -c 'yarn typecheck && yarn lint && yarn format && yarn test'
```

## Project structure

```
src/
├── App.tsx                    # Board state, playback timer, layout
├── plugins/
│   ├── visualizer.ts          # Step types + step builders (sorting logic lives here)
│   └── i18n.ts                # Language detection + i18next setup
├── components/
│   ├── SortSection.tsx        # Shared panel: accordion + bars renderer
│   ├── ControlBar.tsx         # Size / speed / play / pause / shuffle controls
│   ├── HeaderBar.tsx
│   ├── LanguageSwitcher.tsx
│   └── algorithms/            # Per-algorithm legends (and overlays)
│       ├── Bubble.tsx
│       ├── Selection.tsx
│       └── Quick.tsx
├── ja/, en/                   # Per-language entry HTML + locale.json
├── styles.css                 # Bar/legend/overlay styles (CSS variables in :root)
└── __tests__/                 # visualizer.spec.ts (logic), ui.spec.tsx (UI)
```

### How the visualization works

Sorting and rendering are fully decoupled: each algorithm has a pure
`build<Name>Steps(arr)` function in `src/plugins/visualizer.ts` that
pre-generates the whole sorting process as a list of `Step` objects
(compare / swap / pivot / ...). `App.tsx` then plays the list back one step
per timer tick through `applyStep()`, which produces the next immutable
board state for React to render.

## Adding a new sorting algorithm

The step-by-step guide (including pitfalls) lives in
[`.claude/skills/add-sort-algorithm/SKILL.md`](.claude/skills/add-sort-algorithm/SKILL.md).
It is shared by Claude Code and Codex through `.agents/skills` → `.claude/skills`. See also [`CLAUDE.md`](CLAUDE.md)
for AI-agent-oriented notes about this codebase.
