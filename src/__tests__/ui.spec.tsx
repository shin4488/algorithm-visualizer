import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const renderApp = () => render(<App />);

// === 型ガード & ヘルパー ===============================

// Element -> HTMLInputElement へ安全に絞る（Lint OK）
function getSliderByName(name: string | RegExp): HTMLInputElement {
  const el = screen.getByRole('slider', { name });
  if (!(el instanceof HTMLInputElement)) {
    throw new Error('Expected role=slider to be an <input type="range">');
  }
  return el;
}

// NodeList を HTMLElement 型で取得（ジェネリクスなのでアサーション不要）
function getBars(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('.bar');
}

// 単一要素もジェネリクスで HTMLElement | null として取る
function q<El extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) {
  return root.querySelector<El>(sel);
}
// ======================================================

describe('Algorithm visualizer UI specification (React-state version)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the size control slider with the specified defaults and range', () => {
    renderApp();

    const sizeSlider = getSliderByName(/本数/);
    expect(sizeSlider).toHaveAttribute('type', 'range');
    expect(sizeSlider).toHaveAttribute('min', '5');
    expect(sizeSlider).toHaveAttribute('max', '50');
    expect(sizeSlider).toHaveAttribute('step', '1');
    expect(sizeSlider.value).toBe('20');

    const sizeLabel = screen.getByText('本数:', { selector: 'label' });
    expect(within(sizeLabel).getByText('20')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '本数を1減らす' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '本数を1増やす' })).toBeInTheDocument();
  });

  it('renders the speed control with the specified range and two-decimal display', async () => {
    renderApp();

    const speedSlider = getSliderByName(/アニメ速度/);
    expect(speedSlider).toHaveAttribute('type', 'range');
    expect(speedSlider).toHaveAttribute('min', '0.2');
    expect(speedSlider).toHaveAttribute('max', '10');
    expect(speedSlider).toHaveAttribute('step', '0.05');
    expect(speedSlider.value).toBe('1');

    const speedLabel = screen.getByText('アニメ速度:', { selector: 'label' });
    expect(within(speedLabel).getByText('1.00x')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '速度を一段階速く' }));
    expect(speedSlider.value).toBe('1.05');
    expect(within(speedLabel).getByText('1.05x')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '速度を一段階遅く' }));
    expect(speedSlider.value).toBe('1');
    expect(within(speedLabel).getByText('1.00x')).toBeInTheDocument();
  });

  it('initializes both algorithm panels with matching bar arrangements and labels', () => {
    renderApp();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');

    const bubbleBars = getBars(bubbleRegion);
    const quickBars = getBars(quickRegion);

    expect(bubbleBars).toHaveLength(20);
    expect(quickBars).toHaveLength(20);

    const bubbleHeights = Array.from(bubbleBars, (bar) => bar.style.height);
    const quickHeights = Array.from(quickBars, (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);

    bubbleBars.forEach((bar) => {
      expect(bar.getAttribute('data-label')).toMatch(/^\d+$/);
    });
    quickBars.forEach((bar) => {
      expect(bar.getAttribute('data-label')).toMatch(/^\d+$/);
    });
  });

  it('keeps both algorithm panels open by default and shows the required legends and step counters', () => {
    renderApp();

    const bubblePanel = document.getElementById('board-bubble') as HTMLDetailsElement | null;
    const quickPanel = document.getElementById('board-quick') as HTMLDetailsElement | null;
    expect(bubblePanel && quickPanel).not.toBeNull();

    expect(bubblePanel!.open).toBe(true);
    expect(quickPanel!.open).toBe(true);

    const bubbleMeta = q<HTMLElement>(bubblePanel!, '.summary-meta');
    expect(bubbleMeta).not.toBeNull();
    expect(bubbleMeta!).toHaveTextContent(/^ステップ:\s*0$/);

    const quickMeta = q<HTMLElement>(quickPanel!, '.summary-meta');
    expect(quickMeta).not.toBeNull();
    expect(quickMeta!).toHaveTextContent(/^ステップ:\s*0$/);

    const bubbleLegend = q<HTMLElement>(bubblePanel!, '.legend');
    expect(bubbleLegend).not.toBeNull();
    expect(within(bubbleLegend!).getByText('入れ替え/比較（赤）')).toBeInTheDocument();
    expect(within(bubbleLegend!).getByText(/ソート完了/)).toBeInTheDocument();

    const quickLegend = q<HTMLElement>(quickPanel!, '.legend');
    expect(quickLegend).not.toBeNull();
    expect(within(quickLegend!).getByText('入れ替え/比較（赤）')).toBeInTheDocument();
    expect(within(quickLegend!).getByText('ピボット', { exact: true })).toBeInTheDocument();
    expect(within(quickLegend!).getByText(/境界/)).toBeInTheDocument();
    expect(within(quickLegend!).getByText(/ピボット高/)).toBeInTheDocument();
    expect(within(quickLegend!).getByText(/ソート完了/)).toBeInTheDocument();
  });

  it('increments the bar count immediately when using the size stepper controls', async () => {
    renderApp();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '本数を1増やす' }));

    const sizeSlider = getSliderByName(/本数/);
    await waitFor(() => {
      expect(sizeSlider.value).toBe('21');
    });

    const sizeLabel = screen.getByText('本数:', { selector: 'label' });
    expect(within(sizeLabel).getByText('21')).toBeInTheDocument();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    expect(getBars(bubbleRegion)).toHaveLength(21);
    expect(getBars(quickRegion)).toHaveLength(21);

    const bubbleHeights = Array.from(getBars(bubbleRegion), (bar) => bar.style.height);
    const quickHeights = Array.from(getBars(quickRegion), (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);
  });

  it('rebuilds both panels when the size slider is moved directly', () => {
    renderApp();

    const sizeSlider = getSliderByName(/本数/);
    fireEvent.change(sizeSlider, { target: { value: '18' } });

    expect(sizeSlider.value).toBe('18');

    const sizeLabel = screen.getByText('本数:', { selector: 'label' });
    expect(within(sizeLabel).getByText('18')).toBeInTheDocument();

    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    expect(getBars(bubbleRegion)).toHaveLength(18);
    expect(getBars(quickRegion)).toHaveLength(18);
  });

  it('updates the speed label to two decimal places when the slider value changes', () => {
    renderApp();

    const speedSlider = getSliderByName(/アニメ速度/);
    fireEvent.change(speedSlider, { target: { value: '2.5' } });

    expect(speedSlider.value).toBe('2.5');

    const speedLabel = screen.getByText('アニメ速度:', { selector: 'label' });
    expect(within(speedLabel).getByText('2.50x')).toBeInTheDocument();
  });

  it('shuffles with the current bar count and keeps both panels synchronized', async () => {
    renderApp();

    const sizeSlider = getSliderByName(/本数/);
    fireEvent.change(sizeSlider, { target: { value: '12' } });

    const randomSpy = vi.spyOn(Math, 'random');
    const before = randomSpy.mock.calls.length;

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'シャッフル' }));

    const after = randomSpy.mock.calls.length;
    expect(after).toBeGreaterThan(before);

    const expectedCount = Number(sizeSlider.value);
    const bubbleRegion = screen.getByLabelText('バブルソートのバー表示');
    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    expect(getBars(bubbleRegion)).toHaveLength(expectedCount);
    expect(getBars(quickRegion)).toHaveLength(expectedCount);

    const bubbleHeights = Array.from(getBars(bubbleRegion), (bar) => bar.style.height);
    const quickHeights = Array.from(getBars(quickRegion), (bar) => bar.style.height);
    expect(bubbleHeights).toEqual(quickHeights);
  });

  it('hides quick-sort overlay elements until a processing range exists', () => {
    renderApp();

    const quickRegion = screen.getByLabelText('クイックソートのバー表示');
    const boundary = q<HTMLElement>(quickRegion, '.boundary');
    const subrange = q<HTMLElement>(quickRegion, '.subrange');
    const pivotLine = q<HTMLElement>(quickRegion, '.pivot-hline');
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
