import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  buildBubbleSteps,
  buildSelectionSteps,
  buildMergeSteps,
  buildQuickSteps,
  genArray,
  type Step,
} from '@/plugins/visualizer';

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

function isStep<T extends Step['t']>(t: T) {
  return (step: Step): step is Extract<Step, { t: T }> => step.t === t;
}

// 比較・交換の 2 本は画面上で区別しないため、順序を除いて比べる
function pairOf(i: number, j: number): [number, number] {
  return i < j ? [i, j] : [j, i];
}

function ascending(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function positions(from: number, to: number): number[] {
  return Array.from({ length: to - from }, (_, offset) => from + offset);
}

/** 各ステップと、そのステップを適用した後の棒の並びを組にする */
function withBars(initial: number[], steps: Step[]) {
  const bars = initial.slice();
  return steps.map((step) => {
    if (step.t === 'swap') [bars[step.i], bars[step.j]] = [bars[step.j], bars[step.i]];
    if (step.t === 'write') bars[step.i] = step.value;
    return { step, bars: bars.slice() };
  });
}

describe('visualizer logic specification', () => {
  it('produces bubble sort steps that compare adjacent bars and sort the sequence', () => {
    const original = [5, 3, 4, 1, 2];
    const steps = buildBubbleSteps(original);
    const sorted = applySwaps(original, steps);

    expect(sorted).toEqual([1, 2, 3, 4, 5]);

    const comparisons = steps.filter(isStep('compare'));
    const n = original.length;
    expect(comparisons).toHaveLength((n * (n - 1)) / 2);

    comparisons.forEach((step) => {
      expect(Math.abs(step.j - step.i)).toBe(1);
    });

    steps.forEach((step, index) => {
      if (step.t === 'swap') {
        const prev = steps[index - 1];
        expect(prev?.t).toBe('compare');
        if (prev?.t === 'compare') {
          expect(pairOf(prev.i, prev.j)).toEqual(pairOf(step.i, step.j));
        }
      }
    });
  });

  it.each([
    // 各パスの最小値 1, 2, 3, 4 を、パスの先頭 0〜3 番目へ 1 回ずつ移す
    {
      input: [5, 3, 4, 1, 2],
      swaps: [
        [0, 3],
        [1, 4],
        [2, 4],
        [3, 4],
      ],
    },
    // 最小値がすでにパスの先頭にある最初のパスでは入れ替えない
    { input: [1, 3, 2], swaps: [[1, 2]] },
  ])(
    'swaps the minimum of each selection sort pass into the front of the pass only when it is elsewhere ($input)',
    ({ input, swaps }) => {
      const steps = buildSelectionSteps(input);

      expect(applySwaps(input, steps)).toEqual(ascending(input));
      expect(steps.filter(isStep('swap')).map((step) => pairOf(step.i, step.j))).toEqual(swaps);
    },
  );

  it('compares every unsorted bar with the minimum candidate in each selection sort pass', () => {
    const original = [5, 3, 4, 1, 2];
    const n = original.length;
    const steps = buildSelectionSteps(original);

    // パスは clearMarks で終わる
    const passes: Step[][] = [[]];
    for (const step of steps) {
      passes[passes.length - 1].push(step);
      if (step.t === 'clearMarks') passes.push([]);
    }
    expect(passes.pop()).toEqual([]);
    expect(passes).toHaveLength(n - 1);

    passes.forEach((pass, start) => {
      // パスの先頭を最初の最小値候補にする
      expect(pass[0]).toEqual({ t: 'markL', i: start });
      let candidate = start;
      const compared: number[] = [];
      for (const step of pass) {
        if (step.t === 'markL') candidate = step.i;
        if (step.t === 'compare') {
          expect([step.i, step.j]).toContain(candidate);
          compared.push(step.i === candidate ? step.j : step.i);
        }
      }
      // 選択ソートは入力によらず、未ソートの残りの棒すべてを 1 回ずつ候補と比べる
      expect(ascending(compared)).toEqual(positions(start + 1, n));
    });
  });

  describe('merge sort steps', () => {
    const input = [4, 2, 4, 1, 2];

    type Merge = {
      lo: number;
      hi: number;
      split: number;
      left: number[];
      right: number[];
      /** mergeStart 時点の棒の並び */
      bars: number[];
      /** mergeStart の後、範囲の表示を消すまでのステップ */
      steps: Step[];
    };

    /** ステップ列をマージごとに区切り、マージの開始時に表示している範囲と分け目を添える */
    function traceMerges(values: number[]): Merge[] {
      const merges: Merge[] = [];
      let range: { lo: number; hi: number } | null = null;
      let split: number | null = null;
      let current: Merge | null = null;
      for (const { step, bars } of withBars(values, buildMergeSteps(values))) {
        if (step.t === 'range') {
          range = step.lo == null || step.hi == null ? null : { lo: step.lo, hi: step.hi };
          current = null;
        } else if (step.t === 'boundary') {
          split = step.k;
        } else if (step.t === 'mergeStart') {
          expect(range).not.toBeNull();
          expect(split).not.toBeNull();
          current = {
            ...range!,
            split: split!,
            left: step.left,
            right: step.right,
            bars,
            steps: [],
          };
          merges.push(current);
        } else {
          // 比較・結果への移動・書き戻しは、範囲を表示しているマージの中でだけ行う
          expect(current, `${step.t} outside a merge`).not.toBeNull();
          current?.steps.push(step);
        }
      }
      return merges;
    }

    it('writes the values back in ascending order without changing the input', () => {
      const bars = input.slice();
      for (const step of buildMergeSteps(input)) {
        if (step.t === 'write') bars[step.i] = step.value;
      }

      expect(bars).toEqual([1, 2, 2, 4, 4]);
      expect(input).toEqual([4, 2, 4, 1, 2]);
    });

    it('produces no steps when there is nothing to sort', () => {
      expect(buildMergeSteps([])).toEqual([]);
      expect(buildMergeSteps([1])).toEqual([]);
    });

    it('starts each merge by showing the two sorted halves of the highlighted range', () => {
      const merges = traceMerges(input);

      // 5 個を 1 個ずつに分けてから 1 列にまとめるには 4 回マージする
      expect(merges).toHaveLength(4);
      for (const { lo, hi, split, left, right, bars } of merges) {
        // 分け目は範囲の内側にあり、左右とも 1 個以上になる
        expect(split).toBeGreaterThan(lo);
        expect(split).toBeLessThanOrEqual(hi);
        expect(left).toEqual(bars.slice(lo, split));
        expect(right).toEqual(bars.slice(split, hi + 1));
        expect(left).toEqual(ascending(left));
        expect(right).toEqual(ascending(right));
      }
    });

    it('compares the two heads and moves the smaller one to the result, taking the left one on ties', () => {
      let ties = 0;
      for (const { lo, split, left, right, steps } of traceMerges(input)) {
        let taken = { left: 0, right: 0 };
        steps.forEach((step, index) => {
          if (step.t !== 'mergeTake') return;
          const leftHead = left[taken.left];
          const rightHead = right[taken.right];
          if (leftHead != null && rightHead != null) {
            // 左右の先頭の棒を比べてから、小さい方（同じ値なら左）を取る
            const prev = steps[index - 1];
            expect(prev?.t).toBe('compare');
            if (prev?.t === 'compare') {
              expect(pairOf(prev.i, prev.j)).toEqual([lo + taken.left, split + taken.right]);
            }
            if (leftHead === rightHead) ties++;
            expect(step.side).toBe(leftHead <= rightHead ? 'left' : 'right');
          } else {
            // 片方が空になったら、残った側から取る
            expect(step.side).toBe(leftHead != null ? 'left' : 'right');
          }
          // 取った値と、その値を持つ棒の位置を示す
          if (step.side === 'left') {
            expect(step).toMatchObject({ value: leftHead, source: lo + taken.left });
            taken = { ...taken, left: taken.left + 1 };
          } else {
            expect(step).toMatchObject({ value: rightHead, source: split + taken.right });
            taken = { ...taken, right: taken.right + 1 };
          }
        });
        expect(taken).toEqual({ left: left.length, right: right.length });
      }
      // 同じ値どうしの比較を含む入力で確かめる
      expect(ties).toBeGreaterThan(0);
    });

    it('writes the result back into the range only after every value has been taken', () => {
      for (const { lo, left, right, steps } of traceMerges(input)) {
        const firstWrite = steps.findIndex(isStep('write'));
        const result = steps.slice(0, firstWrite).filter(isStep('mergeTake'));
        const writes = steps.slice(firstWrite);

        // 書き戻しの前に、結果が昇順で揃っている
        expect(result.map((step) => step.value)).toEqual(ascending([...left, ...right]));
        // 書き戻しを始めたら、比較や結果への移動はしない
        expect(writes.every(isStep('write'))).toBe(true);
        // 範囲の各位置に、結果の値を 1 回ずつ書き込む
        expect(
          writes
            .filter(isStep('write'))
            .map(({ i, value }) => ({ i, value }))
            .sort((a, b) => a.i - b.i),
        ).toEqual(result.map(({ value }, offset) => ({ i: lo + offset, value })));
      }
    });
  });

  describe('quick sort steps', () => {
    const inputs = [
      { name: 'distinct values', input: [5, 1, 4, 2, 3] },
      // 左右の走査がどちらもピボットと同じ値 2 を通り、それを候補にしないことを確かめる
      { name: 'values equal to the pivot', input: [2, 3, 1, 2, 2] },
    ];

    type Partition = {
      lo: number;
      hi: number;
      /** 範囲を表示してから消すまでのステップと、適用後の棒の並び */
      entries: { step: Step; bars: number[] }[];
    };

    /** ステップ列を、範囲を表示している区間ごとに区切る */
    function tracePartitions(values: number[]): Partition[] {
      const partitions: Partition[] = [];
      let current: Partition | null = null;
      for (const entry of withBars(values, buildQuickSteps(values))) {
        const { step } = entry;
        if (step.t === 'range') {
          current =
            step.lo == null || step.hi == null ? null : { lo: step.lo, hi: step.hi, entries: [] };
          if (current) partitions.push(current);
        } else if (current) {
          current.entries.push(entry);
        } else {
          // 比較・候補・交換は、範囲を表示している間にだけ行う
          expect(['compare', 'markL', 'markR', 'swap']).not.toContain(step.t);
        }
      }
      return partitions;
    }

    /** 区間の最初に示すピボットの値 */
    function pivotValueOf({ entries }: Partition): number {
      const first = entries.find(({ step }) => step.t === 'pivot');
      if (first?.step.t !== 'pivot' || first.step.i == null) throw new Error('pivot is not shown');
      return first.bars[first.step.i];
    }

    it.each(inputs)('sorts $name into ascending order by swaps', ({ input }) => {
      const original = input.slice();
      expect(applySwaps(input, buildQuickSteps(input))).toEqual(ascending(input));
      expect(input).toEqual(original);
    });

    it.each(inputs)('uses the rightmost bar of each range as the pivot ($name)', ({ input }) => {
      const partitions = tracePartitions(input);

      expect(partitions.length).toBeGreaterThan(0);
      for (const { hi, entries } of partitions) {
        expect(entries.find(({ step }) => step.t === 'pivot')?.step).toEqual({ t: 'pivot', i: hi });
      }
    });

    it.each(inputs)(
      'marks a larger bar on the left and a smaller bar on the right after comparing them with the pivot, then swaps them ($name)',
      ({ input }) => {
        let candidateSwaps = 0;
        for (const partition of tracePartitions(input)) {
          const { lo, hi, entries } = partition;
          const pivot = pivotValueOf(partition);
          const compared = new Set<number>();
          let candL: number | null = null;
          let candR: number | null = null;
          for (const { step, bars } of entries) {
            switch (step.t) {
              case 'compare': {
                // 範囲内の棒を、右端のピボットの棒と比べる
                expect([step.i, step.j]).toContain(hi);
                const other = step.i === hi ? step.j : step.i;
                expect(other).toBeGreaterThanOrEqual(lo);
                expect(other).toBeLessThan(hi);
                compared.add(other);
                break;
              }
              case 'markL':
                expect(compared).toContain(step.i);
                expect(bars[step.i]).toBeGreaterThan(pivot);
                candL = step.i;
                break;
              case 'markR':
                expect(compared).toContain(step.i);
                expect(bars[step.i]).toBeLessThan(pivot);
                candR = step.i;
                break;
              case 'clearMarks':
                candL = null;
                candR = null;
                break;
              case 'swap':
                // ピボットを動かす交換以外は、左の候補と右の候補の入れ替え
                if (step.i !== hi && step.j !== hi) {
                  expect(candL).not.toBeNull();
                  expect(candR).not.toBeNull();
                  expect(candL!).toBeLessThan(candR!);
                  expect(pairOf(step.i, step.j)).toEqual([candL, candR]);
                  candidateSwaps++;
                }
                break;
              default:
                break;
            }
          }
        }
        // 候補どうしの入れ替えが起きる入力で確かめる
        expect(candidateSwaps).toBeGreaterThan(0);
      },
    );

    it.each(inputs)(
      'keeps only bars not greater than the pivot on the left of the boundary ($name)',
      ({ input }) => {
        for (const partition of tracePartitions(input)) {
          const { lo, hi, entries } = partition;
          const pivot = pivotValueOf(partition);
          for (const { step, bars } of entries) {
            if (step.t !== 'boundary') continue;
            expect(step.k).toBeGreaterThanOrEqual(lo);
            expect(step.k).toBeLessThanOrEqual(hi);
            bars.slice(lo, step.k).forEach((value) => expect(value).toBeLessThanOrEqual(pivot));
          }
        }
      },
    );

    it.each(inputs)(
      'moves the pivot between the bars not greater and the bars not smaller than it ($name)',
      ({ input }) => {
        for (const partition of tracePartitions(input)) {
          const { lo, hi, entries } = partition;
          const pivot = pivotValueOf(partition);
          const pivots = entries.filter(({ step }) => step.t === 'pivot');
          const last = pivots[pivots.length - 1];
          if (last?.step.t !== 'pivot' || last.step.i == null)
            throw new Error('pivot is not placed');

          const placed = last.step.i;
          expect(last.bars[placed]).toBe(pivot);
          last.bars.slice(lo, placed).forEach((value) => expect(value).toBeLessThanOrEqual(pivot));
          last.bars
            .slice(placed + 1, hi + 1)
            .forEach((value) => expect(value).toBeGreaterThanOrEqual(pivot));
        }
      },
    );
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
