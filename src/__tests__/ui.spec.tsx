import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// --- Mantine が使う matchMedia を jsdom で polyfill -------------
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated API だが Mantine が呼ぶ場合がある
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// MantineProvider でラップして描画
const renderApp = () =>
  render(
    <MantineProvider defaultColorScheme="dark">
      <App />
    </MantineProvider>,
  );

// 汎用ヘルパー：バー配列取得
function getBars(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('.bar');
}

// 汎用ヘルパー：ページ内のスライダー（Mantine/ARIA）
function getAllSliders() {
  return screen.getAllByRole('slider');
}

describe('Algorithm visualizer UI specification (Mantine-friendly, robust)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the size control slider with sane defaults and range (ARIA)', () => {
    renderApp();
    const [sizeSlider] = getAllSliders();

    // Mantine のスライダーは ARIA 属性で検証する
    expect(sizeSlider).toHaveAttribute('aria-valuemin', '5');
    expect(sizeSlider).toHaveAttribute('aria-valuemax', '50');
    expect(sizeSlider).toHaveAttribute('aria-valuenow', '20');

    // ラベルはテキストとして表示されていればよい
    expect(screen.getByText(/本数:\s*20/)).toBeInTheDocument();

    // ステッパーボタンが存在
    expect(screen.getByRole('button', { name: '本数を1減らす' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '本数を1増やす' })).toBeInTheDocument();
  });

  it('renders the speed control and keeps two-decimal display', async () => {
    renderApp();
    const [, speedSlider] = getAllSliders();

    expect(speedSlider).toHaveAttribute('aria-valuemin', '0.2');
    expect(speedSlider).toHaveAttribute('aria-valuemax', '10');
    expect(speedSlider).toHaveAttribute('aria-valuenow', '1');

    // 速度の表示は 2 桁小数（x 付き）
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

  it('initializes both algorithm panels with matching bar arrangements and labels', () => {
    renderApp();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');

    const bubbleBars = getBars(bubbleRegion);
    const quickBars = getBars(quickRegion);

    expect(bubbleBars).toHaveLength(20);
    expect(quickBars).toHaveLength(20);

    // 高さ（=データ順）一致
    const bubbleHeights = Array.from(bubbleBars, (bar) => bar.style.height);
    const quickHeights = Array.from(quickBars, (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);

    // data-label は数字
    [...bubbleBars, ...quickBars].forEach((bar) => {
      expect(bar.getAttribute('data-label')).toMatch(/^\d+$/);
    });
  });

  it('shows both panels open and the legends/step counters visible', () => {
    renderApp();

    // details/accordion どちらでも「ステップ: 0」が2つ見えることを確認
    const stepZeros = screen.getAllByText(/ステップ:\s*0/);
    expect(stepZeros.length).toBeGreaterThanOrEqual(2);

    // 凡例テキストが表示されている（パネルに強く依存しない）
    expect(screen.getAllByText('入れ替え/比較（赤）').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ソート完了/).length).toBeGreaterThan(0);
    expect(screen.getByText('ピボット')).toBeInTheDocument();
    expect(screen.getByText(/境界（グループ分け）/)).toBeInTheDocument();
    expect(screen.getByText(/ピボット高（横線）/)).toBeInTheDocument();
  });

  it('increments the bar count immediately when using the size stepper controls', async () => {
    renderApp();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '本数を1増やす' }));

    const [sizeSlider] = getAllSliders();
    await waitFor(() => {
      expect(sizeSlider).toHaveAttribute('aria-valuenow', '21');
    });

    expect(screen.getByText(/本数:\s*21/)).toBeInTheDocument();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    expect(getBars(bubbleRegion)).toHaveLength(21);
    expect(getBars(quickRegion)).toHaveLength(21);

    const bubbleHeights = Array.from(getBars(bubbleRegion), (bar) => bar.style.height);
    const quickHeights = Array.from(getBars(quickRegion), (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);
  });

  it('rebuilds both panels when the size slider value changes via keyboard (ARIA)', async () => {
    renderApp();

    const user = userEvent.setup();
    const [sizeSlider] = getAllSliders();

    // Mantine のスライダーはキーボードで値変更できる（step=1）
    sizeSlider.focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}'); // 20 -> 18

    expect(sizeSlider).toHaveAttribute('aria-valuenow', '18');
    expect(screen.getByText(/本数:\s*18/)).toBeInTheDocument();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    expect(getBars(bubbleRegion)).toHaveLength(18);
    expect(getBars(quickRegion)).toHaveLength(18);
  });

  it('keeps speed label in two decimals when the slider changes (keyboard)', async () => {
    renderApp();

    const user = userEvent.setup();
    const [, speedSlider] = getAllSliders();

    speedSlider.focus();
    // 1.00 -> 1.25（5回 +0.05）
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(speedSlider).toHaveAttribute('aria-valuenow', '1.25');
    expect(screen.getByText(/アニメ速度:\s*1\.25/)).toBeInTheDocument();
  });

  it('shuffles with the current bar count and keeps both panels synchronized', async () => {
    renderApp();

    const user = userEvent.setup();
    const randomSpy = vi.spyOn(Math, 'random');

    await user.click(screen.getByRole('button', { name: 'シャッフル' }));
    expect(randomSpy.mock.calls.length).toBeGreaterThan(0);

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');

    const bubbleHeights = Array.from(getBars(bubbleRegion), (bar) => bar.style.height);
    const quickHeights = Array.from(getBars(quickRegion), (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);
  });

  it('hides quick-sort overlay elements until a processing range exists', () => {
    renderApp();

    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    const boundary = quickRegion.querySelector<HTMLElement>('.boundary');
    const subrange = quickRegion.querySelector<HTMLElement>('.subrange');
    const pivotLine = quickRegion.querySelector<HTMLElement>('.pivot-hline');
    const zones = quickRegion.querySelectorAll<HTMLElement>('.zone');

    expect(boundary?.style.display).toBe('none');
    expect(subrange?.style.display).toBe('none');
    expect(pivotLine?.style.display).toBe('none');
    expect(zones[0]?.style.display).toBe('none');
    expect(zones[1]?.style.display).toBe('none');
  });

  it('sets initial playback controls according to the specification', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /再生/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /一時停止/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'シャッフル' })).toBeEnabled();
  });
});
