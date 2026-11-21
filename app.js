/* ==========================================================================
   숨결 — app.js
   Breath engine · Generative soundscape · Particle field · Records · UI
   No dependencies. Works from file:// and as an installable PWA.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (x) => (1 - Math.cos(Math.PI * clamp(x, 0, 1))) / 2; // 부드러운 가감속
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------
     상수
     ------------------------------------------------------------------ */
  const RHYTHMS = [
    { id: 'r1', name: '입문', inhale: 6,  hold: 2, exhale: 6 },
    { id: 'r2', name: '기본', inhale: 10, hold: 2, exhale: 10 },
    { id: 'r3', name: '심화', inhale: 15, hold: 3, exhale: 15 },
    { id: 'r4', name: '목표', inhale: 20, hold: 3, exhale: 20 },
  ];
  const CYCLE_OPTIONS = [1, 3, 5, 10];
  const MOODS = [
    { label: '긴장', c: '#FF9A4D', k: 0.72 },
    { label: '불안', c: '#F8B97F', k: 0.8 },
    { label: '보통', c: '#C9C9DC', k: 0.88 },
    { label: '편안', c: '#A4C6F2', k: 0.94 },
    { label: '평온', c: '#86B6F3', k: 1.0 },
  ];
  const PHASE_LABEL = { inhale: '들이쉬기', hold: '멈추기', exhale: '내쉬기' };
  const LEVEL_UP_AFTER = 3;
  const STORE_KEY = 'sumgyeol.v1';
  const LEGACY_KEY = 'breathingExerciseHistory';
  const MIN_SCALE = 0.5;

  const rhythmById = (id) => RHYTHMS.find((r) => r.id === id) || RHYTHMS[3];
  const cycleLen = (r) => r.inhale + r.hold + r.exhale;
  const rhythmLabel = (r) => `${r.inhale}·${r.hold}·${r.exhale}`;

  /* ------------------------------------------------------------------
     날짜 (로컬 기준 — v1의 UTC 버그 수정)
     ------------------------------------------------------------------ */
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
  const fmtDate = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`;
  const fmtDuration = (sec) => {
    sec = Math.round(sec);
    const m = Math.floor(sec / 60), s = sec % 60;
    if (m === 0) return `${s}초`;
    return s ? `${m}분 ${s}초` : `${m}분`;
  };
  const fmtClock = (sec) => { sec = Math.round(sec); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; };

  /* ------------------------------------------------------------------
     저장소
     ------------------------------------------------------------------ */
  const DEFAULTS = {
    version: 1,
    onboarded: false,
    days: {},
    settings: { volume: 60, chime: true, haptics: true, checkin: true, wakeLock: true, sound: true, rhythm: 'r4', cycles: 3 },
  };

  function loadStore() {
    const base = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, days: d.days || {} };
      }
    } catch (e) { /* 손상된 데이터는 무시 */ }
    // v1 기록 자동 이전
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy && typeof legacy === 'object') {
        for (const [k, v] of Object.entries(legacy)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && v.count > 0) {
            base.days[k] = { count: v.count, seconds: v.count * 43, sessions: [] };
          }
        }
      }
    } catch (e) { /* noop */ }
    return base;
  }

  const store = loadStore();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
    catch (e) { toast('저장 공간이 부족해 기록을 저장하지 못했어요'); }
  }

  const Records = {
    day(k) { return store.days[k]; },
    todayCount() { return (store.days[dateKey()] || {}).count || 0; },
    streak() {
      let d = new Date(); let n = 0;
      const has = (x) => (store.days[dateKey(x)] || {}).count > 0;
      if (!has(d)) d = addDays(d, -1);
      while (has(d)) { n++; d = addDays(d, -1); }
      return n;
    },
    totals() {
      let seconds = 0, count = 0, deltas = [];
      for (const v of Object.values(store.days)) {
        seconds += v.seconds || 0; count += v.count || 0;
        for (const s of v.sessions || []) {
          if (s.before != null && s.after != null) deltas.push(s.after - s.before);
        }
      }
      const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
      return { seconds, count, avgDelta, checkins: deltas.length };
    },
    fullSessionsByRhythm() {
      const m = Object.fromEntries(RHYTHMS.map((r) => [r.id, 0]));
      for (const v of Object.values(store.days)) {
        for (const s of v.sessions || []) if (s.done >= s.planned && m[s.r] != null) m[s.r]++;
      }
      return m;
    },
    add(session) {
      const k = dateKey(new Date(session.at));
      const day = store.days[k] || (store.days[k] = { count: 0, seconds: 0, sessions: [] });
      day.count += session.done;
      day.seconds += session.secs;
      day.sessions = day.sessions || [];
      day.sessions.push(session);
      save();
      return session;
    },
  };

  /* ------------------------------------------------------------------
     사운드: 호흡과 함께 숨 쉬는 생성형 앰비언트 (파일 없이 코드로 합성)
     ------------------------------------------------------------------ */
  const Sound = (() => {
    let ctx = null, master = null, reverb = null, voice = null, muted = false;
    const AC = window.AudioContext || window.webkitAudioContext;

    function ensure() {
      if (!AC) return false;
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 3;
        master.connect(comp).connect(ctx.destination);

        reverb = ctx.createConvolver();
        reverb.buffer = impulse(4.2, 2.6);
        const wet = ctx.createGain(); wet.gain.value = 0.55;
        reverb.connect(wet).connect(master);
      }
      if (ctx.state === 'suspended') ctx.resume();
      applyVolume(0.05);
      return true;
    }

    function impulse(seconds, decay) {
      const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
      const buf = ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function level() {
      if (muted) return 0;
      const v = store.settings.volume / 100;
      return v * v * 0.9; // 지각적으로 자연스러운 볼륨 커브
    }
    function applyVolume(t = 0.15) {
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(level(), ctx.currentTime, t);
    }

    // A 장조 add9 계열의 열린 화음 — 긴장 없이 떠 있는 느낌
    const PAD_NOTES = [
      { f: 55.0,   g: 0.10, type: 'sine' },     // A1 서브
      { f: 110.0,  g: 0.07, type: 'triangle' }, // A2
      { f: 164.81, g: 0.06, type: 'triangle' }, // E3
      { f: 246.94, g: 0.045, type: 'triangle' },// B3
      { f: 277.18, g: 0.04, type: 'sine' },     // C#4
      { f: 329.63, g: 0.035, type: 'sawtooth' },// E4 (필터가 열릴 때 반짝임)
    ];
    const BELL_NOTES = [440, 493.88, 554.37, 659.25, 739.99, 880, 987.77, 1108.73];

    function startPad() {
      if (!ensure()) return;
      stopPad(0.2);
      const t = ctx.currentTime;
      const v = { nodes: [], timer: 0 };
      v.out = ctx.createGain(); v.out.gain.setValueAtTime(0, t); v.out.gain.linearRampToValueAtTime(0.8, t + 3);
      v.filter = ctx.createBiquadFilter(); v.filter.type = 'lowpass'; v.filter.Q.value = 0.8;
      v.filter.frequency.setValueAtTime(520, t);
      v.filter.connect(v.out);
      v.out.connect(master);
      v.out.connect(reverb);

      for (const n of PAD_NOTES) {
        for (const detune of [-7, 7]) {
          const o = ctx.createOscillator(); o.type = n.type; o.frequency.value = n.f; o.detune.value = detune;
          const g = ctx.createGain(); g.gain.value = n.g;
          // 느린 트레몰로로 살아있는 질감
          const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.12;
          const lfoG = ctx.createGain(); lfoG.gain.value = n.g * 0.35;
          lfo.connect(lfoG).connect(g.gain);
          o.connect(g).connect(v.filter);
          o.start(t); lfo.start(t);
          v.nodes.push(o, lfo);
        }
      }
      // 가끔 울리는 맑은 벨
      const sparkle = () => {
        if (voice !== v) return;
        bell(BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)], 0.035, 3.5, 0.85);
        v.timer = setTimeout(sparkle, 5000 + Math.random() * 7000);
      };
      v.timer = setTimeout(sparkle, 4000);
      voice = v;
    }

    function stopPad(fade = 1.6) {
      if (!ctx || !voice) return;
      const v = voice; voice = null;
      clearTimeout(v.timer);
      const t = ctx.currentTime;
      v.out.gain.cancelScheduledValues(t);
      v.out.gain.setValueAtTime(v.out.gain.value, t);
      v.out.gain.linearRampToValueAtTime(0, t + fade);
      // 이 세션의 노드만 정리 (v1의 재시작 시 음악이 꺼지던 버그 수정)
      setTimeout(() => { v.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* noop */ } }); v.out.disconnect(); }, fade * 1000 + 200);
    }

    // 호흡 단계에 맞춰 필터와 음량을 움직인다
    function breathe(phase, dur) {
      if (!ctx || !voice) return;
      const t = ctx.currentTime, f = voice.filter.frequency, g = voice.out.gain;
      f.cancelScheduledValues(t); g.cancelScheduledValues(t);
      f.setValueAtTime(Math.max(f.value, 60), t);
      g.setValueAtTime(g.value, t);
      if (phase === 'inhale') {
        f.exponentialRampToValueAtTime(2400, t + dur);
        g.linearRampToValueAtTime(1.0, t + dur);
      } else if (phase === 'hold') {
        f.exponentialRampToValueAtTime(2000, t + dur);
      } else if (phase === 'exhale') {
        f.exponentialRampToValueAtTime(380, t + dur);
        g.linearRampToValueAtTime(0.7, t + dur);
      }
    }

    function bell(freq, gain = 0.12, decay = 2.8, wetOnly = 0) {
      if (!ctx) return;
      const t = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(gain, t + 0.012);
      out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      if (wetOnly < 1) { const dry = ctx.createGain(); dry.gain.value = 1 - wetOnly; out.connect(dry).connect(master); }
      out.connect(reverb);
      [[1, 1], [2.76, 0.28], [5.4, 0.08]].forEach(([mul, amp]) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * mul;
        const g = ctx.createGain(); g.gain.value = amp;
        o.connect(g).connect(out); o.start(t); o.stop(t + decay + 0.1);
      });
    }

    const CHIME = { inhale: [659.25, 880], hold: [1108.73], exhale: [880, 659.25] };
    function chime(phase) {
      if (!ctx || !store.settings.chime) return;
      const notes = CHIME[phase] || [];
      notes.forEach((f, i) => setTimeout(() => bell(f, 0.13, 3.2, 0.25), i * 170));
    }

    return {
      ensure, startPad, stopPad, breathe, chime, applyVolume,
      setMuted(m) { muted = m; applyVolume(0.2); },
      isMuted: () => muted,
      pause() { if (ctx && ctx.state === 'running') ctx.suspend(); },
      resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
      preview() { if (ensure()) { applyVolume(0.05); bell(880, 0.12, 2.2, 0.3); } },
    };
  })();

  /* ------------------------------------------------------------------
     입자 필드: 들숨엔 중심으로 모이고, 날숨엔 퍼진다
     ------------------------------------------------------------------ */
  const Field = (() => {
    const canvas = $('#field');
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], raf = 0;
    let breath = 0.5, target = 0.5, external = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 16000, 36, 90));
      parts = Array.from({ length: n }, () => ({
        a: Math.random() * Math.PI * 2,
        r: 0.25 + Math.random() * 0.75,
        sp: (0.00006 + Math.random() * 0.00014) * (Math.random() < 0.5 ? -1 : 1),
        size: 0.6 + Math.random() * 1.6,
        tw: Math.random() * Math.PI * 2,
        hue: Math.random(),
      }));
    }

    function center() {
      const st = $('#stage').getBoundingClientRect();
      return { x: st.left + st.width / 2, y: st.top + st.height / 2, R: Math.max(w, h) * 0.62 };
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (!external) target = 0.5 + 0.5 * Math.sin(now / 1430); // 대기 중 느린 숨
      breath += (target - breath) * 0.06;
      const { x, y, R } = center();
      ctx.clearRect(0, 0, w, h);
      const pull = 1.12 - breath * 0.42;
      const cs = getComputedStyle(document.body);
      const ca = cs.getPropertyValue('--a').trim() || '#a6e3d3';
      const cb = cs.getPropertyValue('--b').trim() || '#8fb3e6';
      for (const p of parts) {
        p.a += p.sp * 16;
        const rr = (0.18 + p.r * 0.82) * R * pull;
        const px = x + Math.cos(p.a) * rr, py = y + Math.sin(p.a) * rr * 0.92;
        const alpha = (0.18 + 0.5 * (0.5 + 0.5 * Math.sin(now / 900 + p.tw))) * (1 - p.r * 0.45);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.hue > 0.5 ? ca : cb;
        ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function start() {
      return; // v3: 입자 필드 미사용
      if (reducedMotion.matches) return;
      resize();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener('resize', () => { if (!reducedMotion.matches) resize(); });
    return {
      start,
      set(v) { external = true; target = v; },
      release() { external = false; },
    };
  })();

  /* ------------------------------------------------------------------
     기기 기능: 화면 유지, 진동
     ------------------------------------------------------------------ */
  const Device = {
    lock: null,
    async keepAwake() {
      if (!store.settings.wakeLock || !('wakeLock' in navigator)) return;
      try { this.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* 거부 시 무시 */ }
    },
    release() { if (this.lock) { this.lock.release().catch(() => {}); this.lock = null; } },
    buzz(phase) {
      if (!store.settings.haptics || !navigator.vibrate) return;
      const p = { inhale: [60], hold: [25, 90, 25], exhale: [120], done: [40, 80, 40, 80, 160] }[phase];
      if (p) navigator.vibrate(p);
    },
  };

  /* ------------------------------------------------------------------
     DOM 참조
     ------------------------------------------------------------------ */
  const el = {
    body: document.body,
    orbWrap: $('#orbWrap'),
    phase: $('#phaseText'), count: $('#countText'), sub: $('#subText'),
    ringProgress: $('#ringProgress'), ringHead: $('#ringHead'),
    segs: { inhale: $('.seg-inhale'), hold: $('.seg-hold'), exhale: $('.seg-exhale') },
    start: $('#startBtn'), stop: $('#stopBtn'), pause: $('#pauseBtn'), sound: $('#soundBtn'),
    sessionMeta: $('#sessionMeta'),
    rhythmPicker: $('#rhythmPicker'), cyclePicker: $('#cyclePicker'), totalTime: $('#totalTime'),
    todayCount: $('#todayCount'), streakCount: $('#streakCount'),
    announcer: $('#announcer'),
  };
  const RING_C = 2 * Math.PI * 48;

  /* ------------------------------------------------------------------
     세션 엔진 (타임스탬프 기반 → 탭이 백그라운드여도 정확)
     ------------------------------------------------------------------ */
  const S = {
    mode: 'idle', // idle | prep | running | paused | done
    rhythm: rhythmById(store.settings.rhythm),
    cycles: store.settings.cycles,
    start: 0, pausedAt: 0, raf: 0, timers: [],
    phase: null, cycleIdx: -1, completed: 0, lastCount: null,
    before: null, record: null,
  };

  function setOrb(p) {
    el.orbWrap.style.setProperty('--s', (MIN_SCALE + (1 - MIN_SCALE) * p).toFixed(4));
    document.body.style.setProperty('--p', p.toFixed(4)); // 색: 파랑 → (가득 차면) 주황 → 파랑
  }

  function layoutRing(r) {
    const L = cycleLen(r), gap = 1.6;
    let offset = 0;
    for (const k of ['inhale', 'hold', 'exhale']) {
      const len = (r[k] / L) * RING_C;
      el.segs[k].style.strokeDasharray = `${Math.max(len - gap, 0.1)} ${RING_C}`;
      el.segs[k].style.strokeDashoffset = `${-offset - gap / 2}`;
      offset += len;
    }
    setRingProgress(0);
  }
  function setRingProgress(frac) {
    el.ringProgress.style.strokeDasharray = `${(frac * RING_C).toFixed(2)} ${RING_C}`;
    const ang = frac * Math.PI * 2; // ring은 -90° 회전 상태
    el.ringHead.setAttribute('cx', (50 + 48 * Math.cos(ang)).toFixed(2));
    el.ringHead.setAttribute('cy', (50 + 48 * Math.sin(ang)).toFixed(2));
  }

  function setPhaseAttr(p) { el.body.dataset.phase = p; }
  function setMode(m) { el.body.dataset.mode = m === 'idle' || m === 'done' ? 'idle' : 'session'; }

  function setCount(text, animate) {
    if (el.count.textContent === String(text)) return;
    el.count.textContent = text;
    if (animate && !reducedMotion.matches) {
      el.count.classList.remove('tick'); void el.count.offsetWidth; el.count.classList.add('tick');
    }
  }

  function idleReadout() {
    const r = S.rhythm;
    el.phase.textContent = '준비되셨나요?';
    setCount(rhythmLabel(r));
    el.sub.textContent = `들숨 ${r.inhale} · 멈춤 ${r.hold} · 날숨 ${r.exhale}`;
  }

  function announce(t) { el.announcer.textContent = ''; setTimeout(() => { el.announcer.textContent = t; }, 30); }

  async function begin() {
    if (S.mode !== 'idle') return;
    S.mode = 'checkin'; // 체크인 중 중복 시작 방지
    Sound.ensure(); // 사용자 제스처 안에서 오디오 활성화
    if (store.settings.checkin) {
      const v = await Checkin.ask('before');
      S.before = v;
    } else S.before = null;
    startCountdown();
  }

  function startCountdown() {
    S.mode = 'prep';
    S.completed = 0; S.cycleIdx = -1; S.phase = null; S.record = null;
    el.sessionMeta.textContent = `${rhythmLabel(S.rhythm)} · ${S.cycles} 사이클`;
    layoutRing(S.rhythm);
    setMode('session'); setPhaseAttr('prep');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    Sound.startPad();
    Device.keepAwake();
    requestAnimationFrame(() => setOrb(0)); // 2.6초간 천천히 가장 작은 크기로

    let n = 3;
    el.phase.textContent = '준비';
    $('#sessionNote').textContent = '편하게 앉아 어깨를 내려놓으세요';
    setCount(n, true);
    announce('3초 후 시작합니다');
    const step = () => {
      n--;
      if (n > 0) { setCount(n, true); S.timers.push(setTimeout(step, 1000)); }
      else run();
    };
    S.timers.push(setTimeout(step, 1000));
  }

  function run() {
    $('#sessionNote').textContent = '숨이 버거우면 언제든 평소대로 쉬어도 괜찮아요';
    S.mode = 'running';
    S.start = performance.now();
    S.raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (S.mode !== 'running') return;
    const r = S.rhythm, L = cycleLen(r);
    const e = (now - S.start) / 1000;
    const idx = Math.floor(e / L);
    if (idx >= S.cycles) { S.completed = S.cycles; finish(); return; }
    if (idx !== S.cycleIdx) { S.completed = idx; }

    const t = e - idx * L;
    let phase, pt, dur, p;
    if (t < r.inhale) { phase = 'inhale'; pt = t; dur = r.inhale; p = ease(pt / dur); }
    else if (t < r.inhale + r.hold) { phase = 'hold'; pt = t - r.inhale; dur = r.hold; p = 1; }
    else { phase = 'exhale'; pt = t - r.inhale - r.hold; dur = r.exhale; p = 1 - ease(pt / dur); }

    if (phase !== S.phase || idx !== S.cycleIdx) {
      S.phase = phase; S.cycleIdx = idx;
      enterPhase(phase, dur - pt);
    }

    setOrb(p);
    setRingProgress(t / L);
    setCount(Math.max(1, Math.ceil(dur - pt - 1e-6)), true);
    S.raf = requestAnimationFrame(tick);
  }

  function enterPhase(phase, remaining) {
    setPhaseAttr(phase);
    el.phase.textContent = PHASE_LABEL[phase];
    el.sessionMeta.textContent = `${rhythmLabel(S.rhythm)} · 사이클 ${S.cycleIdx + 1} / ${S.cycles}`;
    Sound.breathe(phase, remaining);
    Sound.chime(phase);
    Device.buzz(phase);
    announce(`${PHASE_LABEL[phase]} ${Math.round(remaining)}초`);
  }

  function togglePause() {
    if (S.mode === 'running') {
      S.mode = 'paused'; S.pausedAt = performance.now();
      cancelAnimationFrame(S.raf);
      Sound.pause(); Device.release();
      el.body.classList.add('paused');
      el.phase.textContent = '일시정지';
      el.pause.setAttribute('aria-label', '계속하기');
      announce('일시정지');
    } else if (S.mode === 'paused') {
      S.start += performance.now() - S.pausedAt;
      S.mode = 'running';
      Sound.resume(); Device.keepAwake();
      el.body.classList.remove('paused');
      el.phase.textContent = PHASE_LABEL[S.phase] || '';
      el.pause.setAttribute('aria-label', '일시정지');
      S.raf = requestAnimationFrame(tick);
    }
  }

  function elapsedSeconds() {
    if (S.mode === 'prep' || !S.start) return 0;
    const now = S.mode === 'paused' ? S.pausedAt : performance.now();
    return clamp((now - S.start) / 1000, 0, S.cycles * cycleLen(S.rhythm));
  }

  function stop() {
    if (S.mode === 'idle' || S.mode === 'done') return;
    finish(true);
  }

  function teardown() {
    S.timers.forEach(clearTimeout); S.timers = [];
    cancelAnimationFrame(S.raf);
    Sound.stopPad(); Sound.resume();
    Device.release();
    Field.release();
    el.body.classList.remove('paused');
  }

  async function finish(early = false) {
    const secs = early ? elapsedSeconds() : S.cycles * cycleLen(S.rhythm);
    const done = S.completed;
    if (early) Sound.resume();
    S.mode = 'done';
    teardown();

    if (done === 0) {
      resetToIdle();
      toast('한 사이클을 마치면 기록돼요');
      return;
    }

    Device.buzz('done');
    setMode('idle'); // 요약 시트 뒤에는 홈 화면이 보이도록
    document.body.style.removeProperty('--p');
    setPhaseAttr('idle');
    el.phase.textContent = '잘 하셨어요';
    setCount('✓');
    el.sessionMeta.textContent = `${done} 사이클 완료`;
    setRingProgress(1);

    const record = Records.add({
      at: Date.now(), r: S.rhythm.id, planned: S.cycles, done, secs: Math.round(secs),
      before: S.before, after: null,
    });
    refreshHeader(true);

    if (S.before != null && store.settings.checkin) {
      await wait(900);
      const after = await Checkin.ask('after');
      if (after != null) { record.after = after; save(); }
    } else {
      await wait(700);
    }
    await Summary.show(record, done >= S.cycles);
    resetToIdle();
    renderJourney();
  }

  function resetToIdle() {
    S.mode = 'idle'; S.phase = null;
    setMode('idle'); setPhaseAttr('idle');
    el.orbWrap.style.removeProperty('--s');
    document.body.style.removeProperty('--p');
    layoutRing(S.rhythm);
    idleReadout();
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------------
     시트 (체크인 · 요약 · 온보딩)
     ------------------------------------------------------------------ */
  const Sheets = {
    open(sheet) {
      $('#backdrop').hidden = false;
      sheet.hidden = false; sheet.classList.remove('closing');
      const f = sheet.querySelector('button'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
    },
    close(sheet) {
      return new Promise((res) => {
        sheet.classList.add('closing');
        setTimeout(() => {
          sheet.hidden = true; sheet.classList.remove('closing');
          if (!$$('.sheet').some((s) => !s.hidden)) $('#backdrop').hidden = true;
          res();
        }, reducedMotion.matches ? 10 : 320);
      });
    },
    current() { return $$('.sheet').find((s) => !s.hidden); },
  };

  const Checkin = (() => {
    const sheet = $('#checkinSheet'), box = $('#moods');
    let resolver = null;
    box.innerHTML = MOODS.map((m, i) =>
      `<button class="mood" data-v="${i + 1}" style="--c:${m.c};--k:${m.k}"><i></i>${m.label}</button>`).join('');
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('.mood'); if (!b || !resolver) return;
      b.classList.add('picked');
      const r = resolver; resolver = null;
      await wait(220);
      await Sheets.close(sheet);
      $$('.mood', box).forEach((x) => x.classList.remove('picked'));
      r(Number(b.dataset.v));
    });
    $('#checkinSkip').addEventListener('click', () => dismiss());
    async function dismiss() {
      if (!resolver) return;
      const r = resolver; resolver = null;
      await Sheets.close(sheet); r(null);
    }
    return {
      ask(when) {
        $('#checkinEyebrow').textContent = when === 'before' ? '시작 전' : '마친 후';
        $('#checkinTitle').textContent = when === 'before' ? '지금 마음은 어떤가요?' : '지금은 어떤가요?';
        $('#checkinSkip').textContent = when === 'before' ? '건너뛰고 바로 시작' : '건너뛰기';
        Sheets.open(sheet);
        return new Promise((res) => { resolver = res; });
      },
      dismiss,
      isOpen: () => !sheet.hidden,
    };
  })();

  const Summary = (() => {
    const sheet = $('#summarySheet');
    let resolver = null, pendingLevel = null;
    $('#summaryDone').addEventListener('click', () => close());
    $('#levelUp').addEventListener('click', (e) => {
      if (!e.target.closest('button') || !pendingLevel) return;
      setRhythm(pendingLevel.id);
      toast(`다음 리듬 ${rhythmLabel(pendingLevel)}로 바꿨어요`);
      close();
    });
    async function close() {
      if (!resolver) return;
      const r = resolver; resolver = null;
      await Sheets.close(sheet); r();
    }
    return {
      show(rec, full) {
        const r = rhythmById(rec.r);
        $('#summaryTitle').textContent = full ? '수고했어요' : '좋은 시작이었어요';
        $('#summaryLead').textContent = full
          ? `${rhythmLabel(r)} 리듬으로 ${rec.done}번의 깊은 숨을 쉬었어요.`
          : `${rec.done}번의 숨도 충분히 의미 있어요.`;
        $('#summaryStats').innerHTML = `
          <div><b>${rec.done}</b><span>사이클</span></div>
          <div><b>${fmtClock(rec.secs)}</b><span>호흡 시간</span></div>
          <div><b>${Records.streak()}</b><span>연속 일</span></div>`;

        const delta = $('#summaryDelta');
        if (rec.before != null && rec.after != null) {
          const d = rec.after - rec.before;
          const tag = d > 0 ? `+${d} 편안해짐` : d === 0 ? '그대로' : `${d}`;
          delta.innerHTML = `<span>${MOODS[rec.before - 1].label} → <b>${MOODS[rec.after - 1].label}</b></span><span class="tag ${d > 0 ? '' : 'neutral'}">${tag}</span>`;
          delta.hidden = false;
        } else delta.hidden = true;

        // 숨길 사다리: 같은 단계 N회 완주 시 다음 단계 추천
        const lu = $('#levelUp'); pendingLevel = null;
        const i = RHYTHMS.findIndex((x) => x.id === rec.r);
        const fulls = Records.fullSessionsByRhythm()[rec.r];
        if (full && i < RHYTHMS.length - 1 && fulls >= LEVEL_UP_AFTER && store.settings.rhythm === rec.r) {
          pendingLevel = RHYTHMS[i + 1];
          lu.innerHTML = `<div><b>다음 단계 도전?</b><span>${r.name} 리듬을 ${fulls}번 완주했어요. ${pendingLevel.name} ${rhythmLabel(pendingLevel)}로 숨길을 늘려볼까요?</span></div><button class="btn-ghost">도전</button>`;
          lu.hidden = false;
        } else lu.hidden = true;

        Sheets.open(sheet);
        return new Promise((res) => { resolver = res; });
      },
      close,
      isOpen: () => !sheet.hidden,
    };
  })();

  function showOnboarding() {
    const sheet = $('#onboardSheet');
    Sheets.open(sheet);
    $('#onboardDone').addEventListener('click', async () => {
      store.onboarded = true; save();
      await Sheets.close(sheet);
    }, { once: true });
  }

  /* ------------------------------------------------------------------
     홈 컨트롤
     ------------------------------------------------------------------ */
  function renderPickers() {
    const fulls = Records.fullSessionsByRhythm();
    el.rhythmPicker.innerHTML = RHYTHMS.map((r) => {
      const checked = r.id === S.rhythm.id;
      const badge = r.id === 'r4' ? '<em class="badge">목표</em>' : '';
      return `<button class="seg" role="radio" aria-checked="${checked}" data-id="${r.id}" aria-label="${r.name} ${r.inhale}초 들숨 ${r.hold}초 멈춤 ${r.exhale}초 날숨, 완주 ${fulls[r.id]}회">
        ${badge}<b>${rhythmLabel(r)}</b><span>${r.id === 'r4' ? '43초' : r.name}</span></button>`;
    }).join('');
    el.cyclePicker.innerHTML = CYCLE_OPTIONS.map((n) =>
      `<button class="pill" role="radio" aria-checked="${n === S.cycles}" data-n="${n}">${n}회</button>`).join('');
    el.totalTime.textContent = `총 ${fmtDuration(cycleLen(S.rhythm) * S.cycles)}`;
  }

  function setRhythm(id) {
    S.rhythm = rhythmById(id);
    store.settings.rhythm = S.rhythm.id; save();
    renderPickers(); layoutRing(S.rhythm);
    if (S.mode === 'idle') idleReadout();
  }

  el.rhythmPicker.addEventListener('click', (e) => {
    const b = e.target.closest('.seg'); if (!b || S.mode !== 'idle') return;
    setRhythm(b.dataset.id);
  });
  el.cyclePicker.addEventListener('click', (e) => {
    const b = e.target.closest('.pill'); if (!b || S.mode !== 'idle') return;
    S.cycles = Number(b.dataset.n);
    store.settings.cycles = S.cycles; save();
    renderPickers();
  });
  // 라디오 그룹 방향키 이동
  [el.rhythmPicker, el.cyclePicker].forEach((group) => group.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const items = $$('[role="radio"]', group);
    const i = items.findIndex((x) => x.getAttribute('aria-checked') === 'true');
    const n = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    n.click(); $$('[role="radio"]', group).find((x) => x.dataset.id === n.dataset.id && x.dataset.n === n.dataset.n)?.focus();
    e.preventDefault();
  }));

  el.start.addEventListener('pointerdown', (e) => {
    const r = el.start.getBoundingClientRect();
    el.start.style.setProperty('--rx', `${e.clientX - r.left}px`);
    el.start.style.setProperty('--ry', `${e.clientY - r.top}px`);
    el.start.classList.remove('pressed'); void el.start.offsetWidth; el.start.classList.add('pressed');
  });
  el.start.addEventListener('click', begin);
  $('#orbStart').addEventListener('click', begin);
  el.stop.addEventListener('click', stop);
  el.pause.addEventListener('click', togglePause);
  el.sound.addEventListener('click', () => {
    const m = !Sound.isMuted();
    Sound.setMuted(m);
    store.settings.sound = !m; save();
    el.sound.setAttribute('aria-pressed', String(!m));
    el.sound.setAttribute('aria-label', m ? '소리 켜기' : '소리 끄기');
  });

  /* ------------------------------------------------------------------
     헤더 · 인사
     ------------------------------------------------------------------ */
  function refreshHeader(bump) {
    el.todayCount.textContent = Records.todayCount();
    el.streakCount.textContent = Records.streak();
    if (bump) {
      $$('.chip').forEach((c) => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
    }
  }
  function greet() {
    const h = new Date().getHours();
    const t = h < 5 ? '고요한 밤이에요' : h < 11 ? '좋은 아침이에요' : h < 17 ? '좋은 오후예요' : h < 22 ? '편안한 저녁이에요' : '고요한 밤이에요';
    $('#greetEyebrow').textContent = t;
    const lines = {
      '고요한 밤이에요': '잠들기 전,<br>천천히 한 숨씩.',
      '좋은 아침이에요': '하루를 여는<br>깊은 숨 한 번.',
      '좋은 오후예요': '잠시 멈추고,<br>숨을 길게.',
      '편안한 저녁이에요': '오늘도 천천히,<br>한 숨씩.',
    };
    $('#greetTitle').innerHTML = lines[t];
  }

  /* ------------------------------------------------------------------
     기록 화면
     ------------------------------------------------------------------ */
  function renderJourney() {
    const tot = Records.totals();
    const streak = Records.streak();
    const delta = tot.avgDelta;
    $('#stats').innerHTML = `
      <div class="stat"><p class="k">오늘</p><p class="v">${Records.todayCount()}<small>회</small></p><p class="d">완료한 사이클</p></div>
      <div class="stat"><p class="k">연속</p><p class="v">${streak}<small>일</small></p><p class="d">${streak ? '흐름을 이어가요' : '오늘 시작해요'}</p></div>
      <div class="stat"><p class="k">누적 호흡</p><p class="v">${Math.round(tot.seconds / 60)}<small>분</small></p><p class="d">총 ${tot.count}사이클</p></div>
      <div class="stat"><p class="k">마음 변화</p><p class="v">${delta == null ? '–' : (delta > 0 ? '+' : '') + delta.toFixed(1)}</p><p class="d">${tot.checkins ? `체크인 ${tot.checkins}회 평균` : '체크인하면 보여요'}</p></div>`;
    renderHeatmap();
    renderLadder();
    renderRecords();
  }

  function levelOf(n) { return n <= 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4; }

  function renderHeatmap() {
    const box = $('#heatmap');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const mondayIdx = (today.getDay() + 6) % 7; // 월=0
    const start = addDays(today, -mondayIdx - 7 * 11);
    let html = '<span></span>';
    let lastMonth = -1;
    for (let w = 0; w < 12; w++) {
      const d = addDays(start, w * 7);
      const m = d.getMonth();
      html += `<span class="mlabel" style="grid-column:${w + 2}">${m !== lastMonth ? `${m + 1}월` : ''}</span>`;
      lastMonth = m;
    }
    ['월', '', '수', '', '금', '', '일'].forEach((t, i) => { html += `<span class="dlabel" style="grid-row:${i + 2}">${t}</span>`; });
    for (let w = 0; w < 12; w++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = addDays(start, w * 7 + dow);
        const k = dateKey(d);
        const n = (store.days[k] || {}).count || 0;
        const future = d > today;
        const cls = future ? 'future' : `l${levelOf(n)}`;
        const label = `${fmtDate(d)} · ${n}회`;
        html += `<span class="cell ${cls}${+d === +today ? ' today' : ''}" style="grid-column:${w + 2};grid-row:${dow + 2}" ${future ? '' : `data-tip="${label}" role="img" aria-label="${label}"`}></span>`;
      }
    }
    box.innerHTML = html;
  }

  (function heatTooltip() {
    const box = $('#heatmap'), tip = $('#heatTip'), wrap = box.parentElement;
    let active = null;
    const show = (cell) => {
      if (!cell || !cell.dataset.tip) return hide();
      if (active) active.classList.remove('active');
      active = cell; cell.classList.add('active');
      const [date, n] = cell.dataset.tip.split(' · ');
      tip.innerHTML = `${n} <span>${date}</span>`;
      tip.hidden = false;
      const c = cell.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      let x = c.left + c.width / 2 - wr.left;
      const half = tip.offsetWidth / 2;
      x = clamp(x, half, wr.width - half);
      tip.style.left = `${x}px`; tip.style.top = `${c.top - wr.top}px`;
    };
    const hide = () => { tip.hidden = true; if (active) active.classList.remove('active'); active = null; };
    box.addEventListener('pointerover', (e) => show(e.target.closest('.cell')));
    box.addEventListener('pointerleave', hide);
    box.addEventListener('click', (e) => show(e.target.closest('.cell')));
  })();

  function renderLadder() {
    const fulls = Records.fullSessionsByRhythm();
    let reached = -1;
    RHYTHMS.forEach((r, i) => { if (fulls[r.id] > 0) reached = i; });
    const ol = $('#ladder');
    ol.style.setProperty('--fill', `${reached <= 0 ? 0 : (reached / (RHYTHMS.length - 1)) * 100}%`);
    ol.innerHTML = RHYTHMS.map((r, i) => {
      const done = fulls[r.id] > 0;
      const cur = r.id === S.rhythm.id;
      return `<li class="step ${done ? 'done' : ''} ${cur ? 'current' : ''}">
        <span class="node">${done ? '✓' : i + 1}</span>
        <b>${rhythmLabel(r)}</b><span>${r.name}<em>${fulls[r.id]}회 완주</em></span></li>`;
    }).join('');
  }

  function renderRecords() {
    const keys = Object.keys(store.days).filter((k) => store.days[k].count > 0).sort().reverse();
    const list = $('#records');
    $('#emptyRecords').hidden = keys.length > 0;
    $('#recordCount').textContent = keys.length ? `${keys.length}일 연습` : '';
    const todayK = dateKey(), yK = dateKey(addDays(new Date(), -1));
    list.innerHTML = keys.slice(0, 90).map((k) => {
      const v = store.days[k], d = parseKey(k);
      const name = k === todayK ? '오늘' : k === yK ? '어제' : fmtDate(d);
      const sub = k === todayK || k === yK ? fmtDate(d) : `${d.getFullYear()}년`;
      return `<li class="record ${k === todayK ? 'is-today' : ''}">
        <p class="date">${name}<small>${sub}</small></p>
        <p class="n"><b>${v.count}</b>회<small>${fmtDuration(v.seconds || 0)}</small></p></li>`;
    }).join('');
  }

  /* ------------------------------------------------------------------
     설정
     ------------------------------------------------------------------ */
  function bindSettings() {
    const vol = $('#volume'), out = $('#volumeOut');
    const paint = () => { vol.style.setProperty('--v', `${vol.value}%`); out.textContent = vol.value; };
    vol.value = store.settings.volume; paint();
    vol.addEventListener('input', () => { store.settings.volume = Number(vol.value); paint(); Sound.applyVolume(); });
    vol.addEventListener('change', () => { save(); if (S.mode === 'idle') Sound.preview(); });

    const map = { optChime: 'chime', optHaptics: 'haptics', optCheckin: 'checkin', optWake: 'wakeLock' };
    for (const [id, key] of Object.entries(map)) {
      const input = $('#' + id);
      input.checked = !!store.settings[key];
      input.addEventListener('change', () => {
        store.settings[key] = input.checked; save();
        if (key === 'chime' && input.checked) Sound.preview();
        if (key === 'haptics' && input.checked) Device.buzz('inhale');
      });
    }
    if (!navigator.vibrate) $('#optHaptics').closest('.row').querySelector('span').textContent = '이 기기/브라우저는 진동을 지원하지 않아요';

    $('#exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sumgyeol-${dateKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('기록을 내보냈어요');
    });

    const reset = $('#resetBtn'); let armed = 0;
    reset.addEventListener('click', () => {
      if (!armed) {
        reset.classList.add('confirm'); reset.textContent = '한 번 더 누르면 삭제';
        armed = setTimeout(() => { armed = 0; reset.classList.remove('confirm'); reset.textContent = '초기화'; }, 3500);
        return;
      }
      clearTimeout(armed); armed = 0;
      store.days = {}; save();
      try { localStorage.removeItem(LEGACY_KEY); } catch (e) { /* noop */ }
      reset.classList.remove('confirm'); reset.textContent = '초기화';
      refreshHeader(); renderJourney(); renderPickers();
      toast('기록을 모두 지웠어요');
    });
  }

  /* ------------------------------------------------------------------
     탭 내비게이션
     ------------------------------------------------------------------ */
  function showView(name) {
    if (S.mode !== 'idle') return;
    $$('.tab').forEach((t) => {
      if (t.dataset.view === name) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    $$('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
    if (name === 'journey') renderJourney();
    window.scrollTo({ top: 0 });
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));
  $('#backdrop').addEventListener('click', () => {
    if (Checkin.isOpen()) Checkin.dismiss();
    else if (Summary.isOpen()) Summary.close();
  });

  /* ------------------------------------------------------------------
     키보드 · 가시성
     ------------------------------------------------------------------ */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (Checkin.isOpen()) Checkin.dismiss();
      else if (Summary.isOpen()) Summary.close();
      return;
    }
    if (e.code !== 'Space' || e.target.closest('input, button, [role="radio"]')) return;
    if (Sheets.current()) return;
    if (S.mode === 'idle' && !$('#view-breathe').hidden) { e.preventDefault(); begin(); }
    else if (S.mode === 'running' || S.mode === 'paused') { e.preventDefault(); togglePause(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (S.mode === 'running' || S.mode === 'prep')) Device.keepAwake();
    if (!document.hidden) { refreshHeader(); greet(); }
  });

  /* ------------------------------------------------------------------
     토스트
     ------------------------------------------------------------------ */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ------------------------------------------------------------------
     시작
     ------------------------------------------------------------------ */
  function init() {
    greet();
    renderPickers();
    layoutRing(S.rhythm);
    idleReadout();
    refreshHeader();
    bindSettings();
    if (!store.settings.sound) {
      Sound.setMuted(true);
      el.sound.setAttribute('aria-pressed', 'false');
      el.sound.setAttribute('aria-label', '소리 켜기');
    }
    Field.start();
    if (!store.onboarded) setTimeout(showOnboarding, 500);
    save(); // v1 이전 데이터 영구화

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }

  // 검증/디버그용 훅 (UI에는 노출되지 않음)
  window.__sumgyeol = { S, store, Records, setRhythm, begin, stop, togglePause, renderJourney };

  init();
})();
