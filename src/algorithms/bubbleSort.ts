import type { Step } from "../steps";

export function buildBubbleSteps(arr: number[]): Step[] {
  const a = arr.slice();
  const steps: Step[] = [];
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({ t: "compare", i: j, j: j + 1 });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        steps.push({ t: "swap", i: j, j: j + 1 });
      }
    }
  }
  return steps;
}
