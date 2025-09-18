import React from 'react';
import './styles.css';
import {
  genArray,
  buildBubbleSteps,
  buildQuickSteps,
  computeInterval,
  SWAP_TRANS_MS,
  type Step,
} from './visualizer';

/* === Mantine UI === */
import {
  Container,
  Paper,
  Group,
  Button,
  Title,
  Text,
  ActionIcon,
  Stack,
  Flex,
  Box,
} from '@mantine/core';

type Kind = 'bubble' | 'quick';
type Range = { lo: number; hi: number } | null;

type BoardState = {
  kind: Kind;
  data: number[];
  ids: number[];
  steps: Step[];
  stepIndex: number;
  finished: boolean;
  compare?: [number, number] | null;
  swapPair?: [number, number] | null;
  candL?: number | null;
  candR?: number | null;
  pivotIndex: number | null;
  range: Range;
  boundaryIndex: number | null;
  boundaryVisible: boolean;
};

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

function Bars({ board }: { board: BoardState }) {
  const max = Math.max(...board.data, 1);
  const n = board.data.length;

  const isCompare = (idx: number) =>
    !!board.compare && (idx === board.compare[0] || idx === board.compare[1]);
  const isSwap = (idx: number) =>
    !!board.swapPair && (idx === board.swapPair[0] || idx === board.swapPair[1]);
  const isPivot = (idx: number) => board.pivotIndex === idx;
  const isCandL = (idx: number) => board.candL === idx;
  const isCandR = (idx: number) => board.candR === idx;

  return (
    <div
      className="bars"
      aria-label={`${board.kind === 'bubble' ? 'バブル' : 'クイック'}ソートのバー表示`}
    >
      {board.kind === 'quick' && <QuickOverlay board={board} />}

      {Array.from({ length: n }, (_, i) => {
        const h = (board.data[i] / max) * 100;
        const classes = [
          'bar',
          isPivot(i) ? 'pivot' : '',
          isCompare(i) ? 'compare' : '',
          isSwap(i) ? 'swap' : '',
          isCandL(i) ? 'candL' : '',
          isCandR(i) ? 'candR' : '',
          board.finished ? 'sorted' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={i} className={classes} style={{ height: `${h}%` }} data-label={board.ids[i]} />
        );
      })}
    </div>
  );
}

function QuickOverlay({ board }: { board: BoardState }) {
  const n = Math.max(board.data.length, 1);
  const range = board.range;
  const lo = range?.lo ?? 0;
  const hi = range?.hi ?? n - 1;

  const showRange = range != null;
  const leftPct = (lo / n) * 100;
  const rightPct = ((hi + 1) / n) * 100;
  const boundaryPct = ((board.boundaryIndex ?? lo) / n) * 100;

  const pivotHeightPct =
    board.pivotIndex != null && board.data.length
      ? (board.data[board.pivotIndex] / Math.max(...board.data, 1)) * 100
      : null;

  return (
    <div className="partition-overlay" aria-hidden="true">
      <div
        className="zone"
        style={{
          left: `${leftPct}%`,
          right: `${100 - boundaryPct}%`,
          display: showRange ? 'block' : 'none',
        }}
      />
      <div
        className="zone"
        style={{
          left: `${boundaryPct}%`,
          right: `${100 - rightPct}%`,
          display: showRange ? 'block' : 'none',
        }}
      />
      <div
        className="subrange"
        style={{
          left: `${leftPct}%`,
          right: `${100 - rightPct}%`,
          display: showRange ? 'block' : 'none',
        }}
      />
      <div
        className="boundary"
        style={{
          left: `${boundaryPct}%`,
          display: showRange && board.boundaryVisible ? 'block' : 'none',
        }}
      />
      <div
        className="pivot-hline"
        style={{
          left: `${leftPct}%`,
          right: `${100 - rightPct}%`,
          bottom: pivotHeightPct != null ? `${pivotHeightPct}%` : undefined,
          display: showRange && pivotHeightPct != null ? 'block' : 'none',
        }}
      />
    </div>
  );
}

