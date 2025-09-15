import type { Step } from "../steps";

export function buildQuickSteps(arr: number[]): Step[] {
  const a = arr.slice();
  const steps: Step[] = [];
  const swap = (i: number, j: number) => {
    if (i === j) return;
    [a[i], a[j]] = [a[j], a[i]];
    steps.push({ t: "swap", i, j });
  };
  const stack: [number, number][] = [[0, a.length - 1]];

  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    if (lo >= hi) continue;
    const pIdx = hi; // pivot is rightmost
    const pivotVal = a[pIdx];
    steps.push({ t: "range", lo, hi });
    steps.push({ t: "pivot", i: pIdx });

    let i = lo;
    let j = hi - 1;
    steps.push({ t: "boundary", k: i, lo, hi, show: false });

    while (true) {
      while (i <= j && a[i] <= pivotVal) {
        steps.push({ t: "compare", i, j: pIdx });
        i++;
      }
      if (i <= j) {
        steps.push({ t: "compare", i, j: pIdx });
        steps.push({ t: "markL", i });
        steps.push({ t: "boundary", k: i, lo, hi, show: true });
      }
      while (i <= j && a[j] >= pivotVal) {
        steps.push({ t: "compare", i: j, j: pIdx });
        j--;
      }
      if (i <= j) {
        steps.push({ t: "compare", i: j, j: pIdx });
        steps.push({ t: "markR", i: j });
      }
      if (i >= j) {
        steps.push({ t: "clearMarks" });
        break;
      }
      swap(i, j);
      steps.push({ t: "clearMarks" });
      i++;
      j--;
      steps.push({ t: "boundary", k: i, lo, hi, show: false });
    }

    if (i > hi) i = hi;
    swap(i, hi);
    steps.push({ t: "pivot", i });
    steps.push({ t: "boundary", k: i, lo, hi, show: false });
    steps.push({ t: "range", lo: null, hi: null });

    stack.push([lo, i - 1]);
    stack.push([i + 1, hi]);
  }

  steps.push({ t: "pivot", i: null });
  steps.push({ t: "range", lo: null, hi: null });
  return steps;
}
