# Development guide

React/TypeScript sorting visualizations with Japanese and English UI. See [README](README.md) for the overview.

## Golden rules

- Build, check, and test inside Docker/devcontainer. Start with `docker compose up -d --build`; dependencies live in the container's anonymous volume.
- Code and build/test configuration changes must pass without lint or format warnings. Fix causes; do not add suppression comments.

```bash
docker compose exec -T app bash -c 'yarn typecheck && yarn lint && yarn format && yarn test'
```

- Host dependencies are for editor type resolution only. If needed, install with `COREPACK_ENABLE_AUTO_PIN=0 yarn install --frozen-lockfile` to avoid adding `packageManager`. Undo an accidental addition caused by that install. Do not delete host `node_modules` while the container runs; recover a broken mount with `docker compose up -d --force-recreate`.
- Comments explain intent in Japanese. For documentation/skill-only edits, check instructions and links; application checks are needed only if behavior is affected.

## Where to work

- Step builders in `src/plugins/visualizer.ts` are pure functions that generate `Step[]`. `applyStep()` in `src/App.tsx` applies one step per timer tick. All boards share the same shuffled base array.
- Shared panels use `src/components/SortSection.tsx`; legends and overlays live under `src/components/algorithms/`.
- When adding an algorithm, follow [add-sort-algorithm](.claude/skills/add-sort-algorithm/SKILL.md) for integration, translations, and tests. Preserve the GA4 `sort_finish` contract: `algorithm_type: '<kind>_sort'`.
- Logic tests are in `src/__tests__/visualizer.spec.ts`; UI tests are in `src/__tests__/ui.spec.tsx` and use the Japanese `bars_aria_<kind>` labels. With fake timers, use synchronous `fireEvent`; `userEvent` can hang. Hidden browser tabs throttle playback, so use the fake-timer test for completion.
- `.agents/skills` links to `.claude/skills`; edit the originals.

## Working approach

- `AGENTS.md` links to this file. Read the shared instructions once and edit `CLAUDE.md`.
- Start with the relevant files, headings, or symbols; expand the search as needed. Load only the documentation and skills that apply to the task.
- Ask about unresolved questions before proceeding with work that depends on the answer. Do not reconfirm decisions already made.
- Preserve each document's language. Write natural Japanese for Japanese readers and idiomatic English for English-speaking readers.
- Run mandatory checks when their conditions apply. Reuse results while the diff, dependencies, configuration, and execution conditions remain unchanged. Fix issues and briefly report results and anything unverified.
- Keep lasting rules and useful references here. Do not duplicate progress notes, configuration values, or procedures maintained in other documents or skills.
