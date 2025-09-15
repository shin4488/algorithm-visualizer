const markup = `
  <div class="wrap">
    <h1>アルゴリズム可視化 <span class="sub">— バブルソート & クイックソート（同時比較・折りたたみ可）</span></h1>
    <div class="panel">
      <div class="toolbar">
        <div class="group">
          <label for="size">本数: <span id="sizeVal" class="mono">20</span></label>
          <div class="stepper">
            <button id="sizeMinus" class="stepperBtn" aria-label="本数を1減らす">−</button>
            <input id="size" type="range" min="5" max="50" step="1" value="20" />
            <button id="sizePlus" class="stepperBtn" aria-label="本数を1増やす">＋</button>
          </div>
        </div>
        <div class="group">
          <label for="speed">アニメ速度: <span id="speedVal" class="mono">1.00x</span></label>
          <!-- 左ほど遅く / 右ほど速く。0.20x〜10.00x（棒の入れ替え速度は固定） -->
          <div class="stepper">
            <button id="speedMinus" class="stepperBtn" aria-label="速度を一段階遅く">−</button>
            <input id="speed" type="range" min="0.2" max="10" step="0.05" value="1" />
            <button id="speedPlus" class="stepperBtn" aria-label="速度を一段階速く">＋</button>
          </div>
        </div>
        <!-- ボタン順：Start, Pause, Shuffle（リセット位置に移動） -->
        <button id="start" class="btn primary">▶ 再生</button>
        <button id="pause" class="btn ghost" disabled>⏸ 一時停止</button>
        <button id="shuffle" class="btn">シャッフル</button>
      </div>

      <!-- 上段：バブルソート（折りたたみ） -->
      <details class="board" id="board-bubble" open>
        <summary>
          <div class="summary-title"><span class="caret"></span><h2 style="margin:0; font-size:16px; color:#cbd5ff">バブルソート</h2></div>
          <div class="summary-meta">ステップ: <span id="steps-bubble" class="mono">0</span></div>
        </summary>
        <div id="bars-bubble" class="bars" aria-label="バブルソートのバー表示"></div>
        <div class="legend">
          <span class="chip"><span class="box swap"></span>入れ替え/比較（赤）</span>
          <!-- バブルソートはピボットを使わないため、表示しない -->
          <span class="chip"><span class="box sorted"></span>ソート完了</span>
        </div>
        <div class="footer"></div>
      </details>

      <!-- 下段：クイックソート（折りたたみ） -->
      <details class="board" id="board-quick" open>
        <summary>
          <div class="summary-title"><span class="caret"></span><h2 style="margin:0; font-size:16px; color:#cbd5ff">クイックソート</h2></div>
          <div class="summary-meta">ステップ: <span id="steps-quick" class="mono">0</span></div>
        </summary>
        <div id="bars-quick" class="bars" aria-label="クイックソートのバー表示">
          <!-- グループ分けの境界・範囲を示すオーバーレイ（動的に生成/更新） -->
          <div class="partition-overlay" id="partition-quick" aria-hidden="true">
            <div class="zone" id="zone-left"></div>
            <div class="zone" id="zone-right"></div>
            <div class="subrange" id="subrange-box"></div>
            <div class="boundary" id="boundary-line"></div>
            <div class="pivot-hline" id="pivot-hline"></div>
          </div>
        </div>
        <div class="legend">
          <span class="chip"><span class="box swap"></span>入れ替え/比較（赤）</span>
          <span class="chip"><span class="box pivot"></span>ピボット</span>
          <span class="chip"><span class="box boundary"></span>境界（グループ分け）</span>
          <span class="chip"><span class="box" style="background:var(--pivotLine)"></span>ピボット高（横線）</span>
          <span class="chip"><span class="box sorted"></span>ソート完了</span>
        </div>
        <div class="footer"></div>
      </details>

    </div>
  </div>
`;
export default markup;
