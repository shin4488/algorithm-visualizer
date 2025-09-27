import React from 'react';
import ReactGA from 'react-ga4';
import './styles.css';
import {
  genArray,
  buildBubbleSteps,
  buildQuickSteps,
  computeInterval,
  SWAP_TRANS_MS,
  type Step,
} from './plugins/visualizer';

/* Mantine */
import { Container, Paper, Accordion } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import HeaderBar from './components/HeaderBar';
import ControlBar from './components/ControlBar';
import SortSection, { BoardState } from './components/SortSection';

type Kind = 'bubble' | 'quick';

function makeBoard(kind: Kind, base: number[]): BoardState {
  const n = base.length;
  return {
    kind,
    data: base.slice(),
    ids: Array.from({ length: n }, (_, i) => i + 1),
    steps: [],
    stepIndex: 0,
    finished: false,
    compare: null,
    swapPair: null,
    candL: null,
    candR: null,
    pivotIndex: null,
    range: null,
    boundaryIndex: null,
    boundaryVisible: false,
  };
}

function applyStep(b: BoardState, step: Step): BoardState {
  const next: BoardState = { ...b, compare: null, swapPair: null };
  switch (step.t) {
    case 'compare':
      return { ...next, compare: [step.i, step.j] };
    case 'swap': {
      const data = next.data.slice();
      const ids = next.ids.slice();
      const { i, j } = step;
      [data[i], data[j]] = [data[j], data[i]];
      [ids[i], ids[j]] = [ids[j], ids[i]];
      let pivotIndex = next.pivotIndex;
      if (pivotIndex != null) {
        if (pivotIndex === i) pivotIndex = j;
        else if (pivotIndex === j) pivotIndex = i;
      }
      return { ...next, data, ids, swapPair: [i, j], candL: null, candR: null, pivotIndex };
    }
    case 'pivot':
      return { ...next, pivotIndex: step.i ?? null };
    case 'range':
      if (next.kind !== 'quick') return next;
      if (step.lo == null || step.hi == null) {
        return {
          ...next,
          range: null,
          boundaryIndex: null,
          boundaryVisible: false,
          pivotIndex: null,
          candL: null,
          candR: null,
        };
      }
      return {
        ...next,
        range: { lo: step.lo, hi: step.hi },
        boundaryIndex: step.lo,
        boundaryVisible: true,
        pivotIndex: null,
        candL: null,
        candR: null,
      };
    case 'boundary':
      return next.kind === 'quick'
        ? { ...next, boundaryIndex: step.k, boundaryVisible: step.show !== false }
        : next;
    case 'markL':
      return next.kind === 'quick' ? { ...next, candL: step.i } : next;
    case 'markR':
      return next.kind === 'quick' ? { ...next, candR: step.i } : next;
    case 'clearMarks':
      return next.kind === 'quick' ? { ...next, candL: null, candR: null } : next;
    default:
      return next;
  }
}

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const browserLanguage = i18n.language;
  const translatedLanguage = browserLanguage.startsWith('ja') ? 'ja' : 'en';

  const [size, setSize] = React.useState<number>(20);
  const [speed, setSpeed] = React.useState<number>(1.0);
  const [playing, setPlaying] = React.useState<boolean>(false);

  const [base, setBase] = React.useState<number[]>(() => genArray(20));
  const [bubble, setBubble] = React.useState<BoardState>(() => makeBoard('bubble', base));
  const [quick, setQuick] = React.useState<BoardState>(() => makeBoard('quick', base));

  const stepsBubble = bubble.steps.length;
  const stepsQuick = quick.steps.length;

  // タイマー
  React.useEffect(() => {
    if (!playing) return;
    const iv = computeInterval(speed);
    const id = window.setInterval(() => {
      setBubble((prev) => {
        if (prev.finished || prev.stepIndex >= prev.steps.length) return prev;
        const step = prev.steps[prev.stepIndex];
        const n = applyStep(prev, step);
        const finished = prev.stepIndex + 1 >= prev.steps.length;
        return { ...n, stepIndex: prev.stepIndex + 1, finished };
      });
      setQuick((prev) => {
        if (prev.finished || prev.stepIndex >= prev.steps.length) return prev;
        const step = prev.steps[prev.stepIndex];
        const n = applyStep(prev, step);
        const finished = prev.stepIndex + 1 >= prev.steps.length;
        return { ...n, stepIndex: prev.stepIndex + 1, finished };
      });
    }, iv);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  React.useEffect(() => {
    if (playing && bubble.finished)
      ReactGA.event('sort_finish', {
        animation_speed: speed,
        bar_size: size,
        algorithm_type: 'bubble_sort',
        browser_language: browserLanguage,
        translated_language: translatedLanguage,
      });
    if (playing && quick.finished)
      ReactGA.event('sort_finish', {
        animation_speed: speed,
        bar_size: size,
        algorithm_type: 'quick_sort',
        browser_language: browserLanguage,
        translated_language: translatedLanguage,
      });
    if (playing && bubble.finished && quick.finished) setPlaying(false);
  }, [playing, bubble.finished, quick.finished]);

  const resetFrom = (arr: number[]) => {
    setBase(arr);
    setBubble(makeBoard('bubble', arr));
    setQuick(makeBoard('quick', arr));
    setPlaying(false);
  };

  const handleStart = () => {
    ReactGA.event('play_click', {
      animation_speed: speed,
      bar_size: size,
      browser_language: browserLanguage,
      translated_language: translatedLanguage,
    });
    setBubble((prev) =>
      prev.steps.length ? prev : { ...prev, steps: buildBubbleSteps(prev.data) },
    );
    setQuick((prev) => (prev.steps.length ? prev : { ...prev, steps: buildQuickSteps(prev.data) }));
    setPlaying(true);
  };
  const handlePause = () => {
    ReactGA.event('pause_click', {
      animation_speed: speed,
      bar_size: size,
      browser_language: browserLanguage,
      translated_language: translatedLanguage,
    });
    setPlaying(false);
  };
  const handleShuffle = () => {
    ReactGA.event('shuffle_click', {
      animation_speed: speed,
      bar_size: size,
      browser_language: browserLanguage,
      translated_language: translatedLanguage,
    });
    resetFrom(genArray(size));
  };
  const handleSizeInput = (n: number) => {
    const nn = Math.max(5, Math.min(50, Math.floor(n)));
    setSize(nn);
    resetFrom(genArray(nn));
  };
  const handleSpeedInput = (s: number) => {
    const ss = Math.max(0.2, Math.min(10, s));
    setSpeed(ss);
  };

  const rootStyle: React.CSSProperties & Record<'--transMs', string> = {
    '--transMs': `${SWAP_TRANS_MS}ms`,
  };

  return (
    <Container size={1280} px="md" py="md" style={rootStyle}>
      <HeaderBar />

      <Paper
        p="md"
        radius={16}
        mt="md"
        withBorder
        style={{
          background: 'var(--panel)',
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        }}
      >
        <ControlBar
          size={size}
          speed={speed}
          playing={playing}
          onSizeChange={handleSizeInput}
          onSpeedChange={handleSpeedInput}
          onStart={handleStart}
          onPause={handlePause}
          onShuffle={handleShuffle}
        />

        <Accordion
          multiple
          defaultValue={['bubble', 'quick']}
          mt="md"
          radius="md"
          variant="separated"
          chevronPosition="left"
        >
          <SortSection value="bubble" titleKey="bubble" stepsCount={stepsBubble} board={bubble} />
          <SortSection value="quick" titleKey="quick" stepsCount={stepsQuick} board={quick} />
        </Accordion>
      </Paper>
    </Container>
  );
};

export default App;
