import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { computeInterval } from '@/plugins/visualizer';

const renderApp = () =>
  render(
    <MantineProvider defaultColorScheme="light">
      <App />
    </MantineProvider>,
  );

const ALGORITHM_NAMES = ['バブルソート', '選択ソート', 'マージソート', 'クイックソート'];
const BAR_REGION_LABELS = [
  'バブルソートのバー表示',
  '選択ソートのバー表示',
  'マージソートのバー表示',
  'クイックソートのバー表示',
];

function getBars(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('.bar');
}

/** 棒に表示している数字を左から順に返す */
function barLabels(container: HTMLElement) {
  return Array.from(getBars(container), (bar) => Number(bar.dataset.label));
}

/** 選択チップのアルゴリズム名を、画面上の並び順で返す */
function chipOrder() {
  const checkboxes = screen.getAllByRole('checkbox');
  const position = (name: string) => checkboxes.indexOf(screen.getByRole('checkbox', { name }));
  return [...ALGORITHM_NAMES].sort((a, b) => position(a) - position(b));
}

/** 要素がないときも表示していないとみなす */
function isDisplayed(container: HTMLElement, selector: string) {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).some(
    (element) => getComputedStyle(element).display !== 'none',
  );
}

/** 棒の並びが条件を満たすまでシャッフルを繰り返す */
function shuffleUntil(condition: (labels: number[]) => boolean, maxShuffles = 5000) {
  const region = screen.getByLabelText('バブルソートのバー表示');
  const shuffle = screen.getByRole('button', { name: 'シャッフル' });
  for (let count = 0; count < maxShuffles && !condition(barLabels(region)); count++) {
    fireEvent.click(shuffle);
  }
  expect(condition(barLabels(region))).toBe(true);
}

/** react-ga4 が window.gtag に渡すイベントを、イベント名と引数の組で記録する */
function recordGtagEvents() {
  const events: { name: string; params: Record<string, unknown> }[] = [];
  vi.stubGlobal('gtag', (command: string, name: string, params: Record<string, unknown>) => {
    if (command === 'event') events.push({ name, params });
  });
  return events;
}