const App: React.FC = () => {
  const [size, setSize] = React.useState<number>(20);
  const [speed, setSpeed] = React.useState<number>(1.0);
  const [playing, setPlaying] = React.useState<boolean>(false);

  const [base, setBase] = React.useState<number[]>(() => genArray(20));
  const [bubble, setBubble] = React.useState<BoardState>(() => makeBoard('bubble', base));
  const [quick, setQuick] = React.useState<BoardState>(() => makeBoard('quick', base));

  const stepsBubble = bubble.steps.length;
  const stepsQuick = quick.steps.length;

  // タイマー（speed / playing の変更で再スケジュール）
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

  // 両方終われば自動停止
  React.useEffect(() => {
    if (playing && bubble.finished && quick.finished) setPlaying(false);
  }, [playing, bubble.finished, quick.finished]);

  const resetFrom = (arr: number[]) => {
    setBase(arr);
    setBubble(makeBoard('bubble', arr));
    setQuick(makeBoard('quick', arr));
    setPlaying(false);
  };

  const handleStart = () => {
    setBubble((prev) =>
      prev.steps.length ? prev : { ...prev, steps: buildBubbleSteps(prev.data) },
    );
    setQuick((prev) => (prev.steps.length ? prev : { ...prev, steps: buildQuickSteps(prev.data) }));
    setPlaying(true);
  };
  const handlePause = () => setPlaying(false);
  const handleShuffle = () => resetFrom(genArray(size));

  const handleSizeInput = (n: number) => {
    const nn = Math.max(5, Math.min(50, Math.floor(n)));
    setSize(nn);
    resetFrom(genArray(nn));
  };
  const handleSpeedInput = (s: number) => {
    const ss = Math.max(0.2, Math.min(10, s));
    setSpeed(ss);
  };

  // CSS カスタムプロパティを型安全に
  const rootStyle: React.CSSProperties & Record<'--transMs', string> = {
    '--transMs': `${SWAP_TRANS_MS}ms`,
  };

  return (
    <Container size={1100} px="md" py="md" style={rootStyle}>
      <Stack gap="xs">
        <Title
          order={1}
          style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(20px, 2.4vw, 28px)' }}
        >
          アルゴリズム可視化
        </Title>
        <Text c="var(--muted)" size="sm">
          ソートアルゴリズムの比較アニメーション
        </Text>
      </Stack>

      {/* パネル */}
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
        {/* ツールバー：iPad(sm)ではボタンを次行、md以上は1行 */}
        <Flex
          wrap={{ base: 'wrap', sm: 'wrap', md: 'nowrap' }}
          gap={{ base: 'md', md: 8 }}
          align="center"
        >
          {/* 本数（ネイティブ range） */}
          <Box flex={{ base: '1 1 100%', sm: '1 1 0' }} miw={{ base: 260, sm: 250 }}>
            <Group gap="xs" align="center" wrap="nowrap">
              <label htmlFor="size" style={{ fontSize: 12, color: 'var(--muted)' }}>
                本数: {size}
              </label>
              <ActionIcon
                variant="default"
                aria-label="本数を1減らす"
                onClick={() => handleSizeInput(size - 1)}
                style={stepperBtnStyle}
              >
                −
              </ActionIcon>
              <input
                id="size"
                type="range"
                min={5}
                max={50}
                step={1}
                value={size}
                onChange={(e) => handleSizeInput(Number(e.currentTarget.value))}
                style={{ width: 160 }}
              />
              <ActionIcon
                variant="default"
                aria-label="本数を1増やす"
                onClick={() => handleSizeInput(size + 1)}
                style={stepperBtnStyle}
              >
                ＋
              </ActionIcon>
            </Group>
          </Box>

          {/* アニメ速度（ネイティブ range） */}
          <Box flex={{ base: '1 1 100%', sm: '1 1 0' }} miw={{ base: 260, sm: 250 }}>
            <Group gap="xs" align="center" wrap="nowrap">
              <label htmlFor="speed" style={{ fontSize: 12, color: 'var(--muted)' }}>
                アニメ速度: {speed.toFixed(2)}
              </label>
              <ActionIcon
                variant="default"
                aria-label="速度を一段階遅く"
                onClick={() => handleSpeedInput(Number((speed - 0.05).toFixed(2)))}
                style={stepperBtnStyle}
              >
                −
              </ActionIcon>
              <input
                id="speed"
                type="range"
                min={0.2}
                max={10}
                step={0.05}
                value={speed}
                onChange={(e) => handleSpeedInput(Number(e.currentTarget.value))}
                style={{ width: 160 }}
              />
              <ActionIcon
                variant="default"
                aria-label="速度を一段階速く"
                onClick={() => handleSpeedInput(Number((speed + 0.05).toFixed(2)))}
                style={stepperBtnStyle}
              >
                ＋
              </ActionIcon>
            </Group>
          </Box>

          {/* 再生・一時停止・シャッフル（折り返し禁止 / iPadは次行） */}
          <Box flex={{ base: '1 1 100%', sm: '0 0 100%', md: '0 0 auto' }}>
            <Group gap="sm" align="center" wrap="nowrap">
              <Button onClick={handleStart} disabled={playing} style={primaryBtnStyle}>
                ▶ 再生
              </Button>
              <Button
                variant="default"
                onClick={handlePause}
                disabled={!playing}
                styles={{ root: pauseBtnStyle }}
              >
                ⏸ 一時停止
              </Button>
              <Button variant="default" onClick={handleShuffle} style={ghostBtnStyle}>
                シャッフル
              </Button>
            </Group>
          </Box>
        </Flex>

        {/* ==== details版（テスト互換） ==== */}
        <details className="board" id="board-bubble" open>
          <summary>
            <div className="summary-title">
              <span className="caret"></span>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#cbd5ff' }}>バブルソート</h2>
            </div>
            <div className="summary-meta">
              ステップ: <span id="steps-bubble">{stepsBubble}</span>
            </div>
          </summary>
          <Bars board={bubble} />
          <div className="legend">
            <span className="chip">
              <span className="box swap"></span>入れ替え/比較（赤）
            </span>
            <span className="chip">
              <span className="box sorted"></span>ソート完了
            </span>
          </div>
          <div className="footer" />
        </details>

        <details className="board" id="board-quick" open>
          <summary>
            <div className="summary-title">
              <span className="caret"></span>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#cbd5ff' }}>クイックソート</h2>
            </div>
            <div className="summary-meta">
              ステップ:{' '}
              <span className="mono" id="steps-quick">
                {stepsQuick}
              </span>
            </div>
          </summary>
          <Bars board={quick} />
          <div className="legend">
            <span className="chip">
              <span className="box swap"></span>入れ替え/比較（赤）
            </span>
            <span className="chip">
              <span className="box pivot"></span>ピボット
            </span>
            <span className="chip">
              <span className="box boundary"></span>境界（グループ分け）
            </span>
            <span className="chip">
              <span className="box" style={{ background: 'var(--pivotLine)' }}></span>
              ピボット高（横線）
            </span>
            <span className="chip">
              <span className="box sorted"></span>ソート完了
            </span>
          </div>
          <div className="footer" />
        </details>
      </Paper>
    </Container>
  );
};

/* ---- 最小の見た目寄せ（既存デザインを維持） ---- */
const stepperBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'linear-gradient(180deg, #1a2552 0%, #131d40 100%)',
  color: '#e6ebff',
  fontWeight: 700,
  lineHeight: 1,
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #2854ff 0%, #1d36a8 100%)',
  border: '1px solid #4062ff',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 600,
};

const pauseBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  color: 'var(--text)',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #1a2552 0%, #131d40 100%)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

export default App;
