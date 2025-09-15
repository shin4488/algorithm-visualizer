import type { Step } from "../src/steps";

export function simulate(arr: number[], steps: Step[]): number[] {
  const a = arr.slice();
  for (const s of steps) {
    if (s.t === "swap") {
      const { i, j } = s;
      if (i >= 0 && j >= 0) {
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
  }
  return a;
}

export function isSortedAsc(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) {
    if (a[i - 1] > a[i]) return false;
  }
  return true;
}