/** sort_finish の algorithm_type を、送った回数とともに返す */
function sortFinishCounts(events: { name: string; params: Record<string, unknown> }[]) {
  const counts: Record<string, number> = {};
  for (const { name, params } of events) {
    if (name !== 'sort_finish') continue;
    const type = String(params.algorithm_type);
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

/** すべての棒が完了の表示になっているパネルの数 */
function finishedPanelCount(regions: HTMLElement[]) {
  return regions.filter((region) =>
    Array.from(getBars(region)).every((bar) => bar.classList.contains('sorted')),
  ).length;
}

/** フェイクタイマーで速度 1.00 の再生を 1 ステップずつ進め、条件を満たしたところで止める */
function playUntil(condition: () => boolean, maxSteps = 200) {
  for (let step = 0; step < maxSteps && !condition(); step++) {
    act(() => {
      vi.advanceTimersByTime(computeInterval(1));
    });
  }
  expect(condition()).toBe(true);
}

/** フェイクタイマーを 10ms ずつ進め、条件を満たすまでにかかった時間(ms)を返す */
function elapsedUntil(condition: () => boolean, maxMs = 60 * 1000) {
  let elapsed = 0;
  for (; elapsed < maxMs && !condition(); elapsed += 10) {
    act(() => {
      vi.advanceTimersByTime(10);
    });
  }
  expect(condition()).toBe(true);
  return elapsed;
}

describe('Algorithm visualizer UI specification', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // 初期配列とシャッフルに使う乱数を固定し、毎回同じ並びで再現できるようにする（Park–Miller の線形合同法）
    let seed = 1;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('toggles panels from the selector and can recover from hiding every algorithm', async () => {
    renderApp();
    const user = userEvent.setup();
    for (const name of ALGORITHM_NAMES) {
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
      await user.click(screen.getByRole('checkbox', { name }));
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    }
    expect(
      screen.getByText('上の一覧から表示するアルゴリズムを選んでください。'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '選択ソート' }));
    expect(screen.getByRole('region', { name: '選択ソート' })).toBeInTheDocument();
    expect(
      screen.queryByText('上の一覧から表示するアルゴリズムを選んでください。'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { expanded: true })).not.toBeInTheDocument();
  });

  it('selects every algorithm from a partial or empty selection without resetting the boards', async () => {
    renderApp();
    const user = userEvent.setup();
    const selectAll = screen.getByRole('button', { name: '全選択' });
    const initialOrder = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    const initialBars = screen.getByLabelText('バブルソートのバー表示').innerHTML;
    expect(selectAll).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'バブルソート' }));
    expect(selectAll).toBeEnabled();
    await user.click(selectAll);
    expect(screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)).toEqual(
      initialOrder,
    );
    expect(screen.getByLabelText('バブルソートのバー表示').innerHTML).toBe(initialBars);

    for (const checkbox of screen.getAllByRole('checkbox')) await user.click(checkbox);
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    expect(
      screen.getByText('上の一覧から表示するアルゴリズムを選んでください。'),
    ).toBeInTheDocument();
    await user.click(selectAll);
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeChecked();
    expect(screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)).toEqual(
      initialOrder,
    );
    expect(selectAll).toBeDisabled();
  });

  it('keeps hidden boards progressing and restores them without resetting playback', () => {
    vi.useFakeTimers();
    try {
      renderApp();
      fireEvent.click(screen.getByRole('button', { name: /再生/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'マージソート' }));
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000);
      });
      fireEvent.click(screen.getByRole('checkbox', { name: 'マージソート' }));
      const bars = Array.from(getBars(screen.getByLabelText('マージソートのバー表示')));
      expect(bars.every((bar) => bar.classList.contains('sorted'))).toBe(true);
      const heights = bars.map((bar) => parseFloat(bar.style.height));
      expect(heights).toEqual([...heights].sort((a, b) => a - b));
      expect(screen.getByRole('button', { name: /再生/ })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reorders panels by keyboard, preserves hidden choices, and cancels without reordering', async () => {
    renderApp();
    const user = userEvent.setup();
    const group = screen.getByRole('group', { name: '表示するアルゴリズム:' });
    // jsdomには配置計算がないため、選択チップの横並びだけを再現する。
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const index = Array.from(group.children).indexOf(this);
        return new DOMRect(Math.max(0, index) * 180, 0, 170, 40);
      });
    try {
      const before = screen.getByLabelText('バブルソートのバー表示').innerHTML;
      await user.click(screen.getByRole('checkbox', { name: '選択ソート' }));
      screen.getByRole('button', { name: 'バブルソートの表示順を変更' }).focus();
      await user.keyboard(' {ArrowRight} ');
      expect(chipOrder()).toEqual(['選択ソート', 'バブルソート', 'マージソート', 'クイックソート']);
      expect(screen.getByRole('checkbox', { name: '選択ソート' })).not.toBeChecked();
      await user.click(screen.getByRole('checkbox', { name: '選択ソート' }));
      expect(screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)).toEqual([
        '選択ソート',
        'バブルソート',
        'マージソート',
        'クイックソート',
      ]);
      expect(screen.getByLabelText('バブルソートのバー表示').innerHTML).toBe(before);
      screen.getByRole('button', { name: 'バブルソートの表示順を変更' }).focus();
      await user.keyboard(' {ArrowLeft}{Escape}');
      expect(screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)).toEqual([
        '選択ソート',
        'バブルソート',
        'マージソート',
        'クイックソート',
      ]);
      await user.click(screen.getByRole('checkbox', { name: 'クイックソート' }));
      await user.click(screen.getByRole('button', { name: 'シャッフル' }));
      await user.click(screen.getByRole('button', { name: '本数を1増やす' }));
      expect(screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)).toEqual([
        '選択ソート',
        'バブルソート',
        'マージソート',
      ]);
      expect(screen.getByRole('checkbox', { name: 'クイックソート' })).not.toBeChecked();
      expect(getBars(screen.getByLabelText('バブルソートのバー表示'))).toHaveLength(21);
    } finally {
      rect.mockRestore();
    }
  });

  it('switches themes without resetting the boards and restores the chosen theme', () => {
    window.localStorage.clear();
    const view = renderApp();
    const before = screen.getByLabelText('バブルソートのバー表示').innerHTML;
    fireEvent.click(screen.getByRole('button', { name: 'ダークモードに切り替え' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark');
    expect(screen.getByLabelText('バブルソートのバー表示').innerHTML).toBe(before);
    view.unmount();
    renderApp();
    expect(screen.getByRole('button', { name: 'ライトモードに切り替え' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ライトモードに切り替え' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light');
    window.localStorage.clear();
  });

  it('toggles playback with one button without losing progress, and shuffle resets all boards', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.useFakeTimers();
    try {
      renderApp();
      const playbackButton = screen.getByRole('button', { name: '再生' });
      fireEvent.click(playbackButton);
      expect(playbackButton).toHaveAccessibleName('一時停止');
      expect(playbackButton).toBeEnabled();
      expect(screen.queryByRole('button', { name: '再生' })).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      fireEvent.click(playbackButton);
      expect(playbackButton).toHaveAccessibleName('再生');
      expect(screen.queryByRole('button', { name: '一時停止' })).not.toBeInTheDocument();
      const paused = screen.getByLabelText('バブルソートのバー表示').innerHTML;
      const counters = screen.getAllByText(/ステップ:/).map((el) => el.textContent);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByLabelText('バブルソートのバー表示').innerHTML).toBe(paused);
      expect(screen.getAllByText(/ステップ:/).map((el) => el.textContent)).toEqual(counters);
      fireEvent.click(playbackButton);
      expect(playbackButton).toHaveAccessibleName('一時停止');
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByLabelText('バブルソートのバー表示').innerHTML).not.toBe(paused);
      fireEvent.click(screen.getByRole('button', { name: 'シャッフル' }));
      expect(screen.getAllByText('ステップ: 0')).toHaveLength(4);
      expect(playbackButton).toHaveAccessibleName('再生');
      expect(playbackButton).toBeEnabled();
    } finally {
      random.mockRestore();
      vi.useRealTimers();
    }
  });

  it('renders the size control slider with sane defaults and range (ARIA)', () => {
    renderApp();
    const sizeSlider = screen.getByRole('slider', { name: '本数:' });

    // Mantine のスライダーは ARIA 属性で検証する
    expect(sizeSlider).toHaveAttribute('aria-valuemin', '5');
    expect(sizeSlider).toHaveAttribute('aria-valuemax', '50');
    expect(sizeSlider).toHaveAttribute('aria-valuenow', '20');

    // ラベルはテキストとして表示されていればよい
    expect(screen.getByText(/本数:\s*20/)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '本数を1減らす' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '本数を1増やす' })).toBeInTheDocument();
  });

  it('renders the speed control and keeps two-decimal display', async () => {
    renderApp();
    const speedSlider = screen.getByRole('slider', { name: 'アニメ速度:' });

    expect(speedSlider).toHaveAttribute('aria-valuemin', '0.2');
    expect(speedSlider).toHaveAttribute('aria-valuemax', '10');
    expect(speedSlider).toHaveAttribute('aria-valuenow', '1');

    // 速度は小数 2 桁で表示する
    expect(screen.getByText(/アニメ速度:\s*1\.00/)).toBeInTheDocument();

    // + ボタンで 0.05 進む
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '速度を一段階速く' }));
    expect(speedSlider).toHaveAttribute('aria-valuenow', '1.05');
    expect(screen.getByText(/アニメ速度:\s*1\.05/)).toBeInTheDocument();

    // − ボタンで戻る
    await user.click(screen.getByRole('button', { name: '速度を一段階遅く' }));
    expect(speedSlider).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText(/アニメ速度:\s*1\.00/)).toBeInTheDocument();
  });

  it('initializes all algorithm panels with matching bar arrangements and labels', () => {
    renderApp();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const selectionRegion = screen.getByLabelText('選択ソートのバー表示');
    const mergeRegion = screen.getByLabelText('マージソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');

    const bubbleBars = getBars(bubbleRegion);
    const selectionBars = getBars(selectionRegion);
    const mergeBars = getBars(mergeRegion);
    const quickBars = getBars(quickRegion);

    expect(bubbleBars).toHaveLength(20);
    expect(selectionBars).toHaveLength(20);
    expect(mergeBars).toHaveLength(20);
    expect(quickBars).toHaveLength(20);

    // 高さ（=データ順）一致
    const bubbleHeights = Array.from(bubbleBars, (bar) => bar.style.height);
    const selectionHeights = Array.from(selectionBars, (bar) => bar.style.height);
    const mergeHeights = Array.from(mergeBars, (bar) => bar.style.height);
    const quickHeights = Array.from(quickBars, (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);
    expect(selectionHeights).toEqual(quickHeights);
    expect(mergeHeights).toEqual(quickHeights);

    // 棒の数字は元の位置番号ではなく、高さに対応する値を示す
    [...bubbleBars, ...selectionBars, ...mergeBars, ...quickBars].forEach((bar) => {
      expect(Number(bar.getAttribute('data-label'))).toBeCloseTo(
        (parseFloat(bar.style.height) / 100) * 20,
      );
    });
  });

  it.each([
    { name: 'バブルソート', texts: ['入れ替え/比較', 'ソート完了'] },
    { name: '選択ソート', texts: ['入れ替え/比較', '最小値候補', 'ソート完了'] },
    {
      name: 'マージソート',
      texts: [
        '比べて並べる',
        '範囲と分け目',
        'ソート完了',
        '1個ずつに分けて、小さい順にまとめます。',
      ],
    },
    {
      name: 'クイックソート',
      texts: [
        '入れ替え/比較',
        '左の交換候補（枠）',
        '右の交換候補（枠）',
        'ピボット',
        '境界（グループ分け）',
        'ピボット高（横線）',
        'ソート完了',
      ],
    },
  ])('shows the $name panel with a zero step counter and its legend', ({ name, texts }) => {
    renderApp();
    const panel = within(screen.getByRole('region', { name }));

    expect(panel.getByText('ステップ: 0')).toBeInTheDocument();
    for (const text of texts) expect(panel.getByText(text)).toBeInTheDocument();
  });

  it('increments the bar count immediately when using the size stepper controls', async () => {
    renderApp();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '本数を1増やす' }));

    const sizeSlider = screen.getByRole('slider', { name: '本数:' });
    await waitFor(() => {
      expect(sizeSlider).toHaveAttribute('aria-valuenow', '21');
    });

    expect(screen.getByText(/本数:\s*21/)).toBeInTheDocument();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const selectionRegion = screen.getByLabelText('選択ソートのバー表示');
    const mergeRegion = screen.getByLabelText('マージソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    expect(getBars(bubbleRegion)).toHaveLength(21);
    expect(getBars(selectionRegion)).toHaveLength(21);
    expect(getBars(mergeRegion)).toHaveLength(21);
    expect(getBars(quickRegion)).toHaveLength(21);

    const bubbleHeights = Array.from(getBars(bubbleRegion), (bar) => bar.style.height);
    const selectionHeights = Array.from(getBars(selectionRegion), (bar) => bar.style.height);
    const mergeHeights = Array.from(getBars(mergeRegion), (bar) => bar.style.height);
    const quickHeights = Array.from(getBars(quickRegion), (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);
    expect(selectionHeights).toEqual(quickHeights);
    expect(mergeHeights).toEqual(quickHeights);
  });

  it('rebuilds every panel when the size slider value changes via keyboard (ARIA)', async () => {
    renderApp();

    const user = userEvent.setup();
    const sizeSlider = screen.getByRole('slider', { name: '本数:' });

    // Mantine のスライダーはキーボードで値変更できる（step=1）
    sizeSlider.focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}'); // 20 -> 18

    expect(sizeSlider).toHaveAttribute('aria-valuenow', '18');
    expect(screen.getByText(/本数:\s*18/)).toBeInTheDocument();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const selectionRegion = screen.getByLabelText('選択ソートのバー表示');
    const mergeRegion = screen.getByLabelText('マージソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    expect(getBars(bubbleRegion)).toHaveLength(18);
    expect(getBars(selectionRegion)).toHaveLength(18);
    expect(getBars(mergeRegion)).toHaveLength(18);
    expect(getBars(quickRegion)).toHaveLength(18);
  });

  it('keeps speed label in two decimals when the slider changes (keyboard)', async () => {
    renderApp();

    const user = userEvent.setup();
    const speedSlider = screen.getByRole('slider', { name: 'アニメ速度:' });

    speedSlider.focus();
    // 1.00 -> 1.25（5回 +0.05）
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(speedSlider).toHaveAttribute('aria-valuenow', '1.25');
    expect(screen.getByText(/アニメ速度:\s*1\.25/)).toBeInTheDocument();
  });

  it('keeps the bar count within 5–50 and the speed within 0.20–10.00 when the − and ＋ buttons pass the ends', () => {
    renderApp();
    const sizeSlider = screen.getByRole('slider', { name: '本数:' });
    const speedSlider = screen.getByRole('slider', { name: 'アニメ速度:' });

    fireEvent.keyDown(sizeSlider, { key: 'Home' });
    fireEvent.click(screen.getByRole('button', { name: '本数を1減らす' }));
    expect(screen.getByText(/本数:\s*5$/)).toBeInTheDocument();
    expect(getBars(screen.getByLabelText('バブルソートのバー表示'))).toHaveLength(5);

    fireEvent.keyDown(sizeSlider, { key: 'End' });
    fireEvent.click(screen.getByRole('button', { name: '本数を1増やす' }));
    expect(screen.getByText(/本数:\s*50$/)).toBeInTheDocument();
    expect(getBars(screen.getByLabelText('バブルソートのバー表示'))).toHaveLength(50);

    fireEvent.keyDown(speedSlider, { key: 'Home' });
    fireEvent.click(screen.getByRole('button', { name: '速度を一段階遅く' }));
    expect(screen.getByText(/アニメ速度:\s*0\.20$/)).toBeInTheDocument();

    fireEvent.keyDown(speedSlider, { key: 'End' });
    fireEvent.click(screen.getByRole('button', { name: '速度を一段階速く' }));
    expect(screen.getByText(/アニメ速度:\s*10\.00$/)).toBeInTheDocument();
  });

  it('plays ten times as fast at 10.00 as at 1.00, including when the speed is raised during playback', () => {
    vi.useFakeTimers();
    try {
      renderApp();
      fireEvent.keyDown(screen.getByRole('slider', { name: '本数:' }), { key: 'Home' });
      const region = screen.getByLabelText('バブルソートのバー表示');
      const bubbleFinished = () =>
        Array.from(getBars(region)).every((bar) => bar.classList.contains('sorted'));

      // 同じ並びを速度 1.00 と 10.00 で並べ替え、バブルソートの完了までの時間を比べる
      shuffleUntil((labels) => labels.join() === '5,4,3,2,1');
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      const atOne = elapsedUntil(bubbleFinished);

      shuffleUntil((labels) => labels.join() === '5,4,3,2,1');
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      // 2 回目は再生を始めてから速度を上げ、再生中の変更もすぐに効くことを確かめる
      fireEvent.keyDown(screen.getByRole('slider', { name: 'アニメ速度:' }), { key: 'End' });
      expect(screen.getByText(/アニメ速度:\s*10\.00$/)).toBeInTheDocument();
      const atTen = elapsedUntil(bubbleFinished);

      expect(atOne / atTen).toBeGreaterThan(9);
      expect(atOne / atTen).toBeLessThan(11);
    } finally {
      vi.useRealTimers();
    }
  }, 30000);

  it('shuffles into a new arrangement of the current bar count shared by every panel', async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '本数を1増やす' }));
    const before = barLabels(screen.getByLabelText('バブルソートのバー表示'));

    await user.click(screen.getByRole('button', { name: 'シャッフル' }));

    const after = barLabels(screen.getByLabelText('バブルソートのバー表示'));
    expect(after).not.toEqual(before);
    // 現在の本数 21 のまま、1〜21 を 1 回ずつ並べ直す
    expect([...after].sort((a, b) => a - b)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    for (const label of BAR_REGION_LABELS) {
      expect(barLabels(screen.getByLabelText(label))).toEqual(after);
    }
  });

  it('hides quick-sort overlay elements until a processing range exists', () => {
    renderApp();

    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    for (const selector of ['.boundary', '.subrange', '.pivot-hline', '.zone']) {
      expect(isDisplayed(quickRegion, selector)).toBe(false);
    }
  });

  it('shows the merge range and split line during playback', () => {
    vi.useFakeTimers();
    try {
      renderApp();
      const region = screen.getByLabelText('マージソートのバー表示');
      expect(isDisplayed(region, '.subrange')).toBe(false);
      expect(isDisplayed(region, '.boundary')).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: /再生/ }));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(isDisplayed(region, '.subrange')).toBe(true);
      expect(isDisplayed(region, '.boundary')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows which side contributes each value to the merge result before writing it back', () => {
    vi.useFakeTimers();
    try {
      renderApp();
      for (let i = 0; i < 15; i++) {
        fireEvent.click(screen.getByRole('button', { name: '本数を1減らす' }));
      }
      // 5 本を昇順に並べ、最初のマージで左の 1 と右の 2 を比べる場面を作る
      shuffleUntil((labels) => labels.join() === '1,2,3,4,5');
      const region = screen.getByRole('region', { name: 'マージソート' });
      const merge = within(region);
      fireEvent.click(screen.getByRole('button', { name: '再生' }));

      playUntil(() => merge.queryByText('左の残り:') !== null);
      expect(region).toHaveTextContent('左の残り:[1]');
      expect(region).toHaveTextContent('右の残り:[2]');
      expect(region).toHaveTextContent('結果:[]');

      playUntil(() => merge.queryByText('左の1を結果に入れました。') !== null);
      expect(region).toHaveTextContent('左の残り:[]');
      expect(region).toHaveTextContent('右の残り:[2]');
      expect(region).toHaveTextContent('結果:[1]');

      playUntil(() => merge.queryByText('結果に合わせて棒を並べ直しています。') !== null);
      expect(region).toHaveTextContent('結果:[1, 2]');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps bar heights on the original scale while merge writes temporarily duplicate values', () => {
    vi.useFakeTimers();
    try {
      renderApp();
      for (let i = 0; i < 15; i++) {
        fireEvent.click(screen.getByRole('button', { name: '本数を1減らす' }));
      }
      // 最大値 5 を右端以外に置く。書き戻しの途中で 5 が一時的に消える
      shuffleUntil((labels) => labels[labels.length - 1] !== 5);
      const region = screen.getByLabelText('マージソートのバー表示');

      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      playUntil(() => !barLabels(region).includes(5));

      // 高さの基準は、表示中の最大値ではなく初期配列の最大値 5 のまま
      for (const bar of getBars(region)) {
        expect(parseFloat(bar.style.height)).toBeCloseTo((Number(bar.dataset.label) / 5) * 100);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('initially shows one enabled playback button and the shuffle button', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /再生/ })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /一時停止/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'シャッフル' })).toBeEnabled();
  });

  it('keeps comparison outlines while paused and removes them when bubble sort finishes', () => {
    vi.useFakeTimers();
    try {
      renderApp();
      for (let i = 0; i < 15; i++) {
        fireEvent.click(screen.getByRole('button', { name: '本数を1減らす' }));
      }
      // 昇順に並べ、最後の操作が比較になるケースを再現する。
      shuffleUntil((labels) => labels.join() === '1,2,3,4,5');
      const region = screen.getByLabelText('バブルソートのバー表示');
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      fireEvent.click(screen.getByRole('button', { name: '一時停止' }));
      expect(region.querySelectorAll('.compare')).toHaveLength(2);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(region.querySelectorAll('.compare')).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      playUntil(() => region.querySelectorAll('.sorted').length === 5);
      expect(region.querySelectorAll('.compare')).toHaveLength(0);
      // 他のアルゴリズムが再生中でも、完了したパネルの比較枠は消える。
      expect(screen.getByRole('button', { name: '一時停止' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('plays every algorithm panel to completion and stops the playback', () => {
    // 実時間を待たずに再生完了まで進めるためフェイクタイマーを使う
    vi.useFakeTimers();
    try {
      renderApp();

      // userEvent はフェイクタイマー下でハングするため、同期的な fireEvent を使う
      fireEvent.click(screen.getByRole('button', { name: /再生/ }));

      // 全パネルが完了し、ボタンが再生表示に戻るまで 30 秒ずつ進める。
      for (let elapsed = 0; elapsed < 20 * 60 * 1000; elapsed += 30 * 1000) {
        if (screen.queryByRole('button', { name: '再生' })) break;
        act(() => {
          vi.advanceTimersByTime(30 * 1000);
        });
      }

      const regions = [
        screen.getByLabelText('バブルソートのバー表示'),
        screen.getByLabelText('選択ソートのバー表示'),
        screen.getByLabelText('マージソートのバー表示'),
        screen.getByLabelText('クイックソートのバー表示'),
      ];
      regions.forEach((region) => {
        const bars = Array.from(getBars(region));
        // 全バーがソート完了状態（緑）になる
        bars.forEach((bar) => expect(bar.classList.contains('sorted')).toBe(true));
        expect(region.querySelectorAll('.compare')).toHaveLength(0);
        // データ順が昇順 = 高さが単調増加
        const heights = bars.map((bar) => parseFloat(bar.style.height));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
      });

      // 全パネル完了後は自動的に停止し、再生ボタンが再度押せる
      expect(screen.getByRole('button', { name: /再生/ })).toBeEnabled();
      expect(screen.queryByRole('button', { name: /一時停止/ })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  }, 30000);

  it('sends sort_finish once for each algorithm when it finishes during a playback', () => {
    vi.useFakeTimers();
    const events = recordGtagEvents();
    try {
      renderApp();
      const regions = BAR_REGION_LABELS.map((label) => screen.getByLabelText(label));
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      playUntil(() => finishedPanelCount(regions) === 4, 2000);

      expect(
        events.filter(({ name }) => name === 'sort_finish').map(({ params }) => params),
      ).toEqual(
        expect.arrayContaining(
          ['bubble_sort', 'selection_sort', 'merge_sort', 'quick_sort'].map((algorithm_type) => ({
            animation_speed: 1,
            bar_size: 20,
            algorithm_type,
            browser_language: 'ja',
            translated_language: 'ja',
          })),
        ),
      );
      expect(sortFinishCounts(events)).toEqual({
        bubble_sort: 1,
        selection_sort: 1,
        merge_sort: 1,
        quick_sort: 1,
      });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  }, 30000);

  it('does not resend sort_finish after pausing or replaying finished boards, and sends it again after a shuffle', () => {
    vi.useFakeTimers();
    const events = recordGtagEvents();
    try {
      renderApp();
      const regions = BAR_REGION_LABELS.map((label) => screen.getByLabelText(label));
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      playUntil(() => finishedPanelCount(regions) > 0, 2000);
      expect(finishedPanelCount(regions)).toBeLessThan(4);

      // 一部のパネルが完了した後に、一時停止して再開する
      fireEvent.click(screen.getByRole('button', { name: '一時停止' }));
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      playUntil(() => finishedPanelCount(regions) === 4, 2000);

      // 全パネルの完了後に再生を押しても、並べ替えは始まらない
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      act(() => {
        vi.advanceTimersByTime(computeInterval(1) * 2);
      });
      expect(sortFinishCounts(events)).toEqual({
        bubble_sort: 1,
        selection_sort: 1,
        merge_sort: 1,
        quick_sort: 1,
      });

      // シャッフルした新しい並びの完了は、改めて送る
      fireEvent.click(screen.getByRole('button', { name: 'シャッフル' }));
      fireEvent.click(screen.getByRole('button', { name: '再生' }));
      playUntil(() => finishedPanelCount(regions) === 4, 2000);
      expect(sortFinishCounts(events)).toEqual({
        bubble_sort: 2,
        selection_sort: 2,
        merge_sort: 2,
        quick_sort: 2,
      });

      // ほかの計測イベントは操作ごとに 1 回ずつ送る
      expect(events.filter(({ name }) => name !== 'sort_finish').map(({ name }) => name)).toEqual([
        'play_click',
        'pause_click',
        'play_click',
        'play_click',
        'shuffle_click',
        'play_click',
      ]);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  }, 30000);
});
