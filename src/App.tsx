import React from 'react';
import './styles.css';

const App: React.FC = () => (
  <div className="wrap">
    <h1>
      アルゴリズム可視化 <span className="sub">— バブルソート & クイックソート（同時比較・折りたたみ可）</span>
    </h1>
    <div className="panel">
      <div className="toolbar">
        <div className="group">
          <label htmlFor="size">
            本数: <span id="sizeVal" className="mono">20</span>
          </label>
          <div className="stepper">
            <button id="sizeMinus" className="stepperBtn" aria-label="本数を1減らす">
              −
            </button>
            <input id="size" type="range" min="5" max="50" step="1" defaultValue="20" />
            <button id="sizePlus" className="stepperBtn" aria-label="本数を1増やす">
              ＋
            </button>
          </div>
        </div>
        <div className="group">
          <label htmlFor="speed">
            アニメ速度: <span id="speedVal" className="mono">1.00x</span>
          </label>
          {/* 左ほど遅く / 右ほど速く。0.20x〜10.00x（棒の入れ替え速度は固定） */}
          <div className="stepper">
            <button id="speedMinus" className="stepperBtn" aria-label="速度を一段階遅く">
              −
            </button>
            <input id="speed" type="range" min="0.2" max="10" step="0.05" defaultValue="1" />
            <button id="speedPlus" className="stepperBtn" aria-label="速度を一段階速く">
              ＋
            </button>
          </div>
        </div>
        {/* ボタン順：Start, Pause, Shuffle（リセット位置に移動） */}
        <button id="start" className="btn primary">
          ▶ 再生
        </button>
        <button id="pause" className="btn ghost" disabled>
          ⏸ 一時停止
        </button>
        <button id="shuffle" className="btn">
          シャッフル
        </button>
      </div>

      {/* 上段：バブルソート（折りたたみ） */}
      <details className="board" id="board-bubble" open>
        <summary>
          <div className="summary-title">
            <span className="caret"></span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#cbd5ff' }}>バブルソート</h2>
          </div>
          <div className="summary-meta">
            ステップ: <span id="steps-bubble" className="mono">0</span>
          </div>
        </summary>
        <div id="bars-bubble" className="bars" aria-label="バブルソートのバー表示"></div>
        <div className="legend">
          <span className="chip">
            <span className="box swap"></span>入れ替え/比較（赤）
          </span>
          {/* バブルソートはピボットを使わないため、表示しない */}
          <span className="chip">
            <span className="box sorted"></span>ソート完了
          </span>
        </div>
        <div className="footer"></div>
      </details>

      {/* 下段：クイックソート（折りたたみ） */}
      <details className="board" id="board-quick" open>
        <summary>
          <div className="summary-title">
            <span className="caret"></span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#cbd5ff' }}>クイックソート</h2>
          </div>
          <div className="summary-meta">
            ステップ: <span id="steps-quick" className="mono">0</span>
          </div>
        </summary>
        <div id="bars-quick" className="bars" aria-label="クイックソートのバー表示">
          {/* グループ分けの境界・範囲を示すオーバーレイ（動的に生成/更新） */}
          <div className="partition-overlay" id="partition-quick" aria-hidden="true">
            <div className="zone" id="zone-left"></div>
            <div className="zone" id="zone-right"></div>
            <div className="subrange" id="subrange-box"></div>
            <div className="boundary" id="boundary-line"></div>
            <div className="pivot-hline" id="pivot-hline"></div>
          </div>
        </div>
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
            <span className="box" style={{ background: 'var(--pivotLine)' }}></span>ピボット高（横線）
          </span>
          <span className="chip">
            <span className="box sorted"></span>ソート完了
          </span>
        </div>
        <div className="footer"></div>
      </details>
    </div>
  </div>
);

export default App;
