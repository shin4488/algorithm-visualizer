async function run() {
  const [bubbleMod, quickMod, helperMod, speedMod] = await Promise.all([
    import("../src/algorithms/bubbleSort.js"),
    import("../src/algorithms/quickSort.js"),
    import("./helpers.js"),
    import("../src/speed.js"),
  ]);
  const { buildBubbleSteps } = bubbleMod as any;
  const { buildQuickSteps } = quickMod as any;
  const { simulate, isSortedAsc } = helperMod as any;
  const { computeInterval } = speedMod as any;

  function assert(condition: boolean, name: string, detail?: string) {
    if (!condition) {
      const msg = detail ? `${name}: ${detail}` : name;
      throw new Error(msg);
    }
  }

  function testBubble() {
    const cases = [
      [3, 1, 2],
      [5, 4, 3, 2, 1],
      [2, 1],
      [1, 2, 3, 4],
      [4, 2, 5, 1, 3],
    ];
    for (const c of cases) {
      const st = buildBubbleSteps(c);
      const res = simulate(c, st);
      assert(isSortedAsc(res), "bubble sort failed", `${c} -> ${res}`);
    }
  }

  function testQuick() {
    const cases = [
      [3, 1, 2],
      [5, 4, 3, 2, 1],
      [2, 1],
      [1, 2, 3, 4],
      [4, 2, 5, 1, 3],
      [1, 2, 3, 4, 5],
      [5, 4, 3, 2, 1],
    ];
    for (const c of cases) {
      const st = buildQuickSteps(c);
      const res = simulate(c, st);
      assert(isSortedAsc(res), "quick sort failed", `${c} -> ${res}`);
    }
    const st = buildQuickSteps([3, 2, 1]);
    const pivotStep = st.find((s: any) => s.t === "pivot");
    assert(pivotStep?.i === 2, "pivot not rightmost");
    const st2 = buildQuickSteps([2, 5, 1, 4, 3]);
    assert(
      st2.some((s: any) => s.t === "markL"),
      "markL missing",
    );
    assert(
      st2.some((s: any) => s.t === "markR"),
      "markR missing",
    );
    const st3 = buildQuickSteps([1, 3, 2, 4]);
    const idxL = st3.findIndex((s: any) => s.t === "markL");
    if (idxL >= 0) {
      let ok = false;
      for (let u = idxL + 1; u < st3.length; u++) {
        const s: any = st3[u];
        if (s.t === "boundary") {
          if (s.show === false) ok = true;
          break;
        }
      }
      assert(ok, "boundary not hidden after markL");
    }
  }

  function testInterval() {
    const i1 = computeInterval(0.5);
    const i2 = computeInterval(2.0);
    assert(i2 < i1, "interval monotonic");
    assert(computeInterval(999) >= 4, "interval min bound");
    const eps = 1;
    const i25 = computeInterval(2.5);
    const i5 = computeInterval(5.0);
    assert(Math.abs(i5 - i25 / 2) <= eps, "linearity 5x vs 2.5x");
  }

  testBubble();
  testQuick();
  testInterval();
  console.log("all tests passed");
}

run();
