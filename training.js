/* ==========================================================================
   숨결 — training.js
   마이크로 숨소리의 '세기'를 가늠해 하는 호흡 훈련 2종
     · 공 띄우기   (인센티브 스피로미터 스타일: 세게 → 공 1·2·3개)
     · 일정하게 마시기 (Coach 2 스타일: 목표 구간에서 세기를 유지)
   - 소리는 기기 안에서만 분석. 녹음/저장/전송 없음.
   - 실제 호흡량(mL)이 아니라, 숨소리 크기로 본 '상대적 세기'.
   - 마이크 없이도 체험 가능(화면을 길게 눌러 불기).
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 기록(최고 점수) ---------- */
  const KEY = 'sumgyeol.train.v1';
  let rec = {};
  try { rec = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { rec = {}; }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* noop */ } };

  const REPS = 5;
  const GAMES = {
    balls: { title: '공 띄우기', thresholds: [0.25, 0.5, 0.8], labels: ['약', '중', '강'], holdGoal: 2 },
    steady: { title: '일정하게 마시기', zone: [0.38, 0.62], holdGoal: 3 },
  };

  /* ---------- 마이크 입력 ---------- */
  const Mic = (() => {
    let ctx = null, stream = null, analyser = null, buf = null;
    return {
      async start() {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
        });
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        if (ctx.state === 'suspended') await ctx.resume();
        const src = ctx.createMediaStreamSource(stream);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180; // 낮은 웅웅거림 제거
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
        analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
        buf = new Float32Array(analyser.fftSize);
        src.connect(hp); hp.connect(lp); lp.connect(analyser); // 스피커로는 연결하지 않음(하울링 방지)
      },
      read() {
        analyser.getFloatTimeDomainData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        return 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-7);
      },
      stop() {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (ctx) ctx.close().catch(() => {});
        ctx = stream = analyser = null;
      },
      active: () => !!analyser,
    };
  })();

  /* ---------- DOM ---------- */
  const el = {
    menu: $('#trainMenu'), game: $('#trainGame'), area: $('#tubeArea'), title: $('#gameTitle'),
    msg: $('#gameMsg'), sub: $('#gameSub'), dots: $('#repDots'), start: $('#gameStart'),
    demo: $('#demoToggle'), meter: $('#meterFill'), pill: $('#micPill'), pillText: $('#micPillText'),
    back: $('#gameBack'), bestBalls: $('#bestBalls'), bestSteady: $('#bestSteady'),
  };

  /* ---------- 상태 ---------- */
  const G = {
    game: null, state: 'idle', demo: false, t: 0,
    dbS: -100, floor: -70, peak: -20, samples: [], calibrated: false,
    n: 0, demoN: 0, pressed: false,
    pos: [0, 0, 0], ballPos: 0,
    reps: [], rep: null, lowT: 0, highT: 0,
    raf: 0, last: 0,
  };

  function renderBest() {
    const b = rec.balls, s = rec.steady;
    el.bestBalls.textContent = b ? `최고 ⭐ ${b.bestStars}/${REPS} · 3개 유지 최장 ${b.bestHold.toFixed(1)}초` : '아직 기록이 없어요';
    el.bestSteady.textContent = s ? `최고 ⭐ ${s.bestStars}/${REPS} · 구간 유지 ${s.bestZone.toFixed(1)}초 · 안정도 ${s.bestPct}%` : '아직 기록이 없어요';
  }

  function buildTubes() {
    el.area.innerHTML = '';
    if (G.game === 'balls') {
      GAMES.balls.labels.forEach((lb) => {
        const c = document.createElement('div'); c.className = 'chamber';
        c.innerHTML = `<span class="tag">${lb}</span><span class="ball"></span>`;
        el.area.appendChild(c);
      });
    } else {
      const [lo, hi] = GAMES.steady.zone;
      const c = document.createElement('div'); c.className = 'chamber wide';
      const H = 260 - 78; // 공이 움직이는 높이
      const top = 8 + 54 / 2; // 공 중심 기준
      const zoneBottom = top + lo * H - 27, zoneH = (hi - lo) * H + 0;
      c.innerHTML = `<span class="tag">목표 구간</span><span class="zone" style="bottom:${zoneBottom + 0}px;height:${zoneH + 54}px"></span><span class="ball"></span>`;
      el.area.appendChild(c);
    }
    el.dots.innerHTML = Array.from({ length: REPS }, () => '<i></i>').join('');
  }

  function setMsg(m, s = '') { el.msg.textContent = m; el.sub.textContent = s; }
  function setPill(mode) {
    el.pill.classList.toggle('live', mode === 'live'); el.pill.classList.toggle('demo', mode === 'demo');
    el.pillText.textContent = mode === 'live' ? '마이크 듣는 중' : mode === 'demo' ? '체험 모드' : '대기';
  }
  function renderDots() {
    const d = el.dots.children;
    for (let i = 0; i < REPS; i++) {
      d[i].className = G.reps[i] ? (G.reps[i].star ? 'star' : 'done') : (i === G.reps.length && G.state === 'play' ? 'cur' : '');
    }
  }

  /* ---------- 흐름 ---------- */
  function openGame(game) {
    G.game = game; G.demo = false; G.state = 'idle'; G.reps = []; G.rep = null; G.calibrated = false;
    el.menu.hidden = true; el.game.hidden = false;
    el.title.textContent = GAMES[game].title;
    buildTubes(); renderDots(); setPill('off');
    setMsg(game === 'balls' ? '숨을 힘껏 쉬어 공 3개를 띄워요' : '초록 구간에 맞춰 숨을 일정하게',
      game === 'balls' ? '약 → 중 → 강 순서로 공이 떠올라요' : '너무 세지도 약하지도 않게, 3초 유지해요');
    el.start.textContent = '시작 (마이크 보정 6초)'; el.start.disabled = false;
    el.demo.hidden = false;
    G.last = performance.now(); cancelAnimationFrame(G.raf); G.raf = requestAnimationFrame(frame);
  }

  function closeGame() {
    cancelAnimationFrame(G.raf); Mic.stop();
    G.state = 'idle'; G.pressed = false; G.demoN = 0;
    el.game.hidden = true; el.menu.hidden = false; renderBest(); setPill('off');
  }

  async function begin(demo) {
    G.demo = demo; G.reps = []; G.rep = null; G.pos = [0, 0, 0]; G.ballPos = 0; renderDots();
    el.start.disabled = true; el.demo.hidden = true;
    if (demo) {
      setPill('demo'); G.calibrated = true; G.t = 0; G.state = 'ready';
      setMsg('준비!', '화면(공 영역)을 길게 눌러 숨을 불어 넣어요');
      return;
    }
    try {
      setMsg('마이크 연결 중…', '권한 요청이 뜨면 허용해 주세요');
      await Mic.start();
    } catch (e) {
      setPill('off'); el.start.disabled = false; el.demo.hidden = false; el.start.textContent = '다시 시도';
      setMsg('마이크를 쓸 수 없어요', '브라우저에서 마이크를 허용하거나, 아래 ‘마이크 없이 체험’을 써 보세요');
      return;
    }
    setPill('live'); G.samples = []; G.dbS = -100; G.t = 0; G.state = 'calib-quiet';
  }

  function startPlay() {
    G.state = 'play'; G.t = 0; G.rep = null; G.lowT = 0; G.highT = 0;
    el.start.textContent = '그만하기'; el.start.disabled = false;
    idleMsg(); renderDots();
  }
  function idleMsg() {
    setMsg(G.game === 'balls' ? `${G.reps.length + 1}번째 · 힘껏 쉬어 보세요` : `${G.reps.length + 1}번째 · 초록 구간에 맞춰 보세요`,
      `${G.reps.length} / ${REPS} 완료`);
  }

  /* ---------- 한 번의 호흡(rep) 판정 ---------- */
  function updateRep(dt) {
    const n = G.n, g = GAMES[G.game];
    if (!G.rep) {
      G.highT = n > 0.12 ? G.highT + dt : 0;
      if (G.highT > 0.15) { G.rep = { t: 0, hold: 0, peakBalls: 0, zone: 0, best: 0, run: 0, maxN: 0 }; G.lowT = 0; }
      return;
    }
    const r = G.rep; r.t += dt; r.maxN = Math.max(r.maxN, n);
    if (G.game === 'balls') {
      const up = g.thresholds.filter((t) => n > t).length;
      r.peakBalls = Math.max(r.peakBalls, up);
      if (n > g.thresholds[2]) { r.run += dt; r.hold = Math.max(r.hold, r.run); } else r.run = 0;
      setMsg(up === 3 ? '공 3개! 그대로 유지!' : up > 0 ? `공 ${up}개 · 더 힘껏!` : '더 힘껏!', `3개 유지 ${r.run.toFixed(1)} / ${g.holdGoal}초`);
    } else {
      const inZ = n >= g.zone[0] && n <= g.zone[1];
      if (inZ) { r.zone += dt; r.run += dt; r.best = Math.max(r.best, r.run); } else r.run = 0;
      setMsg(inZ ? '좋아요, 그대로!' : n < g.zone[0] ? '조금 더 세게' : '조금 약하게', `구간 유지 ${r.run.toFixed(1)} / ${g.holdGoal}초`);
    }
    G.lowT = n < 0.08 ? G.lowT + dt : 0;
    if (G.lowT > 0.6) finishRep();
  }

  function finishRep() {
    const r = G.rep; G.rep = null; G.highT = 0; G.lowT = 0;
    if (!r || r.t < 1.2) { idleMsg(); return; } // 짧은 잡음은 무시
    const g = GAMES[G.game];
    const res = G.game === 'balls'
      ? { star: r.hold >= g.holdGoal, hold: r.hold, peakBalls: r.peakBalls, t: r.t }
      : { star: r.best >= g.holdGoal, zone: r.best, pct: Math.round((r.zone / Math.max(r.t - 0.5, 0.5)) * 100), t: r.t };
    G.reps.push(res); renderDots();
    if (navigator.vibrate) navigator.vibrate(res.star ? [40, 60, 40] : 30);
    if (G.reps.length >= REPS) return finishGame();
    setMsg(res.star ? '⭐ 성공!' : '좋아요, 다시 한 번', '잠깐 쉬고 다음 호흡을 해 보세요');
    G.cool = 1.8;
  }

  function finishGame() {
    G.state = 'result';
    const stars = G.reps.filter((x) => x.star).length;
    if (G.game === 'balls') {
      const bestHold = Math.max(...G.reps.map((x) => x.hold));
      const cur = rec.balls || { bestStars: 0, bestHold: 0, plays: 0 };
      rec.balls = { bestStars: Math.max(cur.bestStars, stars), bestHold: Math.max(cur.bestHold, bestHold), plays: cur.plays + 1 };
      setMsg(`⭐ ${stars} / ${REPS}`, `3개 유지 최장 ${bestHold.toFixed(1)}초 · 공 3개 도달 ${G.reps.filter((x) => x.peakBalls === 3).length}회`);
    } else {
      const bestZone = Math.max(...G.reps.map((x) => x.zone));
      const avg = Math.round(G.reps.reduce((a, x) => a + x.pct, 0) / G.reps.length);
      const cur = rec.steady || { bestStars: 0, bestZone: 0, bestPct: 0, plays: 0 };
      rec.steady = { bestStars: Math.max(cur.bestStars, stars), bestZone: Math.max(cur.bestZone, bestZone), bestPct: Math.max(cur.bestPct, avg), plays: cur.plays + 1 };
      setMsg(`⭐ ${stars} / ${REPS}`, `구간 유지 최장 ${bestZone.toFixed(1)}초 · 평균 안정도 ${avg}%`);
    }
    persist(); Mic.stop(); setPill('off');
    el.start.textContent = '다시 하기'; el.start.disabled = false; el.demo.hidden = false;
  }

  /* ---------- 프레임 루프 ---------- */
  function frame(now) {
    G.raf = requestAnimationFrame(frame);
    const dt = Math.min((now - G.last) / 1000, 0.1); G.last = now;

    // 1) 입력 → 정규화 세기 n (0..1)
    let rawN = 0;
    if (G.demo) {
      G.demoN += ((G.pressed ? 1 : 0) - G.demoN) * (1 - Math.exp(-dt * (G.pressed ? 1.8 : 5))); // 불수록 서서히 차오름
      rawN = G.demoN;
    } else if (Mic.active()) {
      const db = Mic.read();
      G.dbS += (db - G.dbS) * (1 - Math.exp(-dt * (db > G.dbS ? 40 : 7)));
      if (G.state === 'calib-quiet' || G.state === 'calib-peak') {
        rawN = clamp((G.dbS + 75) / 50, 0, 1); // 보정 중에는 대략적인 소리 크기만 표시
      } else if (G.calibrated) {
        const lo = G.floor + 6, hi = Math.max(G.peak - 3, lo + 8);
        rawN = clamp((G.dbS - lo) / (hi - lo), 0, 1);
      }
    }
    G.n += (rawN - G.n) * (1 - Math.exp(-dt * 30));
    el.meter.style.width = `${(G.n * 100).toFixed(1)}%`;

    // 2) 상태
    G.t += dt;
    if (G.state === 'calib-quiet') {
      G.samples.push(G.dbS);
      const left = Math.max(0, 2 - G.t);
      setMsg('잠깐 조용히 해 주세요', `주변 소음을 재는 중… ${Math.ceil(left)}`);
      if (G.t >= 2) {
        const s = G.samples.slice().sort((a, b) => a - b); G.floor = s[Math.floor(s.length / 2)] || -70;
        G.peak = G.floor; G.t = 0; G.state = 'calib-peak';
      }
    } else if (G.state === 'calib-peak') {
      G.peak = Math.max(G.peak, G.dbS);
      const left = Math.max(0, 4 - G.t);
      setMsg('입으로 힘껏 들이쉬었다 내쉬어 보세요', `내 최대 세기를 재는 중… ${Math.ceil(left)}`);
      if (G.t >= 4) {
        if (G.peak - G.floor < 10) {
          Mic.stop(); setPill('off'); G.state = 'idle';
          el.start.textContent = '다시 보정'; el.start.disabled = false; el.demo.hidden = false;
          setMsg('소리가 너무 작아요', '마이크에 더 가까이, 입으로 숨을 쉬어 보세요. 안 되면 ‘마이크 없이 체험’을 써 보세요');
        } else { G.calibrated = true; G.t = 0; G.state = 'ready'; setMsg('좋아요!', '이제 시작해요'); }
      }
    } else if (G.state === 'ready') {
      if (G.t > 1.2) startPlay();
    } else if (G.state === 'play') {
      if (G.cool > 0) { G.cool -= dt; if (G.cool <= 0) idleMsg(); } else updateRep(dt);
    }

    // 3) 그리기
    const g = GAMES[G.game];
    if (G.game === 'balls') {
      const balls = el.area.querySelectorAll('.ball');
      balls.forEach((b, i) => {
        const target = G.state === 'calib-quiet' || G.state === 'calib-peak' ? 0 : (G.n > g.thresholds[i] ? 1 : 0);
        G.pos[i] += (target - G.pos[i]) * (1 - Math.exp(-dt * 9));
        b.style.setProperty('--y', G.pos[i].toFixed(3));
      });
    } else {
      G.ballPos += (G.n - G.ballPos) * (1 - Math.exp(-dt * 16));
      const ball = el.area.querySelector('.ball'); ball.style.setProperty('--y', G.ballPos.toFixed(3));
      const z = el.area.querySelector('.zone'); z.classList.toggle('hit', G.n >= g.zone[0] && G.n <= g.zone[1]);
    }
  }

  /* ---------- 이벤트 ---------- */
  $('#trainMenu').addEventListener('click', (e) => {
    const c = e.target.closest('.game-card'); if (c) openGame(c.dataset.game);
  });
  el.back.addEventListener('click', closeGame);
  el.start.addEventListener('click', () => {
    if (G.state === 'play') { Mic.stop(); G.state = 'idle'; setPill('off'); G.reps = []; renderDots(); el.start.textContent = '시작 (마이크 보정 6초)'; el.demo.hidden = false; setMsg('중단했어요', '언제든 다시 시작할 수 있어요'); return; }
    begin(false);
  });
  el.demo.addEventListener('click', () => { el.start.textContent = '체험 중'; begin(true); });
  const press = (v) => { G.pressed = v; };
  el.area.addEventListener('pointerdown', (e) => { if (G.demo) { e.preventDefault(); press(true); } });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.area.addEventListener(ev, () => press(false)));
  document.addEventListener('keydown', (e) => { if (G.demo && e.code === 'Space' && !el.game.hidden) { e.preventDefault(); press(true); } });
  document.addEventListener('keyup', (e) => { if (e.code === 'Space') press(false); });

  // 다른 탭으로 나가거나 앱이 가려지면 마이크를 즉시 끈다
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { if (t.dataset.view !== 'train' && !el.game.hidden) closeGame(); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && !el.game.hidden) closeGame(); });
  window.addEventListener('pagehide', () => Mic.stop());

  renderBest();
  window.__train = { G, Mic, openGame };
})();
