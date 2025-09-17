import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildBubbleSteps, buildQuickSteps, genArray, type Step } from '../visualizer';
type StepWithBoundary = Extract<Step, { t: 'boundary' }>;

afterEach(() => {
  vi.restoreAllMocks();
});

function applySwaps(initial: number[], steps: Step[]): number[] {
  const arr = initial.slice();
  for (const step of steps) {
    if (step.t === 'swap') {
      const { i, j } = step;
      if (i >= 0 && j >= 0) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
  }
  return arr;
}

describe('visualizer logic specification', () => {
  it('produces bubble sort steps that compare adjacent bars and sort the sequence', () => {
    const original = [5, 3, 4, 1, 2];
    const steps = buildBubbleSteps(original);
    const sorted = applySwaps(original, steps);

    expect(sorted).toEqual([1, 2, 3, 4, 5]);

    const comparisons = steps.filter(step => step.t === 'compare');
    const n = original.length;
    expect(comparisons).toHaveLength((n * (n - 1)) / 2);

    comparisons.forEach(step => {
      if (step.t === 'compare') {
        expect(step.j - step.i).toBe(1);
      }
    });

    steps.forEach((step, index) => {
      if (step.t === 'swap') {
        expect(index).toBeGreaterThan(0);
        const prev = steps[index - 1];
        expect(prev.t).toBe('compare');
        if (prev.t === 'compare') {
          expect(prev.i).toBe(step.i);
          expect(prev.j).toBe(step.j);
        }
      }
    });
  });

  it('builds quick sort steps that respect the rightmost pivot and produce candidate markers', () => {
    const original = [5, 1, 4, 2, 3];
    const steps = buildQuickSteps(original);
    const sorted = applySwaps(original, steps);

    expect(sorted).toEqual([1, 2, 3, 4, 5]);

    let activeRange: { lo: number; hi: number } | null = null;
    let currentPivot: number | null = null;
    let pendingPivotSwap: Extract<Step, { t: 'swap' }> | null = null;

    steps.forEach((step, index) => {
      switch (step.t) {
        case 'range': {
          if (step.lo != null && step.hi != null) {
            activeRange = { lo: step.lo, hi: step.hi };
            const next = steps[index + 1] as Step | undefined;
            expect(next).toBeDefined();
            expect(next?.t).toBe('pivot');
            if (next?.t === 'pivot') {
              expect(next.i).toBe(step.hi);
            }
          } else {
            activeRange = null;
          }
          break;
        }
        case 'pivot': {
          if (pendingPivotSwap) {
            expect(step.i === pendingPivotSwap.i || step.i === pendingPivotSwap.j).toBe(true);
            pendingPivotSwap = null;
          }
          currentPivot = step.i;
          break;
        }
        case 'markL': {
          expect(activeRange).not.toBeNull();
          expect(step.i).toBeGreaterThanOrEqual(activeRange!.lo);
          expect(step.i).toBeLessThanOrEqual(activeRange!.hi);
          const prev = steps[index - 1];
          expect(prev.t).toBe('compare');
          if (prev.t === 'compare') {
            expect(prev.i).toBe(step.i);
            expect(prev.j).toBe(currentPivot);
          }
          const next = steps[index + 1];
          expect(next?.t).toBe('boundary');
          if (next?.t === 'boundary') {
            expect(next.show).toBe(false);
            expect(next.lo ?? activeRange!.lo).toBeLessThanOrEqual(activeRange!.hi);
          }
          break;
        }
        case 'markR': {
          expect(activeRange).not.toBeNull();
          expect(step.i).toBeGreaterThanOrEqual(activeRange!.lo);
          expect(step.i).toBeLessThanOrEqual(activeRange!.hi);
          const prev = steps[index - 1];
          expect(prev.t).toBe('compare');
          if (prev.t === 'compare') {
            expect(prev.i).toBe(step.i);
            expect(prev.j).toBe(currentPivot);
          }
          break;
        }
        case 'swap': {
          if (activeRange) {
            expect(step.i).toBeGreaterThanOrEqual(activeRange.lo);
            expect(step.i).toBeLessThanOrEqual(activeRange.hi);
            expect(step.j).toBeGreaterThanOrEqual(activeRange.lo);
            expect(step.j).toBeLessThanOrEqual(activeRange.hi);
            if (step.j === activeRange.hi) {
              pendingPivotSwap = step;
            } else {
              const window = steps.slice(index + 1, index + 4);
              const boundary = window.find(s => s.t === 'boundary') as StepWithBoundary | undefined;
              expect(boundary).toBeDefined();
              expect(boundary?.show).toBe(false);
            }
          }
          break;
        }
        default:
          break;
      }
    });

    const hasCandidateMarks =
      steps.some(step => step.t === 'markL') && steps.some(step => step.t === 'markR');
    expect(hasCandidateMarks).toBe(true);
  });

  it('generates permutations covering the slider specification bounds', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
    const five = genArray(5);
    const fifty = genArray(50);
    random.mockRestore();

    expect(five).toHaveLength(5);
    expect(new Set(five).size).toBe(5);
    expect(Math.min(...five)).toBe(1);
    expect(Math.max(...five)).toBe(5);

    expect(fifty).toHaveLength(50);
    expect(new Set(fifty).size).toBe(50);
    expect(Math.min(...fifty)).toBe(1);
    expect(Math.max(...fifty)).toBe(50);
  });
});
