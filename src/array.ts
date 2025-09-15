export function genArray(n: number): number[] {
  const size = Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0);
  const arr = Array.from({ length: size }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
