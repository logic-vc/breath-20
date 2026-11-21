/* ==========================================================================
   숨결 — tide.js
   아래에서 차오르는 물(가운데가 솟은 돔 + 잔잔한 물결) + 표정이 변하는 얼굴
   - 수위(lvl)와 숨 진행도(p)만 받아서 매 프레임 SVG 경로를 그린다.
   - 얼굴: 크고 길쭉한 타원 눈. 숨이 가득 찰수록 힘들어하고(눈 찡그림·입 굳음·떨림·땀),
           내쉬면 "후~" 하며 다시 편안한 웃음으로 돌아온다.
   - 호흡 화면(#tideSession)과 홈 미리보기(#tideHero)가 같은 코드를 쓴다.
   ========================================================================== */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#1B1F2A';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const make = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------------- 얼굴 ---------------- */
  function createFace(parent) {
    const g = make('g', {}, parent);               // 전체(위치·크기·떨림)
    const inner = make('g', {}, g);
    const eyeL = make('g', {}, inner), eyeR = make('g', {}, inner);
    [eyeL, eyeR].forEach((eye) => {
      make('ellipse', { cx: 0, cy: 0, rx: 7.6, ry: 13.5, fill: INK }, eye);
      make('circle', { cx: 2.6, cy: -5.5, r: 2.4, fill: '#fff', opacity: 0.85 }, eye); // 반짝이는 눈빛
    });
    const mouth = make('path', { fill: 'none', stroke: INK, 'stroke-width': 5.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, inner);
    const blow = make('ellipse', { cx: 60, cy: 53, rx: 6, ry: 7.5, fill: 'none', stroke: INK, 'stroke-width': 5.5 }, inner); // "후~"
    const sweat = make('path', { d: 'M104 4 q-7.5 10.5 0 16 q7.5 -5.5 0 -16z', fill: '#8DB8F5' }, inner);

    /** p: 0(편안)~1(가득), phase: 'inhale' | 'hold' | 'exhale' | ..., t: 초 */
    function update(p, phase, t) {
      const exhale = phase === 'exhale';
      const strain = smooth(0.45, 1, p);           // 힘든 정도
      // 눈: 힘들수록 좁아지고 안쪽이 처진다
      const sy = 1 - 0.4 * strain, sx = 1 + 0.12 * strain, rot = 10 * strain;
      eyeL.setAttribute('transform', `translate(38 25) rotate(${rot.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
      eyeR.setAttribute('transform', `translate(82 25) rotate(${(-rot).toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
      // 입: 웃음 → 일자 → 떨리는 입
      const s = p < 0.45 ? lerp(11, 1.5, p / 0.45) : lerp(1.5, -6, (p - 0.45) / 0.55);
      const w = lerp(60, 38, strain);
      const wob = 2.4 * smooth(0.75, 1, p);
      const N = 14; let d = '';
      for (let i = 0; i <= N; i++) {
        const u = (2 * i) / N - 1, x = 60 + (u * w) / 2;
        const y = 52 + s * (1 - u * u) + wob * Math.sin(u * Math.PI * 3 + t * 16) * (1 - u * u);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      mouth.setAttribute('d', d);
      // 내쉴 때: 동그란 입으로 "후~" 하다가 다시 웃는다
      const b = exhale ? smooth(0.26, 0.36, p) : 0; // 날숨 대부분은 "후~", 거의 다 내쉬면 웃는 입으로
      blow.setAttribute('opacity', b.toFixed(2));
      blow.setAttribute('ry', (7.5 + 2 * b).toFixed(1));
      mouth.setAttribute('opacity', (1 - b).toFixed(2));
      // 땀: 한계에 가까울수록 맺힌다
      const sw = smooth(0.7, 0.95, p) * (exhale ? 0.6 : 1);
      sweat.setAttribute('opacity', sw.toFixed(2));
      sweat.setAttribute('transform', `translate(0 ${(Math.sin(t * 3) * 1.2 + sw * 3).toFixed(1)})`);
      // 가득 찼을 때 얼굴이 가늘게 떨린다
      const shake = p > 0.88 && !exhale ? Math.sin(t * 70) * 0.9 : 0;
      inner.setAttribute('transform', `translate(${shake.toFixed(2)} 0)`);
    }
    return { g, update };
  }

  /* ---------------- 물 ---------------- */
  const instances = [];
  const body = document.body;

  function createTide(svg, cfg) {
    const back = make('path', { class: 'w2' }, svg);
    const front = make('path', { class: 'w1' }, svg);
    const face = createFace(svg);
    let W = 0, H = 0, t = 0, lvl = cfg.min, last = performance.now();

    const measure = () => {
      const r = svg.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    };
    new ResizeObserver(measure).observe(svg); measure();

    function draw(state, dt) {
      if (!W) return;
      const paused = body.classList.contains('paused');
      if (!paused) t += dt;
      lvl += (state.lvl - lvl) * (1 - Math.exp(-dt * (state.slow ? 1.6 : 14)));
      const yBase = H * (1 - lvl);
      const bulge = cfg.bulge(W, H);
      const n = Math.max(24, Math.round(W / 14));
      const k1 = (2 * Math.PI) / (W * 0.9), k2 = (2 * Math.PI) / (W * 0.55);
      let d1 = `M0 ${H + 2}`, d2 = d1, cy = yBase;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W, u = (x / W) * 2 - 1;
        const dome = yBase - bulge * (1 - u * u);
        const y1 = dome + cfg.amp * Math.sin(k1 * x + t * 1.1) + cfg.amp * 0.5 * Math.sin(k2 * x - t * 0.7);
        const y2 = dome - cfg.amp * 1.6 + cfg.amp * 1.1 * Math.sin(k1 * x * 1.2 - t * 0.8 + 1.7);
        d1 += `L${x.toFixed(1)} ${y1.toFixed(1)}`; d2 += `L${x.toFixed(1)} ${y2.toFixed(1)}`;
        if (i === Math.round(n / 2)) cy = y1;
      }
      d1 += `L${W} ${H + 2}Z`; d2 += `L${W} ${H + 2}Z`;
      front.setAttribute('d', d1); back.setAttribute('d', d2);
      svg.style.setProperty('--p', state.p.toFixed(3));
      // 얼굴: 돔의 꼭대기 바로 아래
      const fs = cfg.faceScale(W, H);
      face.g.setAttribute('transform', `translate(${(W / 2 - 60 * fs).toFixed(1)} ${(cy + cfg.faceTop * fs).toFixed(1)}) scale(${fs.toFixed(3)})`);
      face.update(state.p, state.phase, t);
    }
    return { svg, cfg, draw, get last() { return last; }, set last(v) { last = v; } };
  }

  /* 호흡 화면: 앱이 body에 심어 둔 --lvl / --p / data-phase를 읽는다 */
  function sessionState(inst, dt) {
    if (body.dataset.mode !== 'session') return null;
    const lv = parseFloat(body.style.getPropertyValue('--lvl'));
    const p = parseFloat(body.style.getPropertyValue('--p'));
    return { lvl: isNaN(lv) ? inst.cfg.min : lv, p: isNaN(p) ? 0 : p, phase: body.dataset.phase, slow: body.dataset.phase === 'prep' };
  }
  /* 홈 미리보기: 9초 주기로 혼자 숨 쉰다 */
  function heroState(inst, dt, now) {
    if (body.dataset.mode !== 'idle' || !inst.svg.getClientRects().length) return null;
    const ph = (now / 9000) * 2 * Math.PI, x = (1 - Math.cos(ph)) / 2;
    return { lvl: lerp(0.34, 0.62, x), p: x, phase: Math.sin(ph) > 0 ? 'inhale' : 'exhale' };
  }

  const sessionEl = document.getElementById('tideSession');
  const heroEl = document.getElementById('tideHero');
  if (sessionEl) instances.push({ inst: createTide(sessionEl, {
    min: 0.22, amp: 5, faceTop: 30,
    bulge: (W, H) => clamp(H * 0.075, 36, 84),
    faceScale: (W) => clamp(W * 0.34 / 120, 1.05, 1.5),
  }), state: sessionState });
  if (heroEl) instances.push({ inst: createTide(heroEl, {
    min: 0.34, amp: 2.6, faceTop: 26,
    bulge: () => 22,
    faceScale: () => 0.52,
  }), state: heroState });

  let prev = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - prev) / 1000, 0.1); prev = now;
    if (document.hidden) return;
    for (const it of instances) {
      const st = it.state(it.inst, dt, now);
      if (st) it.inst.draw(st, dt);
    }
  }
  requestAnimationFrame(loop);
  window.Tide = { instances };
})();
