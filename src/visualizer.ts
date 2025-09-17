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

export function genArray(n: number): number[] {
  const size = Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0);
  const arr = Array.from({ length: size }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

// ===== ユーザー指定の二方向探索（右端ピボット）実装 =====
export function buildQuickSteps(arr: number[]): Step[] {
  const a = arr.slice();
  const steps: Step[] = [];

  const swap = (i: number, j: number) => {
    if (i === j) {
      return;
    }
    [a[i], a[j]] = [a[j], a[i]];
    steps.push({ t: 'swap', i, j });
  };
  const stack: Array<[number, number]> = [[0, a.length - 1]];

  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    if (lo >= hi) {
      continue;
    }

    const pIdx = hi; // 1) ピボットは右端
    const pivotVal = a[pIdx];

    // 可視化
    steps.push({ t: 'range', lo, hi });
    steps.push({ t: 'pivot', i: pIdx });

    let i = lo;
    let j = hi - 1; // 右探索は pivot の1つ左から
    steps.push({ t: 'boundary', k: i, lo, hi, show: false }); // 左走査時は境界線を隠す

    // 両側探索（Hoare 風）
    while (true) {
      // 左から：pivot 以下ならスルー（毎回比較表示）。境界線は非表示更新
      while (i <= j && a[i] <= pivotVal) {
        steps.push({ t: 'compare', i: i, j: pIdx });
        i++;
      }
      // 候補（a[i] > pivot）に止まった位置も比較表示＆マークリング
      if (i <= j) {
        steps.push({ t: 'compare', i: i, j: pIdx });
        steps.push({ t: 'markL', i: i });
        // 左候補が確定したら、右走査に入る前に境界線を非表示にする
        steps.push({ t: 'boundary', k: i, lo, hi, show: false });
      }

      // 右から：pivot 以上ならスルー（毎回比較表示）。このフェーズは境界線を表示してOK
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
      } // 交差/一致で終了

      // 候補を交換
      swap(i, j);
      steps.push({ t: 'clearMarks' });
      i++;
      j--;
      // スワップ直後は左側に余計な境界線を出さない
      steps.push({ t: 'boundary', k: i, lo, hi, show: false });
    }

    // i が hi+1 へ進んだケースをケア
    if (i > hi) {
      i = hi;
    }

    // ピボットを境界 i に配置
    swap(i, hi);
    steps.push({ t: 'pivot', i: i });
    // ピボット確定直後は「処理対象なし」のため、水色枠/境界は消す
    steps.push({ t: 'boundary', k: i, lo, hi, show: false });
    steps.push({ t: 'range', lo: null, hi: null });

    // 再帰領域
    stack.push([lo, i - 1]);
    stack.push([i + 1, hi]);
  }

  // 片付け
  steps.push({ t: 'pivot', i: null });
  steps.push({ t: 'range', lo: null, hi: null });
  return steps;
}

