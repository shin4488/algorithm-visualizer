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
  compare: [number, number] | null;
  swapPair: [number, number] | null;
  range: { lo: number; hi: number } | null;
  boundary: { k: number; lo: number; hi: number } | null;
  markL: number | null;
  markR: number | null;
  sorted: boolean;
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
    compare: null,
    swapPair: null,
    range: null,
    boundary: null,
    markL: null,
    markR: null,
    sorted: false,
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
    if (board.idx >= board.steps.length) {
      board.sorted = true;
    }
  }

  function applyStep(board: BoardState, step: Step) {
    board.compare = null;
    board.swapPair = null;
    switch (step.t) {
      case "compare": {
        board.compare = [step.i, step.j];
        break;
      }
      case "swap": {
        const { i, j } = step;
        [board.data[i], board.data[j]] = [board.data[j], board.data[i]];
        [board.ids[i], board.ids[j]] = [board.ids[j], board.ids[i]];
        board.swapPair = [i, j];
        break;
      }
      case "pivot": {
        board.pivotIndex = step.i;
        break;
      }
      case "range": {
        board.range =
          step.lo === null || step.hi === null
            ? null
            : { lo: step.lo, hi: step.hi };
        break;
      }
      case "boundary": {
        board.boundary = step.show
          ? { k: step.k, lo: step.lo, hi: step.hi }
          : null;
        break;
      }
      case "markL": {
        board.markL = step.i;
        break;
      }
      case "markR": {
        board.markR = step.i;
        break;
      }
      case "clearMarks": {
        board.markL = null;
        board.markR = null;
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
      if (board.compare &&
          (board.compare[0] === idx || board.compare[1] === idx))
        classes.push("compare");
      if (board.swapPair &&
          (board.swapPair[0] === idx || board.swapPair[1] === idx))
        classes.push("swap");
      if (board.markL === idx) classes.push("candL");
      if (board.markR === idx) classes.push("candR");
      if (board.sorted) classes.push("sorted");
      return React.createElement("div", {
        key: board.ids[idx],
        className: classes.join(" "),
        style: { height: (v / max) * 100 + "%" },
        "data-label": String(board.ids[idx]),
      });
    });
  }

  function renderOverlay(board: BoardState) {
    if (!board.range && !board.boundary && board.pivotIndex === null)
      return null;
    const n = board.data.length;
    const children: any[] = [];
    if (board.range) {
      const left = (board.range.lo / n) * 100;
      const width = ((board.range.hi - board.range.lo + 1) / n) * 100;
      children.push(
        React.createElement("div", {
          key: "subrange",
          className: "subrange",
          style: { left: left + "%", width: width + "%" },
        }),
      );
    }
    if (board.boundary) {
      const left = (board.boundary.k / n) * 100;
      children.push(
        React.createElement("div", {
          key: "boundary",
          className: "boundary",
          style: { left: `calc(${left}% - 1px)` },
        }),
      );
    }
    if (board.pivotIndex !== null) {
      const max = Math.max(...board.data, 1);
      const v = board.data[board.pivotIndex];
      const top = 100 - (v / max) * 100;
      const left = board.range ? (board.range.lo / n) * 100 : 0;
      const right = board.range ? ((n - 1 - board.range.hi) / n) * 100 : 0;
      children.push(
        React.createElement("div", {
          key: "pivot-hline",
          className: "pivot-hline",
          style: {
            top: top + "%",
            left: left + "%",
            right: right + "%",
            display: "block",
          },
        }),
      );
    }
    return React.createElement(
      "div",
      { className: "partition-overlay" },
      children,
    );
  }

  return (
    <div className="wrap">
      <h1>
        アルゴリズム可視化：バブルソート &
        クイックソート（同時比較・折りたたみ対応）
      </h1>
      <div className="toolbar">
        <div className="group stepper">
          <label>
            本数: <span className="value">{size}</span>
          </label>
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
        </div>
        <div className="group stepper">
          <label>
            アニメ速度: <span className="value">{speed.toFixed(2)}x</span>
          </label>
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
        <div className="legend">
          <div className="chip">
            <div className="box swap"></div>入れ替え/比較
          </div>
          <div className="chip">
            <div className="box pivot"></div>ピボット
          </div>
          <div className="chip">
            <div className="box boundary"></div>境界
          </div>
          <div className="chip">
            <div className="box pivotLine"></div>ピボット高
          </div>
          <div className="chip">
            <div className="box sorted"></div>ソート完了
          </div>
        </div>
        <div className="bars">{renderBars(bubble.current)}</div>
      </details>
      <details className="board" open>
        <summary>
          <div className="summary-title">
            <div className="caret"></div>
            <span>クイックソート</span>
          </div>
        </summary>
        <div className="legend">
          <div className="chip">
            <div className="box swap"></div>入れ替え/比較
          </div>
          <div className="chip">
            <div className="box pivot"></div>ピボット
          </div>
          <div className="chip">
            <div className="box boundary"></div>境界
          </div>
          <div className="chip">
            <div className="box pivotLine"></div>ピボット高
          </div>
          <div className="chip">
            <div className="box sorted"></div>ソート完了
          </div>
        </div>
        <div className="bars">
          {renderBars(quick.current)}
          {renderOverlay(quick.current)}
        </div>
      </details>
    </div>
  );
}
