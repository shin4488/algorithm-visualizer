import React, { useState, useEffect, useRef } from "react";
import { buildBubbleSteps } from "./algorithms/bubbleSort";
import { buildQuickSteps } from "./algorithms/quickSort";
import { genArray } from "./array";
import { computeInterval } from "./speed";
import type { Step } from "./steps";

interface BoardState {
  data: number[];
  ids: number[];
  steps: Step[];
  idx: number;
  pivotIndex: number | null;
}

function createBoard(
  base: number[],
  builder: (arr: number[]) => Step[],
): BoardState {
  return {
    data: base.slice(),
    ids: base.map((_, i) => i + 1),
    steps: builder(base),
    idx: 0,
    pivotIndex: null,
  };
}

export default function App() {
  const [size, setSize] = useState(20);
  const [speed, setSpeed] = useState(1);
  const [base, setBase] = useState(genArray(20));
  const [playing, setPlaying] = useState(false);
  const [, force] = useState(0);
  const bubble = useRef(createBoard(base, buildBubbleSteps) as BoardState);
  const quick = useRef(createBoard(base, buildQuickSteps) as BoardState);

  function forceRender() {
    force((n: number) => n + 1);
  }

  function resetBoards(newBase: number[]) {
    bubble.current = createBoard(newBase, buildBubbleSteps);
    quick.current = createBoard(newBase, buildQuickSteps);
    forceRender();
  }

  useEffect(() => {
    resetBoards(base);
  }, [base]);

  useEffect(() => {
    if (!playing) return;
    const iv = computeInterval(speed);
    const id = setInterval(() => {
      stepOnce(bubble.current);
      stepOnce(quick.current);
      forceRender();
    }, iv);
    return () => clearInterval(id);
  }, [playing, speed]);

  function stepOnce(board: BoardState) {
    const step = board.steps[board.idx++];
    if (!step) return;
    applyStep(board, step);
  }

  function applyStep(board: BoardState, step: Step) {
    switch (step.t) {
      case "swap": {
        const { i, j } = step;
        [board.data[i], board.data[j]] = [board.data[j], board.data[i]];
        [board.ids[i], board.ids[j]] = [board.ids[j], board.ids[i]];
        break;
      }
      case "pivot": {
        board.pivotIndex = step.i;
        break;
      }
      default:
        break;
    }
  }

  function shuffle(n: number) {
    setBase(genArray(n));
  }

  const adjustByStep = (
    value: number,
    step: number,
    min: number,
    max: number,
  ) => Math.min(max, Math.max(min, value + step));

  const onSizeChange = (e: any) => {
    const n = parseInt(e.target.value, 10);
    setSize(n);
    shuffle(n);
  };
  const onSpeedChange = (e: any) => {
    const sp = parseFloat(e.target.value);
    setSpeed(sp);
  };
  const decSize = () =>
    setSize((s: number) => {
      const n = adjustByStep(s, -1, 5, 50);
      shuffle(n);
      return n;
    });
  const incSize = () =>
    setSize((s: number) => {
      const n = adjustByStep(s, 1, 5, 50);
      shuffle(n);
      return n;
    });
  const decSpeed = () =>
    setSpeed((s: number) => adjustByStep(s, -0.05, 0.2, 10));
  const incSpeed = () =>
    setSpeed((s: number) => adjustByStep(s, 0.05, 0.2, 10));
  const play = () => setPlaying(true);
  const pause = () => setPlaying(false);
  const handleShuffle = () => shuffle(size);

  function renderBars(board: BoardState) {
    const max = Math.max(...board.data, 1);
    return board.data.map((v, idx) => {
      const classes = ["bar"];
      if (board.pivotIndex === idx) classes.push("pivot");
      return React.createElement("div", {
        key: board.ids[idx],
        className: classes.join(" "),
        style: { height: (v / max) * 100 + "%" },
        "data-label": String(board.ids[idx]),
      });
    });
  }

  return (
    <div className="wrap">
      <h1>
        アルゴリズム可視化：バブルソート &
        クイックソート（同時比較・折りたたみ対応）
      </h1>
      <div className="toolbar">
        <div className="group stepper">
          <label>本数</label>
          <button className="stepperBtn" onClick={decSize}>
            -
          </button>
          <input
            type="range"
            min="5"
            max="50"
            value={size}
            onInput={onSizeChange}
          />
          <button className="stepperBtn" onClick={incSize}>
            +
          </button>
          <span>{size}</span>
        </div>
        <div className="group stepper">
          <label>速度</label>
          <button className="stepperBtn" onClick={decSpeed}>
            -
          </button>
          <input
            type="range"
            min="0.2"
            max="10"
            step="0.01"
            value={speed}
            onInput={onSpeedChange}
          />
          <button className="stepperBtn" onClick={incSpeed}>
            +
          </button>
          <span>{speed.toFixed(2)}x</span>
        </div>
        <button className="btn primary" onClick={play}>
          再生
        </button>
        <button className="btn" onClick={pause}>
          一時停止
        </button>
        <button className="btn" onClick={handleShuffle}>
          シャッフル
        </button>
      </div>
      <details className="board" open>
        <summary>
          <div className="summary-title">
            <div className="caret"></div>
            <span>バブルソート</span>
          </div>
        </summary>
        <div className="bars">{renderBars(bubble.current)}</div>
      </details>
      <details className="board" open>
        <summary>
          <div className="summary-title">
            <div className="caret"></div>
            <span>クイックソート</span>
          </div>
        </summary>
        <div className="bars">{renderBars(quick.current)}</div>
      </details>
    </div>
  );
}
