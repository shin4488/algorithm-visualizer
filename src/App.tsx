import React from 'react';
import ReactGA from 'react-ga4';
import '@/styles.css';
import {
  genArray,
  buildBubbleSteps,
  buildSelectionSteps,
  buildMergeSteps,
  buildQuickSteps,
  computeInterval,
  SWAP_TRANS_MS,
  type Step,
} from '@/plugins/visualizer';

/* Mantine */
import { Container, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import AlgorithmSelector from '@/components/AlgorithmSelector';
import HeaderBar from '@/components/HeaderBar';
import ControlBar from '@/components/ControlBar';
import SortSection, { BoardState } from '@/components/SortSection';
import { BubbleLegend } from '@/components/algorithms/Bubble';
import { SelectionLegend } from '@/components/algorithms/Selection';
import { MergeLegend, MergeOverlay } from '@/components/algorithms/Merge';
import { QuickLegend, QuickOverlay } from '@/components/algorithms/Quick';

type Kind = 'bubble' | 'selection' | 'merge' | 'quick';

function makeBoard(kind: Kind, base: number[]): BoardState {
  const n = base.length;
  return {
    kind,
    data: base.slice(),
    maxValue: Math.max(...base, 1),
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
    mergeProgress: null,
  };
}

/**
 * ステップ 1 件をボード状態へ適用する純粋関数。
 * 比較・交換・選択・書き込みのハイライトは 1 ステップ限りなので、毎回いったんクリアしてから適用する
 */
function applyStep(b: BoardState, step: Step): BoardState {
  const next: BoardState = { ...b, compare: null, swapPair: null };
  switch (step.t) {
    case 'compare':
      return {
        ...next,
        compare: [step.i, step.j],
        mergeProgress: next.mergeProgress
          ? { ...next.mergeProgress, selected: null }
          : next.mergeProgress,
      };
    case 'swap': {
      const data = next.data.slice();
      const ids = next.ids.slice();
      const { i, j } = step;
      [data[i], data[j]] = [data[j], data[i]];
      [ids[i], ids[j]] = [ids[j], ids[i]];
      // ピボット自体が入れ替え対象だった場合、ハイライト位置を移動先へ追従させる
      let pivotIndex = next.pivotIndex;
      if (pivotIndex != null) {
        if (pivotIndex === i) pivotIndex = j;
        else if (pivotIndex === j) pivotIndex = i;
      }
      return { ...next, data, ids, swapPair: [i, j], candL: null, candR: null, pivotIndex };
    }
    case 'write': {
      const data = next.data.slice();
      const ids = next.ids.slice();
      data[step.i] = step.value;
      ids[step.i] = step.id;
      return {
        ...next,
        data,
        ids,
        swapPair: [step.i, step.i],
        mergeProgress: next.mergeProgress
          ? { ...next.mergeProgress, selected: null, writing: true }
          : null,
      };
    }
    case 'mergeStart':
      return {
        ...next,
        mergeProgress: {
          left: step.left,
          right: step.right,
          leftCursor: 0,
          rightCursor: 0,
          output: [],
          selected: null,
          writing: false,
        },
      };
    case 'mergeTake': {
      if (!next.mergeProgress) return next;
      const progress = next.mergeProgress;
      return {
        ...next,
        swapPair: [step.source, step.source],
        mergeProgress: {
          ...progress,
          leftCursor: progress.leftCursor + (step.side === 'left' ? 1 : 0),
          rightCursor: progress.rightCursor + (step.side === 'right' ? 1 : 0),
          output: [...progress.output, step.value],
          selected: { side: step.side, value: step.value },
        },
      };
    }
    case 'pivot':
      return { ...next, pivotIndex: step.i ?? null };
    case 'range':
      if (next.kind !== 'quick' && next.kind !== 'merge') return next;
      if (step.lo == null || step.hi == null) {
        return {
          ...next,
          range: null,
          boundaryIndex: null,
          boundaryVisible: false,
          pivotIndex: null,
          candL: null,
          candR: null,
          mergeProgress: null,
        };
      }
      return {
        ...next,
        range: { lo: step.lo, hi: step.hi },
        boundaryIndex: step.lo,
        boundaryVisible: next.kind === 'quick',
        pivotIndex: null,
        candL: null,
        candR: null,
      };
    case 'boundary':
      return next.kind === 'quick' || next.kind === 'merge'
        ? { ...next, boundaryIndex: step.k, boundaryVisible: step.show !== false }
        : next;
    // markL はクイックソートの「左候補」と選択ソートの「最小値候補」で共用する
    case 'markL':
      return next.kind === 'quick' || next.kind === 'selection' ? { ...next, candL: step.i } : next;
    case 'markR':
      return next.kind === 'quick' ? { ...next, candR: step.i } : next;
    case 'clearMarks':
      return next.kind === 'quick' || next.kind === 'selection'
        ? { ...next, candL: null, candR: null }
        : next;
    default:
      return next;
  }
}

const App: React.FC = () => {
  const { i18n, t } = useTranslation();
  const browserLanguage = i18n.language;
  const translatedLanguage = browserLanguage.startsWith('ja') ? 'ja' : 'en';

  const [size, setSize] = React.useState<number>(20);
  const [speed, setSpeed] = React.useState<number>(1.0);
  const [playing, setPlaying] = React.useState<boolean>(false);

  const [algorithmOrder, setAlgorithmOrder] = React.useState<Kind[]>([
    'bubble',
    'selection',
    'merge',
    'quick',
  ]);
  const [visibleAlgorithms, setVisibleAlgorithms] = React.useState<Kind[]>([
    'bubble',
    'selection',
    'merge',
    'quick',
  ]);

  // 全ボードは同じ初期配列 base を共有し、アルゴリズム間で公平に比較できるようにする
  const [base, setBase] = React.useState<number[]>(() => genArray(20));
  const [bubble, setBubble] = React.useState<BoardState>(() => makeBoard('bubble', base));
  const [selection, setSelection] = React.useState<BoardState>(() => makeBoard('selection', base));
  const [merge, setMerge] = React.useState<BoardState>(() => makeBoard('merge', base));
  const [quick, setQuick] = React.useState<BoardState>(() => makeBoard('quick', base));

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
      setSelection((prev) => {
        if (prev.finished || prev.stepIndex >= prev.steps.length) return prev;
        const step = prev.steps[prev.stepIndex];
        const n = applyStep(prev, step);
        const finished = prev.stepIndex + 1 >= prev.steps.length;
        return { ...n, stepIndex: prev.stepIndex + 1, finished };
      });
      setMerge((prev) => {
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
    if (playing && selection.finished)
      ReactGA.event('sort_finish', {
        animation_speed: speed,
        bar_size: size,
        algorithm_type: 'selection_sort',
        browser_language: browserLanguage,
        translated_language: translatedLanguage,
      });
    if (playing && merge.finished)
      ReactGA.event('sort_finish', {
        animation_speed: speed,
        bar_size: size,
        algorithm_type: 'merge_sort',
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
    if (playing && bubble.finished && selection.finished && merge.finished && quick.finished)
      setPlaying(false);
  }, [playing, bubble.finished, selection.finished, merge.finished, quick.finished]);

  const resetFrom = (arr: number[]) => {
    setBase(arr);
    setBubble(makeBoard('bubble', arr));
    setSelection(makeBoard('selection', arr));
    setMerge(makeBoard('merge', arr));
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
    // 一時停止後の配列からステップを作り直すと保存済みの再生位置とずれるため、再開時は既存の列を使う。
    setBubble((prev) =>
      prev.steps.length ? prev : { ...prev, steps: buildBubbleSteps(prev.data) },
    );
    setSelection((prev) =>
      prev.steps.length ? prev : { ...prev, steps: buildSelectionSteps(prev.data) },
    );
    setMerge((prev) => (prev.steps.length ? prev : { ...prev, steps: buildMergeSteps(prev.data) }));
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
    <Container component="main" size={1200} px={{ base: 'md', sm: 36 }} pb="xl" style={rootStyle}>
      <HeaderBar />

      <AlgorithmSelector
        order={algorithmOrder}
        visible={visibleAlgorithms}
        onOrderChange={setAlgorithmOrder}
        onToggle={(kind) =>
          setVisibleAlgorithms((current) =>
            current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
          )
        }
        onSelectAll={() => setVisibleAlgorithms([...algorithmOrder])}
      />
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

      <Stack gap="md" mt="md">
        {algorithmOrder
          .filter((kind) => visibleAlgorithms.includes(kind))
          .map((kind) => {
            // 表示設定だけを変え、各ボードの再生状態は親に保持する。
            const board = { bubble, selection, merge, quick }[kind];
            const Legend = {
              bubble: BubbleLegend,
              selection: SelectionLegend,
              merge: MergeLegend,
              quick: QuickLegend,
            }[kind];
            return (
              <SortSection
                key={kind}
                titleKey={kind}
                stepsCount={board.steps.length}
                board={board}
                Legend={Legend}
                Overlay={
                  kind === 'quick' ? QuickOverlay : kind === 'merge' ? MergeOverlay : undefined
                }
              />
            );
          })}
        {visibleAlgorithms.length === 0 && (
          <Text c="dimmed" size="sm" py="xl" ta="center">
            {t('no_algorithms')}
          </Text>
        )}
      </Stack>
    </Container>
  );
};

export default App;
