---
name: add-sort-algorithm
description: >
  Procedure for adding a new sorting algorithm (insertion sort, heap sort,
  merge sort, shell sort, etc.) to the algorithm-visualizer screen.
  Always follow this skill whenever the user mentions adding, implementing,
  or displaying a sorting algorithm — e.g. "add XXX sort", "show a new
  algorithm on the screen", "add another sort panel" — even if they do not
  explicitly ask for a skill.
---

# How to Add a Sorting Algorithm

## Architecture assumptions

This app runs on a "pre-generated step list + timer playback" model.

1. `build<Name>Steps(arr)` in `src/plugins/visualizer.ts` pre-generates the
   entire sorting process as an array of `Step` objects (a pure function —
   the sorting logic itself lives entirely here).
2. The `setInterval` in `src/App.tsx` applies one step per tick to the board
   state (`BoardState`) via `applyStep()`, and React re-renders.
3. All boards share the same initial array `base`, so the algorithms can be
   compared fairly.

In other words, "algorithm logic" and "rendering" are fully separated.
The core work of adding a new algorithm is writing the step-builder function;
rendering simply rides on the shared `SortSection` / `Bars` components.

## Steps

### 1. Add a step-builder function — `src/plugins/visualizer.ts`

Add `build<Name>Steps(arr: number[]): Step[]`, using `buildSelectionSteps`
as the model.

- Do not mutate the argument: start with `const a = arr.slice()`.
- **Whenever you push a `swap`, actually swap the local array `a` too.**
  If they drift apart, subsequent compare targets become wrong and the
  `applySwaps` verification in the tests fails.
- The UI plays one step at a time, so push in the order
  "push `compare` → push `swap` if needed".
- First check whether the existing `Step` types can express what you need:
  - `compare` (i, j): red outline highlight (cleared after one step)
  - `swap` (i, j): swaps the bars + red fill. Both data and ids are swapped
  - `markL` / `markR` / `clearMarks`: purple/green rings (candidate marks)
  - `pivot` / `range` / `boundary`: quick-sort specific (yellow bar,
    active range, boundary line)
- Only if a new `Step` type is truly needed, add it to the `Step` union and
  implement its application logic in `applyStep()` in `App.tsx`.

### 2. Extend the `Kind` type

- Add the new kind to `export type Kind` in `src/components/SortSection.tsx`.
- Also add it to the local `type Kind` in `src/App.tsx`
  (careful: it is defined in TWO places).

### 3. Add a legend component — `src/components/algorithms/<Name>.tsx`

Create `<Name>Legend`, modeled on `Selection.tsx` (minimal) or `Quick.tsx`
(with overlay). If you need drawing beyond the bars (ranges, guide lines,
etc.), also create `<Name>Overlay: React.FC<{ board: BoardState }>` in the
same file and pass it to the `Overlay` prop of `SortSection`.

### 4. Wire it into `src/App.tsx` (6 places)

Search for the existing `selection` integration points and mirror them:

1. Imports (the build function and the Legend)
2. Add a board with `useState`: `makeBoard('<kind>', base)`
3. Add a `set<Name>((prev) => ...)` block to the timer effect
4. Completion effect: the GA `sort_finish` event
   (`algorithm_type: '<kind>_sort'`) and **add the board to the AND
   condition of all boards' `finished` for `setPlaying(false)`**
   (if forgotten, playback never stops)
5. Add to `resetFrom` and `handleStart`
6. Add to the `Accordion` `defaultValue` array and add a `<SortSection>`.
   Unless the user specifies otherwise, insert it in
   "simple algorithms → fast algorithms" order
   (e.g. bubble → selection → insertion → quick)

### 5. Check the guards in `applyStep`

Some steps such as `markL` / `clearMarks` are guarded by kind inside
`applyStep()`, e.g. `next.kind === 'quick' || next.kind === 'selection'`.
When reusing an existing step, **nothing will be displayed unless you add
the new kind to the guard** — with no error to tell you why.

### 6. Localization — BOTH `src/ja/locale.json` and `src/en/locale.json`

- `"<kind>"`: panel title (e.g. `"selection": "選択ソート"` / `"Selection Sort"`)
- `"bars_aria_<kind>"`: aria-label of the bars region (tests look elements
  up by this label)
- Keys for any new legend badges you created (e.g. `badge_min`)

### 7. Legend colors — `src/styles.css` (only if needed)

For a new legend badge, add `.legend-<xxx> { background: var(--token); }`.
Pick the color from the existing CSS variables in `:root` (keep it
consistent with the bar-side highlight color).

### 8. Tests

- `src/__tests__/visualizer.spec.ts`: add one logic test for the step list.
  Three checks are sufficient: (1) `applySwaps` yields ascending order,
  (2) one or two properties that characterize the algorithm (e.g. selection
  sort does ≤ n-1 swaps; bubble sort only compares adjacent elements),
  (3) structural consistency of the step list (mark set/clear pairing, etc.).