export function init(): void {
  // ======= 共通設定 =======
  const SWAP_TRANS_MS = 120; // 棒の入れ替え（高さ遷移）は常に一定速度
  const BASE_STEP_MS = 600; // 1.00x のときのステップ間隔（←これが実効速度の基準）
  const MIN_TIMER_MS = 4; // 線形比率を壊さないための下限（ブラウザの最小タイマーに合わせる）
  const SPEED_COEFF = 0.7; // 全体をスロー目に（線形）

  const el = {
    // controls
    size: document.getElementById('size') as HTMLInputElement,
    sizeVal: document.getElementById('sizeVal') as HTMLElement,
    speed: document.getElementById('speed') as HTMLInputElement,
    speedVal: document.getElementById('speedVal') as HTMLElement,
    start: document.getElementById('start') as HTMLButtonElement,
    pause: document.getElementById('pause') as HTMLButtonElement,
    shuffle: document.getElementById('shuffle') as HTMLButtonElement,
    // steppers
    sizeMinus: document.getElementById('sizeMinus') as HTMLButtonElement,
    sizePlus: document.getElementById('sizePlus') as HTMLButtonElement,
    speedMinus: document.getElementById('speedMinus') as HTMLButtonElement,
    speedPlus: document.getElementById('speedPlus') as HTMLButtonElement,
    // boards
    barsBubble: document.getElementById('bars-bubble') as HTMLElement,
    barsQuick: document.getElementById('bars-quick') as HTMLElement,
    stepsBubble: document.getElementById('steps-bubble') as HTMLElement,
    stepsQuick: document.getElementById('steps-quick') as HTMLElement,
    // quick overlay
    partition: document.getElementById('partition-quick') as HTMLElement,
    zoneLeft: document.getElementById('zone-left') as HTMLElement,
    zoneRight: document.getElementById('zone-right') as HTMLElement,
    boundary: document.getElementById('boundary-line') as HTMLElement,
    subrange: document.getElementById('subrange-box') as HTMLElement,
    pivotLine: document.getElementById('pivot-hline') as HTMLElement,
  };

  interface Board {
    kind: 'bubble' | 'quick';
    data: number[];
    ids: number[];
    steps: Step[];
    stepIndex: number;
    pivotIndex: number | null;
    finished: boolean;
    range: { lo: number; hi: number } | null;
    boundaryIndex: number | null;
    pivotHeightPct: number | null;
  }

  const Global: {
    base: number[]; // 共有の初期配列
    size: number;
    speed: number;
    playing: boolean;
    timerBubble: ReturnType<typeof setInterval> | null;
    timerQuick: ReturnType<typeof setInterval> | null;
  } = {
    base: [],
    size: 20,
    speed: 1.0,
    playing: false,
    timerBubble: null,
    timerQuick: null,
  };

  function computeInterval() {
    // スライダー値 s を線形変換（比率厳密）
    const s = Math.min(
      parseFloat(el.speed.max) || 10,
      Math.max(parseFloat(el.speed.min) || 0.2, Global.speed)
    );
    const effective = SPEED_COEFF * s; // y = kx
    const ms = Math.floor(BASE_STEP_MS / effective);
    return Math.max(MIN_TIMER_MS, ms);
  }
  function updateVisualSpeed() {
    // 棒の入れ替え（高さ遷移）は固定速度
    document.documentElement.style.setProperty('--transMs', SWAP_TRANS_MS + 'ms');
  }
  // ======= ボードごとの状態 & ロジック =======
  function makeBoard(kind: 'bubble' | 'quick'): Board {
    return {
      kind,
      data: [],
      ids: [],
      steps: [],
      stepIndex: 0,
      pivotIndex: null,
      finished: false,
      range: null,
      boundaryIndex: null,
      pivotHeightPct: null,
    };
  }
  const Bubble: Board = makeBoard('bubble');
  const Quick: Board = makeBoard('quick');

  function renderBoard(board: Board, barsEl: HTMLElement, stepsEl: HTMLElement) {
    const max = Math.max(...board.data, 1);
    // Quick 側は overlay を保持するため、既存バーのみ削除
    if (barsEl !== el.barsQuick) {
      barsEl.innerHTML = '';
    } else {
      Array.from(barsEl.querySelectorAll('.bar')).forEach((n: Element) => n.remove());
    }

    board.data.forEach((v: number, idx: number) => {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = (v / max) * 100 + '%';
      if (board.pivotIndex === idx) {
        bar.classList.add('pivot');
      }
      bar.dataset.index = String(idx);
      bar.setAttribute('data-label', String(board.ids[idx] ?? idx + 1));
      barsEl.appendChild(bar);
    });
    stepsEl.textContent = String(board.steps.length);
  }

  function clearHighlights(barsEl: HTMLElement) {
    Array.from(barsEl.querySelectorAll('.bar')).forEach((c: Element) => {
      c.classList.remove('swap');
      c.classList.remove('compare');
    });
  }
  function markSwap(barsEl: HTMLElement, i: number, j: number) {
    const bi = barsEl.querySelectorAll<HTMLElement>('.bar')[i];
    const bj = barsEl.querySelectorAll<HTMLElement>('.bar')[j];
    if (bi) {
      bi.classList.add('swap');
    }
    if (bj) {
      bj.classList.add('swap');
    }
  }
  function markCompare(barsEl: HTMLElement, i: number, j: number) {
    const bi = barsEl.querySelectorAll<HTMLElement>('.bar')[i];
    const bj = barsEl.querySelectorAll<HTMLElement>('.bar')[j];
    if (bi) {
      bi.classList.add('compare');
    }
    if (bj) {
      bj.classList.add('compare');
    }
  }
  function setPivot(board: Board, barsEl: HTMLElement, idx: number | null) {
    board.pivotIndex = idx;
    Array.from(barsEl.querySelectorAll('.bar')).forEach((c: Element, i) =>
      c.classList.toggle('pivot', i === idx)
    );
  }
  function finishGlow(barsEl: HTMLElement) {
    Array.from(barsEl.querySelectorAll('.bar')).forEach((c: Element) => c.classList.add('sorted'));
  }

  // --- Quick 用: 境界・横線の描画 ---
  function updateQuickOverlay(params?: {
    lo: number | null;
    hi: number | null;
    k?: number | null;
    show?: boolean | null;
  }) {
    const { lo, hi, k, show } = params || {};
    const n = Quick.data.length || 1;
    const leftPct = lo == null ? 0 : (lo / n) * 100;
    const rightPct = hi == null ? 100 : ((hi + 1) / n) * 100;
    const boundaryPct = k == null ? leftPct : (k / n) * 100;

    // サブレンジ枠
    el.subrange.style.left = leftPct + '%';
    el.subrange.style.right = 100 - rightPct + '%';
    const showRange = !(lo == null || hi == null);
    el.subrange.style.display = showRange ? 'block' : 'none';

    // 左右ゾーン（範囲が無いときは非表示）
    el.zoneLeft.style.left = leftPct + '%';
    el.zoneLeft.style.right = 100 - boundaryPct + '%';
    el.zoneLeft.style.display = showRange ? 'block' : 'none';

    el.zoneRight.style.left = boundaryPct + '%';
    el.zoneRight.style.right = 100 - rightPct + '%';
    el.zoneRight.style.display = showRange ? 'block' : 'none';

    // 境界線（左走査フェーズでは非表示にできる）
    el.boundary.style.left = boundaryPct + '%';
    el.boundary.style.display = showRange && show !== false ? 'block' : 'none';

    // ピボット高の横線（範囲内いっぱいに引く）
    if (showRange && Quick.pivotIndex != null && Quick.pivotHeightPct != null) {
      el.pivotLine.style.left = leftPct + '%';
      el.pivotLine.style.right = 100 - rightPct + '%';
      el.pivotLine.style.bottom = Quick.pivotHeightPct + '%';
      el.pivotLine.style.display = 'block';
    } else {
      el.pivotLine.style.display = 'none';
    }
  }

  function applyStep(board: Board, barsEl: HTMLElement, step: Step | undefined) {
    if (!step) {
      return;
    }
    clearHighlights(barsEl);

    if (step.t === 'compare') {
      markCompare(barsEl, step.i, step.j);
    } else if (step.t === 'swap') {
      const { i, j } = step;
      if (i < 0 || j < 0) {
        return;
      }
      const bars = barsEl.querySelectorAll<HTMLElement>('.bar');

      // 値/ラベルを入れ替え
      [board.data[i], board.data[j]] = [board.data[j], board.data[i]];
      [board.ids[i], board.ids[j]] = [board.ids[j], board.ids[i]];
      const max = Math.max(...board.data, 1);
      const bi = bars[i];
      const bj = bars[j];
      if (bi) {
        bi.style.height = (board.data[i] / max) * 100 + '%';
        bi.setAttribute('data-label', String(board.ids[i]));
      }
      if (bj) {
        bj.style.height = (board.data[j] / max) * 100 + '%';
        bj.setAttribute('data-label', String(board.ids[j]));
      }

      // ピボットを含むスワップ → ピボット表示も追従
      if (board.kind === 'quick' && board.pivotIndex != null) {
        let newPivotIndex = board.pivotIndex;
        if (i === board.pivotIndex) {
          newPivotIndex = j;
        } else if (j === board.pivotIndex) {
          newPivotIndex = i;
        }
        if (newPivotIndex !== board.pivotIndex) {
          setPivot(board, barsEl, newPivotIndex);
        }
        const max2 = Math.max(...board.data, 1);
        Quick.pivotHeightPct = (board.data[board.pivotIndex] / max2) * 100;
        if (board.range) {
          updateQuickOverlay({
            lo: board.range.lo,
            hi: board.range.hi,
            k: board.boundaryIndex ?? board.range.lo,
            show: false,
          });
        }
      }

      // 演出
      if (bi) {
        bi.classList.remove('candL', 'candR');
      }
      if (bj) {
        bj.classList.remove('candL', 'candR');
      }
      markSwap(barsEl, i, j);
    } else if (step.t === 'pivot') {
      setPivot(board, barsEl, step.i);
      if (board.kind === 'quick') {
        if (step.i == null) {
          Quick.pivotHeightPct = null;
        } else {
          const max = Math.max(...board.data, 1);
          Quick.pivotHeightPct = (board.data[step.i] / max) * 100;
        }
        if (board.range) {
          updateQuickOverlay({
            lo: board.range.lo,
            hi: board.range.hi,
            k: board.boundaryIndex ?? board.range.lo,
            show: false,
          });
        }
      }
    } else if (step.t === 'range' && board.kind === 'quick') {
      if (step.lo == null || step.hi == null) {
        board.range = null;
        board.boundaryIndex = null;
        updateQuickOverlay({ lo: null, hi: null, k: null, show: false });
      } else {
        board.range = { lo: step.lo, hi: step.hi };
        board.boundaryIndex = step.lo; // 新しい処理対象の左端に境界をリセット
        // 新しいグループに入る瞬間は、前グループのピボット表示を一旦消す（横線も消す）
        setPivot(board, barsEl, null);
        Quick.pivotHeightPct = null;
        updateQuickOverlay({ lo: step.lo, hi: step.hi, k: step.lo, show: true });
      }
    } else if (step.t === 'boundary' && board.kind === 'quick') {
      board.boundaryIndex = step.k;
      const lo = step.lo ?? board.range?.lo ?? 0;
      const hi = step.hi ?? board.range?.hi ?? board.data.length - 1;
      updateQuickOverlay({ lo, hi, k: step.k, show: step.show });
    } else if (step.t === 'markL' && board.kind === 'quick') {
      const bar = barsEl.querySelectorAll<HTMLElement>('.bar')[step.i];
      if (bar) {
        bar.classList.add('candL');
      }
    } else if (step.t === 'markR' && board.kind === 'quick') {
      const bar = barsEl.querySelectorAll<HTMLElement>('.bar')[step.i];
      if (bar) {
        bar.classList.add('candR');
      }
    } else if (step.t === 'clearMarks' && board.kind === 'quick') {
      Array.from(barsEl.querySelectorAll('.bar')).forEach((b: Element) =>
        b.classList.remove('candL', 'candR')
      );
    }
  }

  function tick(board: Board) {
    const isBubble = board.kind === 'bubble';
    const barsEl = isBubble ? el.barsBubble : el.barsQuick;
    const stepsEl = isBubble ? el.stepsBubble : el.stepsQuick;

    if (board.stepIndex >= board.steps.length) {
      if (isBubble) {
        if (Global.timerBubble != null) {
          clearInterval(Global.timerBubble);
          Global.timerBubble = null;
        }
      } else {
        if (Global.timerQuick != null) {
          clearInterval(Global.timerQuick);
          Global.timerQuick = null;
          updateQuickOverlay({ lo: null, hi: null, k: null });
        }
      }
      board.finished = true;
      finishGlow(barsEl);
      if (!Global.timerBubble && !Global.timerQuick) {
        Global.playing = false;
        el.start.disabled = false;
        el.pause.disabled = true;
      }
      return;
    }
    const step = board.steps[board.stepIndex++];
    applyStep(board, barsEl, step);
    stepsEl.textContent = String(board.stepIndex);
  }

  function play() {
    if (Global.playing) {
      return;
    }
    Global.playing = true;
    el.start.disabled = true;
    el.pause.disabled = false;

    if (Bubble.steps.length === 0) {
      Bubble.steps = buildBubbleSteps(Bubble.data);
      el.stepsBubble.textContent = String(Bubble.steps.length);
    }
    if (Quick.steps.length === 0) {
      Quick.steps = buildQuickSteps(Quick.data);
      el.stepsQuick.textContent = String(Quick.steps.length);
    }

    const iv = computeInterval();
    Global.timerBubble = setInterval(() => tick(Bubble), iv);
    Global.timerQuick = setInterval(() => tick(Quick), iv);
  }

  function pause() {
    if (!Global.playing) {
      return;
    }
    if (Global.timerBubble != null) {
      clearInterval(Global.timerBubble);
      Global.timerBubble = null;
    }
    if (Global.timerQuick != null) {
      clearInterval(Global.timerQuick);
      Global.timerQuick = null;
    }
    Global.playing = false;
    el.start.disabled = false;
    el.pause.disabled = true;
  }

  function resetBoards() {
    Bubble.data = Global.base.slice();
    Quick.data = Global.base.slice();
    const n = Global.base.length;
    Bubble.ids = Array.from({ length: n }, (_, i) => i + 1);
    Quick.ids = Array.from({ length: n }, (_, i) => i + 1);
    Bubble.steps = [];
    Quick.steps = [];
    Bubble.stepIndex = 0;
    Quick.stepIndex = 0;
    Bubble.pivotIndex = null;
    Quick.pivotIndex = null;
    Bubble.finished = false;
    Quick.finished = false;
    Quick.range = null;
    Quick.boundaryIndex = null;
    Quick.pivotHeightPct = null;
    updateQuickOverlay({ lo: null, hi: null, k: null });

    renderBoard(Bubble, el.barsBubble, el.stepsBubble);
    renderBoard(Quick, el.barsQuick, el.stepsQuick);
    Array.from(el.barsBubble.querySelectorAll('.bar')).forEach((c: Element) =>
      c.classList.remove('sorted')
    );
    Array.from(el.barsQuick.querySelectorAll('.bar')).forEach((c: Element) =>
      c.classList.remove('sorted', 'candL', 'candR')
    );
  }

  // ======= サニティテスト（コンソール出力のみ） =======
  function simulate(arr: number[], steps: Step[]): number[] {
    const a = arr.slice();
    for (const s of steps) {
      if (s.t === 'swap') {
        const { i, j } = s;
        if (i >= 0 && j >= 0) {
          [a[i], a[j]] = [a[j], a[i]];
        }
      }
    }
    return a;
  }
  function isSortedAsc(a: number[]): boolean {
    for (let i = 1; i < a.length; i++) {
      if (a[i - 1] > a[i]) {
        return false;
      }
    }
    return true;
  }

  function runSanityTests() {
    const report = (name: string, passed: boolean, detail?: unknown) => {
      if (passed) {
        console.info('✅', name, detail ?? '');
      } else {
        console.warn('❌', name, detail ?? '');
      }
    };

    const ascSample = [1, 2, 3, 4, 5];
    const descSample = [5, 4, 3, 2, 1];
    const sortedCheck = isSortedAsc(ascSample) && !isSortedAsc(descSample);
    report('isSortedAsc basic', sortedCheck, { ascSample, descSample });

    const permSample = genArray(20);
    const permutationOk =
      permSample.length === 20 &&
      new Set(permSample).size === 20 &&
      Math.min(...permSample) === 1 &&
      Math.max(...permSample) === 20;
    report('genArray/permutation', permutationOk, permSample);

    const bubbleSource = [5, 3, 1, 4, 2];
    const bubbleSorted = simulate(bubbleSource, buildBubbleSteps(bubbleSource));
    report('bubble sorts sample', isSortedAsc(bubbleSorted), bubbleSorted);

    const quickSource = [3, 6, 2, 5, 1, 4];
    const quickSorted = simulate(quickSource, buildQuickSteps(quickSource));
    report('quick sorts sample', isSortedAsc(quickSorted), quickSorted);

    const previousSpeed = Global.speed;
    const previousSlider = el.speed.value;
    const previousLabel = el.speedVal.textContent || '';

    Global.speed = 0.5;
    const slowInterval = computeInterval();
    Global.speed = 2.0;
    const fastInterval = computeInterval();
    report('interval monotonic', fastInterval < slowInterval, {
      slowInterval,
      fastInterval,
    });

    Global.speed = previousSpeed;
    el.speed.value = previousSlider;
    el.speedVal.textContent = previousLabel;

    resetBoards();
    const bubbleBars = el.barsBubble.querySelectorAll('.bar').length;
    const quickBars = el.barsQuick.querySelectorAll('.bar').length;
    report('resetBoards count', bubbleBars === Global.size && quickBars === Global.size, {
      bubbleBars,
      quickBars,
    });
  }

  el.start.addEventListener('click', play);
  el.pause.addEventListener('click', pause);

  // ======= 初期化 =======
  (function initPage() {
    Global.size = parseInt(el.size.value, 10);
    Global.speed = parseFloat(el.speed.value);
    el.speedVal.textContent = Global.speed.toFixed(2) + 'x';
    updateVisualSpeed();

    Global.base = genArray(Global.size);
    resetBoards();

    // 起動時テスト
    try {
      runSanityTests();
    } catch (e) {
      console.warn('sanity tests error', e);
    }
  })();
}
