# CLAUDE.md

Guidance for AI agents (Claude Code, etc.) working in this repository.

## What this project is

A React + TypeScript web app that visualizes sorting algorithms
(bubble / selection / quick) as animated bar charts, with a Japanese and an
English UI. See [README.md](README.md) for the full overview.

## Golden rules

1. **Work inside Docker.** This project is devcontainer/Docker based.
   Run builds, checks, and tests in the container — the runtime
   `node_modules` lives in the container's anonymous volume.

   ```bash
   docker compose up -d --build     # first run installs deps (takes minutes)
   docker compose exec -T app bash -c '<command>'
   ```

   A Dev Container setup is also available for editor-based work
   (VS Code / Cursor "open in container").

   Host-side `node_modules` is still needed for editor IntelliSense when
   the project is opened outside a devcontainer (otherwise the editor shows
   errors like `ts(2875) react/jsx-runtime not found`). Install it with:

   ```bash
   COREPACK_ENABLE_AUTO_PIN=0 yarn install --frozen-lockfile
   ```

   The env var stops host yarn (corepack) from silently adding a
   `packageManager` field to `package.json` — revert that field if it ever
   appears.

   Also avoid deleting `node_modules` on the host while the container is
   running — the bind mount breaks the anonymous-volume mountpoint and
   commands start failing with "not found". Recover with
   `docker compose up -d --force-recreate`.

2. **Zero lint/format tolerance.** Work is not done until all of the
   following pass with no warnings or errors — and fix issues at the root
   cause, never with suppression comments:

   ```bash
   docker compose exec -T app bash -c 'yarn typecheck && yarn lint && yarn format && yarn test'
   ```

3. **Comments explain intent ("why"), in Japanese** — match the existing
   code style.

## Architecture in one paragraph

Sorting logic and rendering are fully decoupled. Each algorithm is a pure
function `build<Name>Steps(arr): Step[]` in
[src/plugins/visualizer.ts](src/plugins/visualizer.ts) that pre-generates
the entire sort as a list of `Step` objects (`compare`, `swap`, `pivot`,
`range`, `boundary`, `markL`, `markR`, `clearMarks`). During playback,
a `setInterval` in [src/App.tsx](src/App.tsx) applies one step per tick via
`applyStep()` (pure state transition) and React re-renders. All boards share
the same shuffled base array, and the shared panel UI is
[src/components/SortSection.tsx](src/components/SortSection.tsx); each
algorithm only contributes a legend (and optionally an overlay) under
`src/components/algorithms/`.

## Adding a sorting algorithm

Follow the skill at
[.claude/skills/add-sort-algorithm/SKILL.md](.claude/skills/add-sort-algorithm/SKILL.md)
— it contains the full procedure, the known pitfalls, and a completion
checklist. Highlights:

- The `Kind` union is defined in TWO files (SortSection.tsx and App.tsx).
- `applyStep()` guards some steps by kind — reusing `markL` etc. for a new
  algorithm requires extending the guard, or nothing renders.
- App.tsx integration spans 6 places; forgetting the "all boards finished →
  `setPlaying(false)`" condition breaks playback stop.
- Update BOTH `src/ja/locale.json` and `src/en/locale.json`
  (`<kind>`, `bars_aria_<kind>`, any new badge keys).

## Testing notes

- `src/__tests__/visualizer.spec.ts` tests step-builder logic; UI specs in
  `src/__tests__/ui.spec.tsx` locate panels via the `bars_aria_<kind>`
  aria-labels (Japanese strings).
- The playback-completion test uses `vi.useFakeTimers()`. **`userEvent`
  hangs under fake timers** — use the synchronous `fireEvent` there instead.
- Browser tabs that are hidden throttle `setInterval`, so live playback can
  look frozen in headless checks; trust the fake-timer test for completion
  behavior.

## Analytics

UI actions emit GA4 events (`play_click`, `pause_click`, `shuffle_click`,
`sort_finish`). New algorithms use `algorithm_type: '<kind>_sort'` in
`sort_finish`.

## Claude Code and Codex

`AGENTS.md` links to this file, and `.agents/skills` links to `.claude/skills`.
Edit the Claude-side originals to update the shared instructions and skills.
