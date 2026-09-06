# CLAUDE.md

Guidance for AI agents (Claude Code, etc.) working in this repository.

## What this project is

A React + TypeScript web app that visualizes sorting algorithms
as animated bar charts, with a Japanese and an
English UI. See [README.md](README.md) for the full overview.

## Golden rules

- **Build, check, and test inside Docker/devcontainer.** Start with `docker compose up -d --build`; run commands with `docker compose exec -T app bash -c '<command>'`. Runtime dependencies live in the container's anonymous volume.
- Host editor IntelliSense may need `COREPACK_ENABLE_AUTO_PIN=0 yarn install --frozen-lockfile`. This is for type resolution, not running builds. The variable prevents Corepack adding `packageManager` to `package.json`; revert that field if accidentally added. Do not delete host `node_modules` while the container runs; a broken mount can be recovered with `docker compose up -d --force-recreate`.
- **Zero lint/format tolerance:** fix causes, never suppression comments. Work is complete only when all checks pass without warnings/errors:

```bash
docker compose exec -T app bash -c 'yarn typecheck && yarn lint && yarn format && yarn test'
```

- Comments explain why, in Japanese.

## Architecture in one paragraph

Sorting logic and rendering are fully decoupled. Each algorithm is a pure
function `build<Name>Steps(arr): Step[]` in
[src/plugins/visualizer.ts](src/plugins/visualizer.ts) that pre-generates
the entire sort as a list of `Step` objects; use the type definition for the supported steps. During playback,
a `setInterval` in [src/App.tsx](src/App.tsx) applies one step per tick via
`applyStep()` (pure state transition) and React re-renders. All boards share
the same shuffled base array, and the shared panel UI is
[src/components/SortSection.tsx](src/components/SortSection.tsx); each
algorithm only contributes a legend (and optionally an overlay) under
`src/components/algorithms/`.

## Adding a sorting algorithm

Follow the skill at
[.claude/skills/add-sort-algorithm/SKILL.md](.claude/skills/add-sort-algorithm/SKILL.md)
— follow its procedure, pitfalls, and completion checklist. Keep algorithm-specific integration details in that skill rather than copying the checklist here.

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

UI actions emit GA4 events; consult the handlers in `src/App.tsx` for current events. Preserve `algorithm_type: '<kind>_sort'` in `sort_finish` for new algorithms.

## Claude Code and Codex

- `AGENTS.md` links to this file.
- `.agents/skills` links to `.claude/skills`.
- Edit the Claude-side originals to update the shared instructions and skills.

## Focused reading and maintenance

- `AGENTS.md` links to `CLAUDE.md`; read the shared text once and edit the original.
- Scope `rg` to relevant directories and names/headings/symbols. Use `-g` to omit dependencies, build output, logs, lockfiles, and generated code; read them directly for dependency, generation, type, or failure investigations. Widen paths or relax exclusions when needed.
- Run required checks, report failures/key results, and reuse results only with the same diff, dependencies, configuration, and execution conditions.
- Keep lasting rules, required conditions, key commands, and references here. Progress belongs in the task or existing issues/PRs; inventories and current values belong in their original definitions. Update this guide for changed rules/conditions, moved references, or newly essential guidance.
- Choose skills by their descriptions and follow the relevant `SKILL.md`. Preserve mandatory skill conditions here without copying catalogs or procedures.
