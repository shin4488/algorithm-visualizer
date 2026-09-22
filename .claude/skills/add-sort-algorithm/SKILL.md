---
name: add-sort-algorithm
description: Add a sorting algorithm and its panel to algorithm-visualizer, including playback, localization, and tests.
---

# Add a sorting algorithm

Use the existing selection sort as a reference. Algorithms build a complete list of steps; shared components render one step per timer tick. All boards must start with the same base array.

## Step builder

In `src/plugins/visualizer.ts`, add a pure `build<Name>Steps(arr): Step[]` function. Copy the input before modifying it. Each emitted `swap` must also update that local copy so later comparisons use the correct values. Emit a comparison before the swap it causes.

Reuse existing `Step` variants where their visual meaning fits. If a new variant is necessary, extend the union and `applyStep()` in `src/App.tsx`. Check kind-specific guards when reusing marks; an omitted kind can silently hide them.

## Integration

- Extend `Kind` in both `src/components/SortSection.tsx` and `src/App.tsx`.
- Add a legend under `src/components/algorithms/`. Add an overlay only when the shared bars cannot express the visualization; use existing color tokens for new badges in `src/styles.css`.
- Search `src/App.tsx` for the existing algorithm and cover its integration points: imports, board state, timer updates, completion handling, reset/start, the `algorithmOrder` and `visibleAlgorithms` defaults, and the board/legend mappings used to render panels.
- Include the board in the all-finished condition that stops playback, and emit `sort_finish` with `algorithm_type: '<kind>_sort'`.
- Unless requested otherwise, place simple algorithms before faster ones.
- Add the title, `bars_aria_<kind>`, and any legend keys to both `src/ja/locale.json` and `src/en/locale.json`.

## Verification

- In `src/__tests__/visualizer.spec.ts`, check ascending output, an algorithm-specific property, and step consistency such as mark pairing. Use `applySwaps` when the algorithm is expressed as swaps.
- In `src/__tests__/ui.spec.tsx`, include the new panel in initialization, legend, size-change, shuffle, and completion checks. Review assertions that depend on the number of panels; loose lower bounds can hide omissions.
- Use synchronous `fireEvent` with fake timers; `userEvent` can hang. Hidden browser tabs throttle playback, so use the fake-timer test to verify completion.
- Run the required Docker checks in [AGENTS.md](../../../AGENTS.md#golden-rules). Fix formatting with `yarn format:fix` in the container, then check again. Inspect the new panel at `/ja/` and `/en/` on the development server.

Complete the integration, translations, and checks before reporting the result. Preserve Japanese comments that explain intent.
