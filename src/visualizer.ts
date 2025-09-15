export function init(): void {
  // ======= 共通設定 =======
  const SWAP_TRANS_MS = 120; // 棒の入れ替え（高さ遷移）は常に一定速度
  const BASE_STEP_MS = 600;  // 1.00x のときのステップ間隔（←これが実効速度の基準）
  const MIN_TIMER_MS = 4;    // 線形比率を壊さないための下限（ブラウザの最小タイマーに合わせる）
  const SPEED_COEFF  = 0.7;  // 全体をスロー目に（線形）

  const el = {
    // controls
    size: document.getElementById('size') as HTMLInputElement,
    sizeVal: document.getElementById('sizeVal') as HTMLElement,
    speed: document.getElementById('speed') as HTMLInputElement,
    speedVal: document.getElementById('speedVal') as HTMLElement,
    start: document.getElementById('start') as HTMLButtonElement,
    pause: document.getElementById('pause') as HTMLButtonElement,
    shuffle: document.getElementById('shuffle') as HTMLButtonElement,
    // steppers
    sizeMinus: document.getElementById('sizeMinus') as HTMLButtonElement,
    sizePlus: document.getElementById('sizePlus') as HTMLButtonElement,
    speedMinus: document.getElementById('speedMinus') as HTMLButtonElement,
    speedPlus: document.getElementById('speedPlus') as HTMLButtonElement,
    // boards
    barsBubble: document.getElementById('bars-bubble') as HTMLElement,
    barsQuick: document.getElementById('bars-quick') as HTMLElement,
    stepsBubble: document.getElementById('steps-bubble') as HTMLElement,
    stepsQuick: document.getElementById('steps-quick') as HTMLElement,
    // quick overlay
    partition: document.getElementById('partition-quick') as HTMLElement,
    zoneLeft: document.getElementById('zone-left') as HTMLElement,
    zoneRight: document.getElementById('zone-right') as HTMLElement,
    boundary: document.getElementById('boundary-line') as HTMLElement,
    subrange: document.getElementById('subrange-box') as HTMLElement,
    pivotLine: document.getElementById('pivot-hline') as HTMLElement,
  };

  const Global: {
    base: number[];       // 共有の初期配列
    size: number;
    speed: number;
    playing: boolean;
    timerBubble: ReturnType<typeof setInterval> | null;
    timerQuick: ReturnType<typeof setInterval> | null;
  } = {
    base: [],
    size: 20,
    speed: 1.0,
    playing: false,
    timerBubble: null,
    timerQuick: null,
  };

  // ------ 乱数配列（1..n の置換） ------
  function genArray(n){
    const size = Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0);
    const arr = Array.from({length: size}, (_, i) => i + 1);
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function computeInterval(){
    // スライダー値 s を線形変換（比率厳密）
    const s = Math.min(parseFloat(el.speed.max)||10, Math.max(parseFloat(el.speed.min)||0.2, Global.speed));
    const effective = SPEED_COEFF * s; // y = kx
    const ms = Math.floor(BASE_STEP_MS / effective);
    return Math.max(MIN_TIMER_MS, ms);
  }
  function updateVisualSpeed(){
    // 棒の入れ替え（高さ遷移）は固定速度
    document.documentElement.style.setProperty('--transMs', SWAP_TRANS_MS + 'ms');
  }
  function rescheduleTimers(){
    const iv = computeInterval();
    if(Global.timerBubble){ clearInterval(Global.timerBubble); Global.timerBubble = setInterval(()=>tick(Bubble), iv); }
    if(Global.timerQuick){ clearInterval(Global.timerQuick); Global.timerQuick = setInterval(()=>tick(Quick), iv); }
    updateVisualSpeed();
  }

  // ======= ボードごとの状態 & ロジック =======
  function makeBoard(kind){
    return { kind, data: [], ids: [], steps: [], stepIndex: 0, pivotIndex: null, finished: false, range: null, boundaryIndex: null, pivotHeightPct: null };
  }
  const Bubble = makeBoard('bubble');
  const Quick  = makeBoard('quick');

  function buildBubbleSteps(arr){
    const a = arr.slice(); const steps = []; const n = a.length;
    for(let i=0;i<n-1;i++){
      for(let j=0;j<n-1-i;j++){
        steps.push({t:'compare', i:j, j:j+1});
        if(a[j] > a[j+1]){ [a[j], a[j+1]] = [a[j+1], a[j]]; steps.push({t:'swap', i:j, j:j+1}); }
      }
    }
    return steps;
  }

  // ===== ユーザー指定の二方向探索（右端ピボット）実装 =====
  function buildQuickSteps(arr){
    const a = arr.slice();
    const steps = [];

    const swap = (i,j)=>{ if(i===j) return; [a[i], a[j]] = [a[j], a[i]]; steps.push({t:'swap', i, j}); };
    const stack = [[0, a.length-1]];

    while(stack.length){
      const [lo, hi] = stack.pop();
      if(lo >= hi) continue;

      const pIdx = hi;                 // 1) ピボットは右端
      const pivotVal = a[pIdx];

      // 可視化
      steps.push({t:'range', lo, hi});
      steps.push({t:'pivot', i:pIdx});

      let i = lo;
      let j = hi - 1;                  // 右探索は pivot の1つ左から
      steps.push({t:'boundary', k:i, lo, hi, show:false}); // 左走査時は境界線を隠す

      // 両側探索（Hoare 風）
      while(true){
        // 左から：pivot 以下ならスルー（毎回比較表示）。境界線は非表示更新
        while(i <= j && a[i] <= pivotVal){
          steps.push({t:'compare', i:i, j:pIdx});
          i++;
        }
        // 候補（a[i] > pivot）に止まった位置も比較表示＆マークリング
        if(i <= j){
          steps.push({t:'compare', i:i, j:pIdx});
          steps.push({t:'markL', i:i});
          // 左候補が確定したら、右走査に入る前に境界線を非表示にする
          steps.push({t:'boundary', k:i, lo, hi, show:false});
        }

        // 右から：pivot 以上ならスルー（毎回比較表示）。このフェーズは境界線を表示してOK
        while(i <= j && a[j] >= pivotVal){
          steps.push({t:'compare', i:j, j:pIdx});
          j--;
        }
        if(i <= j){
          steps.push({t:'compare', i:j, j:pIdx});
          steps.push({t:'markR', i:j});
        }

        if(i >= j){ steps.push({t:'clearMarks'}); break; } // 交差/一致で終了

        // 候補を交換
        swap(i, j);
        steps.push({t:'clearMarks'});
        i++; j--;
        // スワップ直後は左側に余計な境界線を出さない
        steps.push({t:'boundary', k:i, lo, hi, show:false});
      }

      // i が hi+1 へ進んだケースをケア
      if(i > hi) i = hi;

      // ピボットを境界 i に配置
      swap(i, hi);
      steps.push({t:'pivot', i:i});
      // ピボット確定直後は「処理対象なし」のため、水色枠/境界は消す
      steps.push({t:'boundary', k:i, lo, hi, show:false});
      steps.push({t:'range', lo:null, hi:null});

      // 再帰領域
      stack.push([lo, i-1]);
      stack.push([i+1, hi]);
    }

    // 片付け
    steps.push({t:'pivot', i:null});
    steps.push({t:'range', lo:null, hi:null});
    return steps;
  }

  function renderBoard(board: any, barsEl: HTMLElement, stepsEl: HTMLElement){
    const max = Math.max(...board.data, 1);
    // Quick 側は overlay を保持するため、既存バーのみ削除
    if(barsEl !== el.barsQuick){ barsEl.innerHTML=''; }
    else{ Array.from(barsEl.querySelectorAll('.bar')).forEach((n: Element)=>n.remove()); }

    board.data.forEach((v, idx)=>{
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = (v/max*100) + '%';
      if(board.pivotIndex === idx) bar.classList.add('pivot');
      bar.dataset.index = idx;
      bar.setAttribute('data-label', String(board.ids[idx] ?? (idx+1)));
      barsEl.appendChild(bar);
    });
    stepsEl.textContent = String(board.steps.length);
  }

  function clearHighlights(barsEl: HTMLElement){ Array.from(barsEl.querySelectorAll('.bar')).forEach((c: Element)=>{ c.classList.remove('swap'); c.classList.remove('compare'); }); }
  function markSwap(barsEl: HTMLElement, i: number, j: number){ const bi = barsEl.querySelectorAll<HTMLElement>('.bar')[i]; const bj = barsEl.querySelectorAll<HTMLElement>('.bar')[j]; if(bi) bi.classList.add('swap'); if(bj) bj.classList.add('swap'); }
  function markCompare(barsEl: HTMLElement, i: number, j: number){ const bi = barsEl.querySelectorAll<HTMLElement>('.bar')[i]; const bj = barsEl.querySelectorAll<HTMLElement>('.bar')[j]; if(bi) bi.classList.add('compare'); if(bj) bj.classList.add('compare'); }
  function setPivot(board: any, barsEl: HTMLElement, idx: number | null){ board.pivotIndex = idx; Array.from(barsEl.querySelectorAll('.bar')).forEach((c: Element, i)=> c.classList.toggle('pivot', i === idx)); }
  function finishGlow(barsEl: HTMLElement){ Array.from(barsEl.querySelectorAll('.bar')).forEach((c: Element)=> c.classList.add('sorted')); }

  // --- Quick 用: 境界・横線の描画 ---
  function updateQuickOverlay(params?: {lo: number | null; hi: number | null; k?: number | null; show?: boolean | null}){
    const {lo, hi, k, show} = params || {};
    const n = Quick.data.length || 1;
    const leftPct  = (lo==null? 0 : (lo / n) * 100);
    const rightPct = (hi==null? 100 : ((hi+1) / n) * 100);
    const boundaryPct = (k==null? leftPct : (k / n) * 100);

    // サブレンジ枠
    el.subrange.style.left = leftPct + '%';
    el.subrange.style.right = (100 - rightPct) + '%';
    const showRange = !(lo==null || hi==null);
    el.subrange.style.display = showRange ? 'block' : 'none';

    // 左右ゾーン（範囲が無いときは非表示）
    el.zoneLeft.style.left = leftPct + '%';
    el.zoneLeft.style.right = (100 - boundaryPct) + '%';
    el.zoneLeft.style.display = showRange ? 'block' : 'none';

    el.zoneRight.style.left = boundaryPct + '%';
    el.zoneRight.style.right = (100 - rightPct) + '%';
    el.zoneRight.style.display = showRange ? 'block' : 'none';

    // 境界線（左走査フェーズでは非表示にできる）
    el.boundary.style.left = boundaryPct + '%';
    el.boundary.style.display = (showRange && show !== false) ? 'block' : 'none';

    // ピボット高の横線（範囲内いっぱいに引く）
    if(showRange && Quick.pivotIndex != null && Quick.pivotHeightPct != null){
      el.pivotLine.style.left = leftPct + '%';
      el.pivotLine.style.right = (100 - rightPct) + '%';
      el.pivotLine.style.bottom = Quick.pivotHeightPct + '%';
      el.pivotLine.style.display = 'block';
    }else{
      el.pivotLine.style.display = 'none';
    }
  }

  function applyStep(board: any, barsEl: HTMLElement, step: any){
    if(!step) return;
    clearHighlights(barsEl);

    if(step.t==='compare'){
      markCompare(barsEl, step.i, step.j);
    }
    else if(step.t==='swap'){
      const {i,j} = step;
      if(i < 0 || j < 0) return;
      const bars = barsEl.querySelectorAll<HTMLElement>('.bar');

      // 値/ラベルを入れ替え
      [board.data[i], board.data[j]] = [board.data[j], board.data[i]];
      [board.ids[i], board.ids[j]] = [board.ids[j], board.ids[i]];
      const max = Math.max(...board.data, 1);
      const bi = bars[i]; const bj = bars[j];
      if(bi){ bi.style.height = (board.data[i]/max*100)+'%'; bi.setAttribute('data-label', String(board.ids[i])); }
      if(bj){ bj.style.height = (board.data[j]/max*100)+'%'; bj.setAttribute('data-label', String(board.ids[j])); }

      // ピボットを含むスワップ → ピボット表示も追従
      if(board.kind==='quick' && board.pivotIndex != null){
        let newPivotIndex = board.pivotIndex;
        if(i === board.pivotIndex) newPivotIndex = j; else if(j === board.pivotIndex) newPivotIndex = i;
        if(newPivotIndex !== board.pivotIndex){ setPivot(board, barsEl, newPivotIndex); }
        const max2 = Math.max(...board.data, 1);
        Quick.pivotHeightPct = (board.data[board.pivotIndex] / max2) * 100;
        if(board.range){ updateQuickOverlay({lo: board.range.lo, hi: board.range.hi, k: board.boundaryIndex ?? board.range.lo, show:false}); }
      }

      // 演出
      if(bi) bi.classList.remove('candL','candR');
      if(bj) bj.classList.remove('candL','candR');
      markSwap(barsEl, i, j);
    }
    else if(step.t==='pivot'){
      setPivot(board, barsEl, step.i);
      if(board.kind==='quick'){
        if(step.i==null){ Quick.pivotHeightPct = null; }
        else{ const max = Math.max(...board.data,1); Quick.pivotHeightPct = (board.data[step.i] / max) * 100; }
        if(board.range){ updateQuickOverlay({lo: board.range.lo, hi: board.range.hi, k: board.boundaryIndex ?? board.range.lo, show:false}); }
      }
    }
    else if(step.t==='range' && board.kind==='quick'){
      if(step.lo==null || step.hi==null){
        board.range = null;
        board.boundaryIndex = null;
        updateQuickOverlay({lo:null, hi:null, k:null, show:false});
      }else{
        board.range = {lo: step.lo, hi: step.hi};
        board.boundaryIndex = step.lo; // 新しい処理対象の左端に境界をリセット
        // 新しいグループに入る瞬間は、前グループのピボット表示を一旦消す（横線も消す）
        setPivot(board, barsEl, null);
        Quick.pivotHeightPct = null;
        updateQuickOverlay({lo: step.lo, hi: step.hi, k: step.lo, show:true});
      }
    }
    else if(step.t==='boundary' && board.kind==='quick'){
      board.boundaryIndex = step.k;
      const lo = step.lo ?? (board.range?.lo ?? 0);
      const hi = step.hi ?? (board.range?.hi ?? (board.data.length-1));
      updateQuickOverlay({lo, hi, k: step.k, show: step.show});
    }
    else if(step.t==='markL' && board.kind==='quick'){
      const bar = barsEl.querySelectorAll<HTMLElement>('.bar')[step.i]; if(bar){ bar.classList.add('candL'); }
    }
    else if(step.t==='markR' && board.kind==='quick'){
      const bar = barsEl.querySelectorAll<HTMLElement>('.bar')[step.i]; if(bar){ bar.classList.add('candR'); }
    }
    else if(step.t==='clearMarks' && board.kind==='quick'){
      Array.from(barsEl.querySelectorAll('.bar')).forEach((b: Element)=> b.classList.remove('candL','candR'));
    }
  }

  function tick(board: any){
    const isBubble = board.kind==='bubble';
    const barsEl   = isBubble ? el.barsBubble : el.barsQuick;
    const stepsEl  = isBubble ? el.stepsBubble : el.stepsQuick;

    if(board.stepIndex >= board.steps.length){
      if(isBubble){ clearInterval(Global.timerBubble); Global.timerBubble = null; }
      else{ clearInterval(Global.timerQuick); Global.timerQuick = null; updateQuickOverlay({lo:null,hi:null,k:null}); }
      board.finished = true; finishGlow(barsEl);
      if(!Global.timerBubble && !Global.timerQuick){ Global.playing = false; el.start.disabled = false; el.pause.disabled = true; }
      return;
    }
    const step = board.steps[board.stepIndex++];
    applyStep(board, barsEl, step);
  }

  function play(){
    if(Global.playing) return; Global.playing = true;
    el.start.disabled = true; el.pause.disabled = false;

    if(Bubble.steps.length === 0){ Bubble.steps = buildBubbleSteps(Bubble.data); el.stepsBubble.textContent = String(Bubble.steps.length); }
    if(Quick .steps.length === 0){ Quick.steps  = buildQuickSteps (Quick .data); el.stepsQuick .textContent = String(Quick.steps.length ); }

    const iv = computeInterval();
    Global.timerBubble = setInterval(()=>tick(Bubble), iv);
    Global.timerQuick  = setInterval(()=>tick(Quick ), iv);
  }

  function pause(){
    if(!Global.playing) return;
    if(Global.timerBubble){ clearInterval(Global.timerBubble); Global.timerBubble=null; }
    if(Global.timerQuick ){ clearInterval(Global.timerQuick ); Global.timerQuick =null; }
    Global.playing = false; el.start.disabled = false; el.pause.disabled = true;
  }

  function resetBoards(){
    Bubble.data = Global.base.slice(); Quick.data = Global.base.slice();
    const n = Global.base.length;
    Bubble.ids = Array.from({length:n}, (_,i)=> i+1); Quick.ids = Array.from({length:n}, (_,i)=> i+1);
    Bubble.steps = []; Quick.steps = [];
    Bubble.stepIndex = 0; Quick.stepIndex = 0;
    Bubble.pivotIndex = null; Quick.pivotIndex = null;
    Bubble.finished = false; Quick.finished = false;
    Quick.range = null; Quick.boundaryIndex = null; Quick.pivotHeightPct = null;
    updateQuickOverlay({lo:null,hi:null,k:null});

    renderBoard(Bubble, el.barsBubble, el.stepsBubble);
    renderBoard(Quick , el.barsQuick , el.stepsQuick );
    Array.from(el.barsBubble.querySelectorAll('.bar')).forEach((c: Element)=> c.classList.remove('sorted'));
    Array.from(el.barsQuick .querySelectorAll('.bar')).forEach((c: Element)=> c.classList.remove('sorted','candL','candR'));
  }

  // ======= サニティテスト（コンソール出力のみ） =======
  function snapshotBoard(board){
    return { kind: board.kind, data: board.data.slice(), ids: board.ids.slice(), steps: board.steps.slice(), stepIndex: board.stepIndex, pivotIndex: board.pivotIndex, finished: board.finished };
  }
  function restoreBoard(board, snap){ Object.assign(board, { data: snap.data.slice(), ids: snap.ids.slice(), steps: snap.steps.slice(), stepIndex: snap.stepIndex, pivotIndex: snap.pivotIndex, finished: snap.finished }); }
  function simulate(arr, steps){ const a = arr.slice(); for(const s of steps){ if(s.t==='swap'){ const {i,j}=s; if(i>=0&&j>=0){ [a[i],a[j]]=[a[j],a[i]]; } } } return a; }
  function isSortedAsc(a){ for(let i=1;i<a.length;i++){ if(a[i-1]>a[i]) return false; } return true; }

  function runSanityTests(){
    const ok = (name: string, detail?: unknown)=>console.log('✅', name, detail ?? '');
    const ng = (name: string, detail?: unknown)=>console.warn('❌', name, detail ?? '');
    const globalSnap = { speed: Global.speed, slider: parseFloat(el.speed.value), label: el.speedVal.textContent || '' };

    // T0: isSortedAsc
    { const asc=[1,2,3,4,5], dsc=[5,4,3,2,1]; const okAsc=isSortedAsc(asc)===true, okDsc=isSortedAsc(dsc)===false; (okAsc&&okDsc)? ok('isSortedAsc basic') : ng('isSortedAsc basic', `${okAsc},${okDsc}`); }
    // T1: genArray/permutation
    { const n=20; const arr=genArray(n); const set=new Set(arr); (arr.length===n && set.size===n && Math.min(...arr)===1 && Math.max(...arr)===n) ? ok('genArray/permutation') : ng('genArray/permutation', JSON.stringify(arr)); }
    // T2: bubble correctness
    { const cases=[[3,1,2],[5,4,3,2,1],[2,1],[1,2,3,4],[4,2,5,1,3]]; let pass=true; for(const c of cases){ const st=buildBubbleSteps(c); const res=simulate(c,st); if(!isSortedAsc(res)){ pass=false; ng('bubble', `${c} -> ${res}`); break; } } if(pass) ok('bubble'); }
    // T3: quick correctness
    { const cases=[[3,1,2],[5,4,3,2,1],[2,1],[1,2,3,4],[4,2,5,1,3],[1,2,3,4,5],[5,4,3,2,1]]; let pass=true; for(const c of cases){ const st=buildQuickSteps(c); const res=simulate(c,st); if(!isSortedAsc(res)){ pass=false; ng('quick', `${c} -> ${res}`); break; } } if(pass) ok('quick'); }
    // T4: resetBoards count
    { const n=Global.size; resetBoards(); const b=el.barsBubble.querySelectorAll('.bar').length; const q=el.barsQuick.querySelectorAll('.bar').length; (b===n && q===n)? ok('resetBoards count') : ng('resetBoards count', `bubble=${b}, quick=${q}, n=${n}`); }
    // T5: interval monotonic
    { Global.speed=0.5; const i1=computeInterval(); Global.speed=2.0; const i2=computeInterval(); (i2<i1)? ok('interval monotonic') : ng('interval monotonic', `i1=${i1}, i2=${i2}`); }
    // T6: label swaps with values
    { const snap=snapshotBoard(Bubble); Bubble.data=[3,1,2]; Bubble.ids=[1,2,3]; renderBoard(Bubble, el.barsBubble, el.stepsBubble); applyStep(Bubble, el.barsBubble, {t:'swap', i:0, j:1}); const l0=el.barsBubble.querySelectorAll('.bar')[0].getAttribute('data-label'); const l1=el.barsBubble.querySelectorAll('.bar')[1].getAttribute('data-label'); (l0==='2'&&l1==='1')? ok('label swap') : ng('label swap', `l0=${l0}, l1=${l1}`); restoreBoard(Bubble, snap); renderBoard(Bubble, el.barsBubble, el.stepsBubble); }
    // T7: interval min bound
    { Global.speed=999; (computeInterval()>=MIN_TIMER_MS)? ok('interval min bound') : ng('interval min bound', `${computeInterval()}`); }
    // T8: fixed transition speed
    { const before=getComputedStyle(document.documentElement).getPropertyValue('--transMs').trim(); Global.speed=0.2; rescheduleTimers(); const after1=getComputedStyle(document.documentElement).getPropertyValue('--transMs').trim(); Global.speed=10.0; rescheduleTimers(); const after2=getComputedStyle(document.documentElement).getPropertyValue('--transMs').trim(); (before===after1 && after1===after2)? ok('fixed transition speed') : ng('fixed transition speed', `before=${before}, after1=${after1}, after2=${after2}`); }
    // T9: details open by default
    { const d1=document.getElementById('board-bubble') as HTMLDetailsElement; const d2=document.getElementById('board-quick') as HTMLDetailsElement; (d1.open && d2.open)? ok('details open by default') : ng('details open by default', `bubble=${d1.open}, quick=${d2.open}`); }
    // T10: speed restored after tests
    { Global.speed = globalSnap.speed; el.speed.value = String(globalSnap.slider); el.speedVal.textContent = String(globalSnap.label); const after = computeInterval(); (parseFloat(el.speed.value)===globalSnap.speed && el.speedVal.textContent===globalSnap.label && after===computeInterval()) ? ok('speed restored after tests') : ng('speed restored after tests', `speed=${Global.speed}, label=${el.speedVal.textContent}`); }
    // T11: quick has range/boundary
    { const st=buildQuickSteps([3,2,1]); const hasRange=st.some(s=>s.t==='range'); const hasBoundary=st.some(s=>s.t==='boundary'); (hasRange&&hasBoundary)? ok('quick has range/boundary') : ng('quick has range/boundary', JSON.stringify(st.slice(0,6))); }
    // T12: overlay style updated
    { updateQuickOverlay({lo:1,hi:3,k:2}); const bLeft=el.boundary.style.left; (bLeft && bLeft.endsWith('%'))? ok('overlay style updated') : ng('overlay style updated', `left=${bLeft}`); updateQuickOverlay({lo:null,hi:null,k:null}); }
    // T13: quick compare two bars
    { const snap=snapshotBoard(Quick); Quick.data=[3,1,2]; Quick.ids=[1,2,3]; renderBoard(Quick, el.barsQuick, el.stepsQuick); applyStep(Quick, el.barsQuick, {t:'compare', i:0, j:2}); const bars=el.barsQuick.querySelectorAll('.bar'); const ok1=bars[0].classList.contains('compare'); const ok2=bars[2].classList.contains('compare'); (ok1 && ok2)? ok('quick compare two bars') : ng('quick compare two bars', `${ok1},${ok2}`); restoreBoard(Quick, snap); renderBoard(Quick, el.barsQuick, el.stepsQuick); }
    // T14: subrange visible
    { updateQuickOverlay({lo:0,hi:2,k:1}); const disp=el.subrange.style.display; (disp==='block')? ok('subrange visible') : ng('subrange visible', disp); updateQuickOverlay({lo:null,hi:null,k:null}); }
    // T15: pivot line visible
    { const snap=snapshotBoard(Quick); Quick.data=[3,1,4,2]; Quick.ids=[1,2,3,4]; renderBoard(Quick, el.barsQuick, el.stepsQuick); Quick.range={lo:0,hi:3}; applyStep(Quick, el.barsQuick, {t:'pivot', i:3}); updateQuickOverlay({lo:0,hi:3,k:0}); const disp=el.pivotLine.style.display; (disp==='block')? ok('pivot line visible') : ng('pivot line visible', disp||''); restoreBoard(Quick, snap); renderBoard(Quick, el.barsQuick, el.stepsQuick); updateQuickOverlay({lo:null,hi:null,k:null}); }
    // T16: quick swap indices in-bounds
    { const c=[5,1,4,2,3]; const st=buildQuickSteps(c); const bad=st.filter(s=> s.t==='swap' && (s.i<0 || s.j<0 || s.i>=c.length || s.j>=c.length)); (!bad.length)? ok('quick swap indices in-bounds') : ng('quick swap indices in-bounds', JSON.stringify(bad.slice(0,3))); }
    // T17: quick edge sorted/desc
    { let pass=true; for(const c of [[1,2,3,4,5],[5,4,3,2,1]]){ const st=buildQuickSteps(c); const res=simulate(c,st); if(!isSortedAsc(res)){ pass=false; ng('quick edge', `${c} -> ${res}`); break; } } if(pass) ok('quick edge'); }
    // T18: genArray slider limits
    { const a=genArray(5); const b=genArray(50); (a.length===5 && b.length===50)? ok('genArray slider limits') : ng('genArray slider limits', `${a.length},${b.length}`); }
    // T19: candidate marks present
    { const st=buildQuickSteps([2,5,1,4,3]); const hasL=st.some(s=>s.t==='markL'); const hasR=st.some(s=>s.t==='markR'); (hasL&&hasR)? ok('candidate marks present') : ng('candidate marks present', JSON.stringify(st.filter(s => (s.t==='markL' || s.t==='markR')))); }
    // T20: boundary hidden in left scan
    { const st=buildQuickSteps([2,3,1]); const hidden=st.some(s=>s.t==='boundary' && s.show===false); (hidden)? ok('boundary hidden in left scan') : ng('boundary hidden in left scan', JSON.stringify(st.slice(0,10))); }
    // T21: boundary hidden after markL
    { const st=buildQuickSteps([1,3,2,4]); const idxL=st.findIndex(s=>s.t==='markL'); let okFlag=false; if(idxL>=0){ for(let u=idxL+1; u<st.length; u++){ if(st[u].t==='boundary' && st[u].show===false){ okFlag=true; break; } if(st[u].t==='markR' || st[u].t==='swap') break; } } okFlag? ok('boundary hidden after markL') : ng('boundary hidden after markL'); }
    // T22: boundary hidden after swap
    try{
      const snap=snapshotBoard(Quick);
      Quick.data=[3,2,1,4]; Quick.ids=[1,2,3,4]; renderBoard(Quick, el.barsQuick, el.stepsQuick);
      Quick.range={lo:0,hi:3}; Quick.boundaryIndex=1; updateQuickOverlay({lo:0,hi:3,k:1,show:false});
      applyStep(Quick, el.barsQuick, {t:'swap', i:0, j:2});
      const dispAfterSwap = el.boundary.style.display;
      (dispAfterSwap!== 'block') ? ok('boundary hidden after swap') : ng('boundary hidden after swap', dispAfterSwap||'');
      restoreBoard(Quick, snap); renderBoard(Quick, el.barsQuick, el.stepsQuick); updateQuickOverlay({lo:null,hi:null,k:null});
    }catch(e){ ng('boundary hidden after swap (exception)', String(e)); }
    // T23: boundary resets to lo on new range (extra test)
    try{
      const n=10; Quick.data = Array.from({length:n}, (_,i)=>i+1); Quick.ids = Array.from({length:n}, (_,i)=>i+1);
      renderBoard(Quick, el.barsQuick, el.stepsQuick);
      Quick.range=null; Quick.boundaryIndex=7;
      applyStep(Quick, el.barsQuick, {t:'range', lo:2, hi:6});
      const pass = (Quick.boundaryIndex===2);
      pass? ok('boundary resets to lo on new range') : ng('boundary resets to lo on new range', Quick.boundaryIndex);
      updateQuickOverlay({lo:null,hi:null,k:null});
    }catch(e){ ng('boundary resets to lo on new range (exception)', String(e)); }
    // T28: speed slider max 10x
    { const mx=parseFloat(el.speed.max); (mx>=10)? ok('speed slider max 10x') : ng('speed slider max 10x', `max=${mx}`); }
    // T29: size slider max 50
    { const mx=parseInt(el.size.max,10); (mx>=50)? ok('size slider max 50') : ng('size slider max 50', `max=${mx}`); }
    // T30: size slider reaches 50
    try{
      const prev = Global.size;
      el.size.value = '50'; el.size.dispatchEvent(new Event('input', {bubbles:true}));
      const barsNow = el.barsBubble.querySelectorAll('.bar').length; const labelNow = (el.sizeVal.textContent || '').trim();
      (barsNow===50 && labelNow==='50') ? ok('size slider reaches 50') : ng('size slider reaches 50', `bars=${barsNow}, label=${labelNow}`);
      el.size.value = String(prev); el.size.dispatchEvent(new Event('input', {bubbles:true}));
    }catch(e){ ng('size slider reaches 50 (exception)', String(e)); }
    // T31: linear 5x vs 2.5x
    { const eps=1; const keep=Global.speed; Global.speed=2.5; const i25=computeInterval(); Global.speed=5.0; const i5=computeInterval(); Global.speed=keep; (Math.abs(i5*2 - i25)<=eps)? ok('linearity 5x vs 2.5x') : ng('linearity 5x vs 2.5x', `i5=${i5}, i25=${i25}`); }
    // T32: linear 2x vs 1x
    { const eps=1; const keep=Global.speed; Global.speed=1.0; const i1=computeInterval(); Global.speed=2.0; const i2=computeInterval(); Global.speed=keep; (Math.abs(i2*2 - i1)<=eps)? ok('linearity 2x vs 1x') : ng('linearity 2x vs 1x', `i1=${i1}, i2=${i2}`); }
    // T33: linear 3x vs 1.5x
    { const eps=1; const keep=Global.speed; Global.speed=1.5; const i15=computeInterval(); Global.speed=3.0; const i3=computeInterval(); Global.speed=keep; (Math.abs(i3*2 - i15)<=eps)? ok('linearity 3x vs 1.5x') : ng('linearity 3x vs 1.5x', `i15=${i15}, i3=${i3}`); }
    // T34: linear 3x vs 1x
    { const eps=1; const keep=Global.speed; Global.speed=1.0; const i1=computeInterval(); Global.speed=3.0; const i3=computeInterval(); Global.speed=keep; (Math.abs(i3*3 - i1)<=eps)? ok('linearity 3x vs 1x') : ng('linearity 3x vs 1x', `i1=${i1}, i3=${i3}`); }
    // T35: linear 10x vs 5x
    { const eps=1; const keep=Global.speed; Global.speed=5.0; const i5=computeInterval(); Global.speed=10.0; const i10=computeInterval(); Global.speed=keep; (Math.abs(i10*2 - i5)<=eps)? ok('linearity 10x vs 5x') : ng('linearity 10x vs 5x', `i10=${i10}, i5=${i5}`); }
  }

  // ======= イベント =======
  function adjustByStep(inputEl: HTMLInputElement, dir: number){
    const min = parseFloat(inputEl.min); const max = parseFloat(inputEl.max); const step = parseFloat(inputEl.step || '1');
    const cur = parseFloat(inputEl.value);
    let next = cur + dir*step;
    next = Math.min(max, Math.max(min, next));
    const decimals = (String(step).split('.')[1]||'').length;
    inputEl.value = next.toFixed(decimals);
    inputEl.dispatchEvent(new Event('input', {bubbles:true}));
  }

  el.size.addEventListener('input', (e)=>{
    const n = parseInt((e.target as HTMLInputElement).value, 10);
    el.sizeVal.textContent = String(n);
    Global.size = n;
    Global.base = genArray(n);
    pause();
    resetBoards();
  });
  // steppers for size
  el.sizeMinus.addEventListener('click', ()=> adjustByStep(el.size, -1));
  el.sizePlus .addEventListener('click', ()=> adjustByStep(el.size, +1));

  el.speed.addEventListener('input', (e)=>{
    const sp = parseFloat((e.target as HTMLInputElement).value);
    Global.speed = sp; el.speedVal.textContent = sp.toFixed(2) + 'x';
    if(Global.playing) rescheduleTimers(); else updateVisualSpeed();
  });
  // steppers for speed
  el.speedMinus.addEventListener('click', ()=> adjustByStep(el.speed, -1));
  el.speedPlus .addEventListener('click', ()=> adjustByStep(el.speed, +1));

  el.shuffle.addEventListener('click', ()=>{
    Global.base = genArray(Global.size);
    pause();
    resetBoards();
  });

  el.start.addEventListener('click', play);
  el.pause.addEventListener('click', pause);

  // ======= 初期化 =======
  (function initPage(){
    Global.size = parseInt(el.size.value, 10);
    Global.speed = parseFloat(el.speed.value);
    el.speedVal.textContent = Global.speed.toFixed(2) + 'x';
    updateVisualSpeed();

    Global.base = genArray(Global.size);
    resetBoards();

    // 起動時テスト
    try{ runSanityTests(); }catch(e){ console.warn('sanity tests error', e); }
  })();
}
