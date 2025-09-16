import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { init } from '../visualizer';

const renderWithInit = () => {
  const utils = render(<App />);
  act(() => {
    init();
  });
  return utils;
};

describe('Algorithm visualizer UI specification', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the size control slider with the specified defaults and range', () => {
    renderWithInit();

    const sizeSlider = screen.getByLabelText(/本数/i) as HTMLInputElement;
    expect(sizeSlider).toHaveAttribute('type', 'range');
    expect(sizeSlider).toHaveAttribute('min', '5');
    expect(sizeSlider).toHaveAttribute('max', '50');
    expect(sizeSlider).toHaveAttribute('step', '1');
    expect(sizeSlider.value).toBe('20');

    const sizeDisplay = document.getElementById('sizeVal');
    expect(sizeDisplay).toHaveTextContent('20');

    expect(
      screen.getByRole('button', { name: '本数を1減らす' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '本数を1増やす' }),
    ).toBeInTheDocument();
  });

  it('renders the speed control with the specified range and two-decimal display', async () => {
    renderWithInit();

    const speedSlider = screen.getByLabelText(/アニメ速度/i) as HTMLInputElement;
    expect(speedSlider).toHaveAttribute('type', 'range');
    expect(speedSlider).toHaveAttribute('min', '0.2');
    expect(speedSlider).toHaveAttribute('max', '10');
    expect(speedSlider).toHaveAttribute('step', '0.05');
    expect(speedSlider.value).toBe('1');

    const speedDisplay = document.getElementById('speedVal');
    expect(speedDisplay).toHaveTextContent('1.00x');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '速度を一段階速く' }));
    expect(speedSlider.value).toBe('1.05');
    expect(speedDisplay).toHaveTextContent('1.05x');

    await user.click(screen.getByRole('button', { name: '速度を一段階遅く' }));
    expect(speedSlider.value).toBe('1.00');
    expect(speedDisplay).toHaveTextContent('1.00x');
  });

  it('initializes both algorithm panels with matching bar arrangements and labels', () => {
    renderWithInit();

    const bubbleBars = document.querySelectorAll<HTMLElement>('#bars-bubble .bar');
    const quickBars = document.querySelectorAll<HTMLElement>('#bars-quick .bar');

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
    renderWithInit();

    const bubblePanel = document.getElementById('board-bubble') as HTMLDetailsElement;
    const quickPanel = document.getElementById('board-quick') as HTMLDetailsElement;

    expect(bubblePanel.open).toBe(true);
    expect(quickPanel.open).toBe(true);

    expect(within(bubblePanel).getByText(/ステップ:\s*0/)).toBeInTheDocument();
    expect(within(quickPanel).getByText(/ステップ:\s*0/)).toBeInTheDocument();

    const bubbleLegend = bubblePanel.querySelector('.legend');
    expect(bubbleLegend).not.toBeNull();
    expect(
      within(bubbleLegend as HTMLElement).getByText('入れ替え/比較（赤）'),
    ).toBeInTheDocument();
    expect(within(bubbleLegend as HTMLElement).getByText(/ソート完了/)).toBeInTheDocument();

    const quickLegend = quickPanel.querySelector('.legend');
    expect(quickLegend).not.toBeNull();
    expect(
      within(quickLegend as HTMLElement).getByText('入れ替え/比較（赤）'),
    ).toBeInTheDocument();
    expect(within(quickLegend as HTMLElement).getByText(/ピボット/)).toBeInTheDocument();
    expect(within(quickLegend as HTMLElement).getByText(/境界/)).toBeInTheDocument();
    expect(within(quickLegend as HTMLElement).getByText(/ピボット高/)).toBeInTheDocument();
    expect(within(quickLegend as HTMLElement).getByText(/ソート完了/)).toBeInTheDocument();
  });

  it('increments the bar count immediately when using the size stepper controls', async () => {
    renderWithInit();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '本数を1増やす' }));

    const sizeSlider = screen.getByLabelText(/本数/i) as HTMLInputElement;
    await waitFor(() => {
      expect(sizeSlider.value).toBe('21');
    });
    const sizeDisplay = document.getElementById('sizeVal');
    expect(sizeDisplay).toHaveTextContent('21');

    const bubbleBars = document.querySelectorAll('#bars-bubble .bar');
    const quickBars = document.querySelectorAll('#bars-quick .bar');
    expect(bubbleBars).toHaveLength(21);
    expect(quickBars).toHaveLength(21);

    const bubbleHeights = Array.from(bubbleBars, (bar) => (bar as HTMLElement).style.height);
    const quickHeights = Array.from(quickBars, (bar) => (bar as HTMLElement).style.height);
    expect(bubbleHeights).toEqual(quickHeights);
  });

  it('rebuilds both panels when the size slider is moved directly', () => {
    renderWithInit();

    const sizeSlider = screen.getByLabelText(/本数/i) as HTMLInputElement;
    fireEvent.input(sizeSlider, { target: { value: '18' } });

    expect(sizeSlider.value).toBe('18');
    const sizeDisplay = document.getElementById('sizeVal');
    expect(sizeDisplay).toHaveTextContent('18');

    expect(document.querySelectorAll('#bars-bubble .bar')).toHaveLength(18);
    expect(document.querySelectorAll('#bars-quick .bar')).toHaveLength(18);
  });

  it('updates the speed label to two decimal places when the slider value changes', () => {
    renderWithInit();

    const speedSlider = screen.getByLabelText(/アニメ速度/i) as HTMLInputElement;
    fireEvent.input(speedSlider, { target: { value: '2.5' } });

    expect(speedSlider.value).toBe('2.5');
    const speedDisplay = document.getElementById('speedVal');
    expect(speedDisplay).toHaveTextContent('2.50x');
  });

  it('shuffles with the current bar count and keeps both panels synchronized', async () => {
    renderWithInit();

    const sizeSlider = screen.getByLabelText(/本数/i) as HTMLInputElement;
    fireEvent.input(sizeSlider, { target: { value: '12' } });

    const randomSpy = vi.spyOn(Math, 'random');
    const before = randomSpy.mock.calls.length;

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'シャッフル' }));

    const after = randomSpy.mock.calls.length;
    expect(after).toBeGreaterThan(before);

    const expectedCount = Number(sizeSlider.value);
    const bubbleBars = document.querySelectorAll('#bars-bubble .bar');
    const quickBars = document.querySelectorAll('#bars-quick .bar');
    expect(bubbleBars).toHaveLength(expectedCount);
    expect(quickBars).toHaveLength(expectedCount);

    const bubbleHeights = Array.from(bubbleBars, (bar) => (bar as HTMLElement).style.height);
    const quickHeights = Array.from(quickBars, (bar) => (bar as HTMLElement).style.height);
    expect(bubbleHeights).toEqual(quickHeights);
  });

  it('hides quick-sort overlay elements until a processing range exists', () => {
    renderWithInit();

    const boundary = document.getElementById('boundary-line') as HTMLElement | null;
    const subrange = document.getElementById('subrange-box') as HTMLElement | null;
    const pivotLine = document.getElementById('pivot-hline') as HTMLElement | null;
    const zoneLeft = document.getElementById('zone-left') as HTMLElement | null;
    const zoneRight = document.getElementById('zone-right') as HTMLElement | null;

    expect(boundary?.style.display).toBe('none');
    expect(subrange?.style.display).toBe('none');
    expect(pivotLine?.style.display).toBe('none');
    expect(zoneLeft?.style.display).toBe('none');
    expect(zoneRight?.style.display).toBe('none');
  });

  it('sets initial playback controls according to the specification', () => {
    renderWithInit();

    expect(screen.getByRole('button', { name: /再生/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /一時停止/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'シャッフル' })).toBeEnabled();
  });
});