- `src/__tests__/ui.spec.tsx`: add the new panel to every "all panels" test.
  Targets: initialization (bar count / height equality), legend visibility,
  size change ×2, shuffle, and the playback-completion test (fetch elements
  by the `bars_aria_<kind>` label).
- **Grep for constants that depend on the panel count.** For example, the
  legend test's `expect(stepZeros.length).toBeGreaterThanOrEqual(3)` still
  passes after adding a panel because the assertion is loose, so it is easy
  to miss. Search for the current count (e.g. `3`) and update it.

### 9. Verification (run inside Docker; everything must pass)

This project assumes devcontainer / Docker: run all checks in the
container. (Host-side `node_modules` may also exist purely for editor
IntelliSense — if you need to (re)install it, use
`COREPACK_ENABLE_AUTO_PIN=0 yarn install --frozen-lockfile` so host yarn
does not silently add a `packageManager` field to `package.json`; revert
that field if it appears.)

```bash
docker compose up -d --build   # first run installs deps inside the container (takes minutes)
docker compose exec -T app bash -c 'yarn typecheck && yarn lint && yarn format && yarn test'
```

- Fix lint / format warnings and errors at the root cause — never paper
  over them with suppression comments. Resolve formatting diffs with
  `yarn format:fix`, then confirm with `yarn format`.
- For browser checks, open http://localhost:1234/ja/ (or `/en/`) on the dev
  server that compose starts automatically. In headless/hidden tabs,
  `setInterval` gets throttled and playback looks extremely slow, so verify
  completion with the fake-timer test instead.

## Pitfalls (issues actually hit during implementation)

- **`userEvent` hangs under fake timers.** For clicks while
  `vi.useFakeTimers()` is active, use the synchronous `fireEvent.click`
  (this removes the need for `await`, so make the test function synchronous
  too, or the `require-await` lint rule fails).
- **The kind guards in `applyStep`**: even when reusing an existing step
  (`markL`, etc.), forgetting to add the new kind to the guard produces
  "no error, but nothing shows up".
- **The `Kind` type is duplicated in two files** (SortSection.tsx /
  App.tsx). Fixing only one is caught by the type checker, but searching
  and fixing both up front is faster.
- **Forgetting to add the new board to the "all finished →
  `setPlaying(false)`" AND condition** leaves the app stuck in the playing
  state after sorting completes, and the play button never comes back.
- **The host yarn rewrites `package.json`** (the `packageManager` field
  mentioned above) unless `COREPACK_ENABLE_AUTO_PIN=0` is set.
- **Deleting the host `node_modules` breaks editor IntelliSense**
  (`ts(2875) react/jsx-runtime not found` in the editor) when the project
  is opened outside a devcontainer. Keep it, or reinstall as above.
- **Do not touch `node_modules` from the host while the container runs.**
  Deleting it on the host breaks the anonymous-volume mountpoint inside the
  container ("prettier: not found" etc.). Recover with
  `docker compose up -d --force-recreate`.
- **Playback appears frozen in hidden tabs** (browser timer throttling).
  Do not mistake this for an app bug.

## Maintainability hints

- **Prefer expressing the visualization with existing `Step` types.**
  Adding a new step type cascades into `applyStep`, the type definitions,
  and possibly an Overlay. If the visual meaning is the same (e.g. "mark a
  candidate"), reuse the existing step and leave a comment noting the
  shared usage.
- **Wire up App.tsx by searching for "selection" and mirroring
  mechanically.** Board integration is currently spread across 6 places in
  App.tsx, which is where omissions happen most. If boards keep growing,
  it is worth proposing a refactor that gathers kind / build function /
  Legend / GA name into a single array definition mapped over (including
  extracting a helper for the ×3 duplicated timer-effect blocks).
- **Include at least one algorithm-specific property in the tests**
  (selection: swaps ≤ n-1; bubble: adjacent-only comparisons; etc.).
  Verifying only "it sorts" lets implementation mistakes slip through.
- **Write comments that explain intent (the "why").** Existing code uses
  Japanese comments, so match that.

## Completion checklist

- [ ] `build<Name>Steps` is pure and updates the local array when pushing swaps
- [ ] `Kind` extended in both files (SortSection.tsx / App.tsx)
- [ ] All 6 App.tsx integration points done (especially the "stop when all finished" condition)
- [ ] Kind guards in `applyStep` checked
- [ ] Keys added to both ja and en locale.json
- [ ] Tests added to both visualizer.spec.ts and ui.spec.tsx (panel-count constants grepped)
- [ ] `yarn typecheck && yarn lint && yarn format && yarn test` all pass inside Docker
