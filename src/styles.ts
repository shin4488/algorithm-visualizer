const styles = `
  :root{
    --bg:#0b1020;      /* 背景 */
    --panel:#121a33;   /* パネル */
    --accent:#7aa2f7;  /* メイン */
    --accent2:#9ece6a; /* 成功 */
    --text:#e5eaf5;    /* 本文 */
    --muted:#aab3d0;   /* 補助 */
    --danger:#f7768e;  /* スワップ/比較（赤） */
    --pivot:#ffd166;   /* ピボット（縦） */
    --pivotLine:#ffad5b; /* ピボット高の横ライン（オレンジ） */
    --cyan:#6df3ff;    /* 境界線 */
    --cyanSoft: rgba(109,243,255,.12); /* ゾーン着色 */
    --markL:#d58cff;   /* 左候補マークリング */
    --markR:#7affc6;   /* 右候補マークリング */
    --transMs:120ms;   /* 棒アニメの遷移時間（固定：1.00x相当） */
  }
  html,body{height:100%}
  body{
    margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
    background:linear-gradient(180deg, #0b1020 0%, #0b1020 40%, #0f1730 100%);
    color:var(--text);
  }
  .wrap{max-width:1100px; margin:24px auto; padding:0 16px;}
  h1{font-size:clamp(20px, 2.4vw, 28px); margin:0 0 12px; font-weight:700;}
  .sub{color:var(--muted); margin-bottom:18px;}

  .panel{ background:var(--panel); border:1px solid rgba(255,255,255,.06); border-radius:16px; padding:14px; box-shadow:0 10px 30px rgba(0,0,0,.25); }

  .toolbar{display:flex; flex-wrap:wrap; gap:12px; align-items:center}
  .toolbar .group{display:flex; align-items:center; gap:8px; padding:8px 0; background:#0c1530; border-radius:12px; border:1px solid rgba(255,255,255,.06)}
  label{font-size:12px; color:var(--muted)}
  input[type="range"]{
    background:#0f1b3a; color:var(--text); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:8px 0; outline:none; font-size:14px; accent-color: var(--accent);
  }
  /* stepper +/- buttons */
  .stepper{display:flex; align-items:center; gap:8px}
  .stepper .stepperBtn{ width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:linear-gradient(180deg,#1a2552 0%,#131d40 100%); color:#e6ebff; cursor:pointer; font-weight:700; line-height:1; }
  .stepper .stepperBtn:active{ transform:scale(.96) }
  .btn{ appearance:none; border:1px solid rgba(255,255,255,.12); color:var(--text); background:linear-gradient(180deg,#1a2552 0%,#131d40 100%); border-radius:12px; padding:10px 14px; font-weight:600; cursor:pointer; transition:transform .06s ease; }
  .btn:hover{ filter:brightness(1.06); }
  .btn:active{ transform:scale(.98); }
  .btn.primary{ background:linear-gradient(180deg,#2854ff 0%,#1d36a8 100%); border-color:#4062ff; }
  .btn.ghost{ background:transparent; }

  /* board as <details> */
  details.board{ margin-top:14px; padding:0; border-radius:14px; background:#0a1330; border:1px dashed rgba(255,255,255,.08)}
  details.board[open]{ box-shadow:0 10px 30px rgba(0,0,0,.25); }
  details.board > summary{
    list-style:none; cursor:pointer; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px;
  }
  details.board > summary::-webkit-details-marker{ display:none }
  .summary-title{ display:flex; align-items:center; gap:10px }
  .caret{ width:10px; height:10px; border-right:2px solid #99a7ff; border-bottom:2px solid #99a7ff; transform:rotate(45deg); transition: transform .15s ease }
  details.board[open] .caret{ transform:rotate(225deg) }
  .summary-meta{ color:#cbd5ff; font-size:12px }

  .bars{ position:relative; display:flex; align-items:flex-end; gap:4px; height:360px; padding:12px; overflow:visible;}
  .bar{ position:relative; flex:1 1 auto; background:linear-gradient(180deg, rgba(122,162,247,1) 0%, rgba(84,120,214,1) 100%);
    border-radius:10px 10px 0 0; transition: height var(--transMs,120ms) linear, transform var(--transMs,120ms) linear, background 120ms linear, box-shadow 120ms linear;
    box-shadow:0 4px 10px rgba(0,0,0,.25); z-index:1;
  }
  /* ラベル：棒の上端近くに大きめで表示（#なし） */
  .bar::after{ content: attr(data-label); position:absolute; left:0; right:0; top:6px; bottom:auto; text-align:center; font-size:15px; font-weight:700; color:#fff; pointer-events:none; text-shadow:0 1px 3px rgba(0,0,0,.6); }
  /* 比較中：赤い枠で強調（塗りはしない） */
  .bar.compare{ box-shadow:0 0 0 3px rgba(247,118,142,.9), 0 0 0 2px rgba(247,118,142,.9) inset, 0 6px 14px rgba(0,0,0,.25); filter:saturate(1.08); }
  /* スワップ中（濃い赤の塗り） */
  .bar.swap{ background:linear-gradient(180deg, var(--danger) 0%, #b83b57 100%); box-shadow:0 0 0 2px rgba(247,118,142,.45) inset, 0 8px 20px rgba(247,118,142,.25);}
  .bar.pivot{ background:linear-gradient(180deg, var(--pivot) 0%, #e4a300 100%); box-shadow:0 0 0 2px rgba(255,209,102,.5) inset, 0 8px 20px rgba(255,209,102,.25)}
  .bar.sorted{ background:linear-gradient(180deg, var(--accent2) 0%, #55b44a 100%); }
  /* 候補マーク（左/右）。比較赤枠やピボット色と視覚的に区別 */
  .bar.candL{ box-shadow:0 0 0 3px var(--markL), 0 0 0 2px var(--markL) inset, 0 8px 18px rgba(213,140,255,.25); filter:saturate(1.08); }
  .bar.candR{ box-shadow:0 0 0 3px var(--markR), 0 0 0 2px var(--markR) inset, 0 8px 18px rgba(122,255,198,.25); filter:saturate(1.08); }

  .legend{ display:flex; gap:10px; align-items:center; color:var(--muted); font-size:12px; margin:0 14px 8px }
  .chip{ display:inline-flex; align-items:center; gap:6px; background:#0f1b3a; border:1px solid rgba(255,255,255,.08); padding:6px 8px; border-radius:999px }
  .chip .box{ width:14px; height:14px; border-radius:3px }
  .chip .swap{ background:var(--danger) }
  .chip .pivot{ background:var(--pivot) }
  .chip .sorted{ background:var(--accent2) }
  .chip .boundary{ background:var(--cyan) }

  .footer{ display:flex; justify-content:flex-end; align-items:center; gap:12px; margin:0 14px 14px; font-size:12px; color:var(--muted)}
  .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace }

  /* クイックソート: グループ境界オーバーレイ */
  .partition-overlay{ position:absolute; inset:12px; pointer-events:none; z-index:20; }
  .partition-overlay .zone{ position:absolute; top:0; bottom:0; background:var(--cyanSoft); z-index:1; }
  .partition-overlay .boundary{ position:absolute; top:-1px; bottom:-1px; width:2px; background:var(--cyan); box-shadow:0 0 0 2px rgba(109,243,255,.28); z-index:21; }
  .partition-overlay .subrange{ position:absolute; top:0; bottom:0; border:2px solid var(--cyan); border-left:2px solid var(--cyan); border-radius:6px; border-top-left-radius:0; border-bottom-left-radius:0; background:transparent; box-sizing:border-box; z-index:2; }
  .partition-overlay .pivot-hline{ position:absolute; height:2px; background:var(--pivotLine); box-shadow: 0 0 0 2px rgba(255,173,91,.15); z-index:2; left:0; right:0; display:none; }
`;
export default styles;
