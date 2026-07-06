export interface StepBase {
  show?: boolean | null;
}
export interface StepCompare extends StepBase {
  t: 'compare';
  i: number;
  j: number;
}
export interface StepSwap extends StepBase {
  t: 'swap';
  i: number;
  j: number;
}
export interface StepPivot extends StepBase {
  t: 'pivot';
  i: number | null;
}
export interface StepRange extends StepBase {
  t: 'range';
  lo: number | null;
  hi: number | null;
}
export interface StepBoundary extends StepBase {
  t: 'boundary';
  k: number;
  lo?: number;
  hi?: number;
}
export interface StepMarkL extends StepBase {
  t: 'markL';
  i: number;
}
export interface StepMarkR extends StepBase {
  t: 'markR';
  i: number;
}
export interface StepClear extends StepBase {
  t: 'clearMarks';
}
export type Step =
  | StepCompare
  | StepSwap
  | StepPivot
  | StepRange
  | StepBoundary
  | StepMarkL
  | StepMarkR
  | StepClear;

export const SWAP_TRANS_MS = 120; // 棒の入れ替えアニメーション（CSS transition）の時間
export const BASE_STEP_MS = 600; // 速度 1.00x のときの基準ステップ間隔（SPEED_COEFF 適用前）
export const MIN_TIMER_MS = 4; // setInterval の実用下限。これ未満はブラウザが保証しないため打ち切る
export const SPEED_COEFF = 0.7; // 体感速度の補正係数。1.00x でも 600ms より少しゆっくり見せる

/** UI の速度スライダー値 (0.2〜10) を setInterval の間隔(ms)に変換する */
export function computeInterval(speed: number): number {
  const s = Math.max(0.2, Math.min(10, speed));
  const effective = SPEED_COEFF * s;
  const ms = Math.floor(BASE_STEP_MS / effective);
  return Math.max(MIN_TIMER_MS, ms);
}

/** 1〜n の重複なし整数列を Fisher–Yates でシャッフルして返す（棒の初期配置） */
export function genArray(n: number): number[] {
  const size = Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0);
  const arr = Array.from({ length: size }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * バブルソートの再生ステップ列を生成する。
 * 隣接要素の compare を必ず先に積み、大小が逆なら直後に swap を積む
 * （UI 側は「比較 → 入れ替え」の順で 1 ステップずつ再生する前提）
 */
export function buildBubbleSteps(arr: number[]): Step[] {
  const a = arr.slice();
  const steps: Step[] = [];
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({ t: 'compare', i: j, j: j + 1 });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        steps.push({ t: 'swap', i: j, j: j + 1 });
      }
    }
  }
  return steps;
}

/**
 * 選択ソートの再生ステップ列を生成する。
 * - markL: 現在の「最小値候補」を紫リングで示す（クイックソートの左候補マークを流用）
 * - compare: 未ソート領域の各要素と最小値候補の比較
 * - swap: 各パスの最後に 1 回だけ発生（選択ソートは交換回数が最大 n-1 回で済むのが特徴）
 * - clearMarks: パス終了時に候補マークを消す
 */
export function buildSelectionSteps(arr: number[]): Step[] {
  const a = arr.slice();
  const steps: Step[] = [];
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    // 未ソート領域の先頭を最小値候補としてマークする
    let minIdx = i;
    steps.push({ t: 'markL', i: minIdx });
    for (let j = i + 1; j < n; j++) {
      steps.push({ t: 'compare', i: j, j: minIdx });
      if (a[j] < a[minIdx]) {
        // より小さい値が見つかったので候補マークを移動する
        minIdx = j;
        steps.push({ t: 'markL', i: minIdx });
      }
    }
    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      steps.push({ t: 'swap', i, j: minIdx });
    }
    steps.push({ t: 'clearMarks' });
  }
  return steps;
}

export function buildQuickSteps(arr: number[]): Step[] {
  const a = arr.slice();
  const steps: Step[] = [];

  const swap = (i: number, j: number) => {
    if (i === j) return;
    [a[i], a[j]] = [a[j], a[i]];
    steps.push({ t: 'swap', i, j });
  };

  const stack: Array<[number, number]> = [[0, a.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    if (lo >= hi) continue;

    const pIdx = hi;
    const pivotVal = a[pIdx];

    steps.push({ t: 'range', lo, hi });
    steps.push({ t: 'pivot', i: pIdx });

    let i = lo;
    let j = hi - 1;
    steps.push({ t: 'boundary', k: i, lo, hi, show: false });

    while (true) {
      while (i <= j && a[i] <= pivotVal) {
        steps.push({ t: 'compare', i, j: pIdx });
        i++;
      }
      if (i <= j) {
        steps.push({ t: 'compare', i, j: pIdx });
        steps.push({ t: 'markL', i });
        steps.push({ t: 'boundary', k: i, lo, hi, show: false });
      }

      while (i <= j && a[j] >= pivotVal) {
        steps.push({ t: 'compare', i: j, j: pIdx });
        j--;
      }
      if (i <= j) {
        steps.push({ t: 'compare', i: j, j: pIdx });
        steps.push({ t: 'markR', i: j });
      }

      if (i >= j) {
        steps.push({ t: 'clearMarks' });
        break;
      }

      swap(i, j);
      steps.push({ t: 'clearMarks' });
      i++;
      j--;
      steps.push({ t: 'boundary', k: i, lo, hi, show: false });
    }

    if (i > hi) i = hi;
    swap(i, hi);
    steps.push({ t: 'pivot', i });
    steps.push({ t: 'boundary', k: i, lo, hi, show: false });
    steps.push({ t: 'range', lo: null, hi: null });

    stack.push([lo, i - 1]);
    stack.push([i + 1, hi]);
  }

  steps.push({ t: 'pivot', i: null });
  steps.push({ t: 'range', lo: null, hi: null });
  return steps;
}
