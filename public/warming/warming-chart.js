/* ============================================================
   WARMING CHART — scroll-driven heating chart engine (vanilla).
   A fixed 1920×1080 frame is scaled to cover the viewport; the
   SVG chart is re-projected every frame through a camera window.
   ============================================================ */
(function () {
  'use strict';
  const H = window.HEATING;
  const E = H.events;
  const SEGS = E.length + 2;            // intro + events + endcap
  const TRANS = 0.45;                   // transition share of each segment
  const M = { l: 150, r: 150, t: 170, b: 130 };
  const W = 1920, HT = 1080;
  const IW = W - M.l - M.r, IH = HT - M.t - M.b;
  const SUP = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸'];
  const CARD_SLOT = [150, 205];
  const FULL = { x0: 1849, x1: 2027, y0: -0.38, y1: 1.78 };
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- camera: locked full-frame view ----------
     Every segment shares the same fully-zoomed-out window, so the long
     climb always reads as one steep rise and a bad year is only ever a
     small dip against it. (Per-event y-rescaling made dips look like
     crashes and flattened the trend.) Only the drawn line and the tip
     advance; the card floats off to the left and points at the tip. */
  const rest = [];
  for (let i = 0; i < SEGS; i++) rest.push(FULL);
  const restYear = [1850, ...E.map(e => e.anchor), 2025];

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ss = (a, b, v) => { const u = clamp((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const lerp = (a, b, u) => a + (b - a) * u;
  const fmtT = t => (t >= 0 ? '+' : '−') + Math.abs(t).toFixed(2) + '°C';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- DOM / SVG scaffolding ---------- */
  const scrolly = document.getElementById('scrolly');
  const frame = document.getElementById('frame');
  const svg = document.getElementById('chart');
  const cardsHost = document.getElementById('cards');
  const intro = document.getElementById('intro');
  const endcap = document.getElementById('endcap');
  const header = document.getElementById('chead');
  const pbar = document.getElementById('pbar');

  scrolly.style.height = (SEGS * 140) + 'vh';

  // defs: gradient + soft glow
  const defs = el('defs', {}, svg);
  const grad = el('linearGradient', { id: 'lineGrad', gradientUnits: 'userSpaceOnUse', y1: 0, y2: 0 }, defs);
  el('stop', { offset: '0%', style: 'stop-color:var(--accent-faint)' }, grad);
  el('stop', { offset: '45%', style: 'stop-color:var(--accent-mid)' }, grad);
  el('stop', { offset: '78%', style: 'stop-color:var(--accent)' }, grad);
  el('stop', { offset: '100%', style: 'stop-color:var(--accent-deep)' }, grad);

  const gGrid = el('g', {}, svg);
  const gSpans = el('g', {}, svg);
  const gLine = el('g', {}, svg);
  const gLead = el('g', {}, svg);
  const gMark = el('g', {}, svg);
  const gTip = el('g', {}, svg);

  const path = el('path', { fill: 'none', stroke: 'url(#lineGrad)', 'stroke-width': 4.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, gLine);

  // pools
  function pool(n, make) { const a = []; for (let i = 0; i < n; i++) a.push(make()); return a; }
  const yLines = pool(14, () => el('line', { class: 'gridline' }, gGrid));
  const yLabs = pool(14, () => el('text', { class: 'gridlab', 'text-anchor': 'end' }, gGrid));
  const xLabs = pool(24, () => el('text', { class: 'gridlab', 'text-anchor': 'middle' }, gGrid));
  const zeroNote = el('text', { class: 'gridnote', 'text-anchor': 'start' }, gGrid);
  zeroNote.textContent = '1850–1900 average';

  // spans (shaded ranges)
  const spanRects = E.map(ev => ev.span ? el('rect', { class: 'spanrect' }, gSpans) : null);

  // markers + active ring
  const marks = E.map(() => el('circle', { class: 'marker', r: 6.5 }, gMark));
  const ring = el('circle', { class: 'markring', r: 10 }, gMark);

  // leader line
  const leader = el('line', { class: 'leader' }, gLead);

  // tip
  const tipHalo = el('circle', { class: 'tiphalo', r: 15 }, gTip);
  const tipDot = el('circle', { class: 'tipdot', r: 7 }, gTip);
  const tipLab = el('text', { class: 'tiplab', 'text-anchor': 'middle' }, gTip);

  /* ---------- cards ---------- */
  const cardEls = E.map((ev, i) => {
    const c = document.createElement('div');
    c.className = 'card';
    c.setAttribute('data-screen-label', 'Event ' + (i + 1) + ' — ' + ev.title);
    // Locked full-frame view keeps the line low-left→high-right, so the
    // upper-left stays clear: park every card there and point at the tip.
    c.style.left = CARD_SLOT[0] + 'px'; c.style.top = CARD_SLOT[1] + 'px';
    c.innerHTML =
      '<div class="bigyear">' + ev.short + '</div>' +
      '<div class="kicker">' + ev.kicker + '</div>' +
      '<h2 class="ctitle">' + ev.title + '</h2>' +
      '<p class="cbody">' + ev.body + '</p>' +
      '<div class="csource">' + SUP[i] + ' ' + ev.source + '</div>' +
      '<div class="creward">[ REWARD SIGNAL ' + fmtT(H.tempAt(ev.anchor)) + ' ]</div>';
    cardsHost.appendChild(c);
    return c;
  });

  /* ---------- per-segment dwell (reading time) ----------
     Autoplay lingers on each segment for a duration scaled to how much
     text it carries, so long cards aren't gone before they can be read. */
  const wc = s => (String(s).trim().match(/\S+/g) || []).length;
  const secsFor = (w, base, per, lo, hi) => Math.max(lo, Math.min(hi, base + w * per));
  const segDur = [
    secsFor(wc(intro.textContent), 6, 0.30, 9, 16),                       // intro
    ...E.map(ev => secsFor(wc(ev.title + ' ' + ev.body), 4, 0.45, 8, 18)),// events
    secsFor(wc(endcap.textContent), 7, 0.30, 10, 15)                      // endcap
  ];

  /* ---------- frame scaling (cover) ---------- */
  function fit() {
    const s = Math.max(window.innerWidth / W, window.innerHeight / HT);
    frame.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- per-frame render ---------- */
  let pTarget = 0, pCur = 0, last = performance.now();
  let cam = { ...FULL };

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    pTarget = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  function project(cm) {
    return {
      x: yr => M.l + (yr - cm.x0) / (cm.x1 - cm.x0) * IW,
      y: t => HT - M.b - (t - cm.y0) / (cm.y1 - cm.y0) * IH
    };
  }

  function render(now) {
    requestAnimationFrame(render);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    autoplayStep(dt, now);
    pCur += (pTarget - pCur) * Math.min(1, dt * 6);

    const g = pCur * SEGS;
    const seg = Math.min(SEGS - 1, Math.floor(g));
    const u = g - seg;
    const un = clamp(u / TRANS, 0, 1);
    const e = ease(un);

    // camera (eased pan)
    const a = rest[Math.max(0, seg - 1)] || FULL, b = rest[seg];
    for (const k of ['x0', 'x1', 'y0', 'y1']) cam[k] = lerp(seg === 0 ? b[k] : a[k], b[k], e);
    const P = project(cam);

    // draw year — linear so the line climbs at a constant rate, unaffected
    // by the camera's ease-in/out (which would otherwise read as a stutter)
    const yPrev = restYear[Math.max(0, seg - 1)], yNow = restYear[seg];
    const drawYear = seg === 0 ? 1850 : lerp(yPrev, yNow, un);

    // gradient span
    grad.setAttribute('x1', P.x(1850)); grad.setAttribute('x2', P.x(2026));

    // path
    let d = '';
    for (const [y, t] of H.data) {
      if (y > drawYear) break;
      d += (d ? 'L' : 'M') + P.x(y).toFixed(1) + ' ' + P.y(t).toFixed(1);
    }
    const tTip = H.tempAt(drawYear);
    if (drawYear > 1850) d += 'L' + P.x(drawYear).toFixed(1) + ' ' + P.y(tTip).toFixed(1);
    path.setAttribute('d', d);

    /* grid Y */
    const yr = cam.y1 - cam.y0;
    const stepY = yr > 1.4 ? 0.5 : yr > 0.7 ? 0.25 : 0.1;
    let yi = 0;
    for (let v = Math.ceil(cam.y0 / stepY) * stepY; v <= cam.y1 + 1e-6 && yi < yLines.length; v += stepY) {
      const py = P.y(v);
      if (py < M.t - 10 || py > HT - M.b + 10) continue;
      const ln = yLines[yi], lb = yLabs[yi];
      ln.setAttribute('x1', M.l); ln.setAttribute('x2', W - M.r);
      ln.setAttribute('y1', py); ln.setAttribute('y2', py);
      ln.setAttribute('class', Math.abs(v) < 1e-6 ? 'gridline zero' : 'gridline');
      ln.style.display = '';
      lb.setAttribute('x', M.l - 18); lb.setAttribute('y', py + 6);
      lb.textContent = (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(stepY < 0.25 ? 1 : (stepY === 0.25 ? 2 : 1)) + '°';
      lb.style.display = '';
      if (Math.abs(v) < 1e-6) {
        zeroNote.setAttribute('x', W - M.r - 4); zeroNote.setAttribute('y', py - 10);
        zeroNote.setAttribute('text-anchor', 'end');
        zeroNote.style.display = '';
      }
      yi++;
    }
    for (; yi < yLines.length; yi++) { yLines[yi].style.display = 'none'; yLabs[yi].style.display = 'none'; }
    if (cam.y0 > 0 || cam.y1 < 0) zeroNote.style.display = 'none';

    /* grid X */
    const xr = cam.x1 - cam.x0;
    const stepX = xr > 120 ? 50 : xr > 45 ? 10 : xr > 18 ? 5 : 2;
    let xi = 0;
    for (let v = Math.ceil(cam.x0 / stepX) * stepX; v <= Math.min(cam.x1, 2026) && xi < xLabs.length; v += stepX) {
      if (v > 2025 && stepX > 2) continue;
      const px = P.x(v);
      if (px < M.l - 30 || px > W - M.r + 30) continue;
      const lb = xLabs[xi];
      lb.setAttribute('x', px); lb.setAttribute('y', HT - M.b + 44);
      lb.textContent = v; lb.style.display = '';
      xi++;
    }
    if (xr > 120 && xi < xLabs.length) { // final "2025" tick on full view
      const lb = xLabs[xi];
      lb.setAttribute('x', P.x(2025)); lb.setAttribute('y', HT - M.b + 44);
      lb.textContent = '2025'; lb.style.display = ''; xi++;
    }
    for (; xi < xLabs.length; xi++) xLabs[xi].style.display = 'none';

    /* cards + spans + markers */
    let activeIdx = -1, activeAlpha = 0;
    E.forEach((ev, i) => {
      const s = i + 1;
      let alpha = 0;
      if (seg === s) alpha = ss(0.42, 0.5, u);
      else if (seg === s + 1) alpha = 1 - ss(0, 0.18, u);
      const c = cardEls[i];
      c.style.opacity = alpha;
      c.style.transform = 'translateY(' + ((1 - alpha) * 16) + 'px)';
      c.style.visibility = alpha > 0.01 ? 'visible' : 'hidden';
      if (alpha > activeAlpha) { activeAlpha = alpha; activeIdx = i; }

      // per-event dots stay hidden: the late events overlap in the locked
      // view, so the pulsing tip is the single pointer instead.
      marks[i].style.display = 'none';

      // span rect
      if (ev.span) {
        const r = spanRects[i];
        const passed = drawYear >= ev.anchor;
        const sa = Math.max(alpha, passed ? 0.45 : 0);
        if (sa > 0.01) {
          const x0 = clamp(P.x(ev.span[0]), M.l, W - M.r), x1 = clamp(P.x(ev.span[1]), M.l, W - M.r);
          r.setAttribute('x', x0); r.setAttribute('width', Math.max(0, x1 - x0));
          r.setAttribute('y', M.t); r.setAttribute('height', IH);
          r.style.opacity = sa; r.style.display = '';
        } else r.style.display = 'none';
      }
    });

    // active ring + leader
    if (activeIdx >= 0 && activeAlpha > 0.02) {
      const ev = E[activeIdx];
      const px = P.x(ev.anchor), py = P.y(H.tempAt(ev.anchor));
      ring.setAttribute('cx', px); ring.setAttribute('cy', py);
      ring.style.opacity = activeAlpha; ring.style.display = '';
      const c = cardEls[activeIdx];
      const cx = c.offsetLeft + c.offsetWidth / 2, cy = c.offsetTop + c.offsetHeight / 2;
      let dx = px - cx, dy = py - cy;
      const tx = dx !== 0 ? (c.offsetWidth / 2 + 10) / Math.abs(dx) : 9;
      const ty = dy !== 0 ? (c.offsetHeight / 2 + 10) / Math.abs(dy) : 9;
      const t0 = Math.min(tx, ty, 1);
      const len = Math.hypot(dx, dy) || 1;
      const gap = 16 / len;
      leader.setAttribute('x1', cx + dx * t0); leader.setAttribute('y1', cy + dy * t0);
      leader.setAttribute('x2', cx + dx * (1 - gap)); leader.setAttribute('y2', cy + dy * (1 - gap));
      leader.style.opacity = activeAlpha; leader.style.display = '';
    } else { ring.style.display = 'none'; leader.style.display = 'none'; }

    /* tip */
    if (drawYear > 1850.5) {
      const px = P.x(drawYear), py = P.y(tTip);
      tipDot.setAttribute('cx', px); tipDot.setAttribute('cy', py);
      tipHalo.setAttribute('cx', px); tipHalo.setAttribute('cy', py);
      tipHalo.setAttribute('r', 13 + Math.sin(now / 380) * 3.5);
      // label sits to the right of the point (line/leader always approach
      // from the lower-left in this locked view), so text never crosses them
      tipLab.setAttribute('text-anchor', 'start');
      tipLab.setAttribute('x', clamp(px + 34, M.l + 20, W - M.r - 180));
      tipLab.setAttribute('y', py + 6);
      tipLab.textContent = Math.floor(drawYear) + ' · ' + fmtT(tTip);
      gTip.style.display = '';
    } else gTip.style.display = 'none';

    /* overlays */
    const introA = seg === 0 ? 1 - ss(0.55, 0.95, u) : 0;
    intro.style.opacity = introA;
    intro.style.visibility = introA > 0.01 ? 'visible' : 'hidden';
    const endA = seg === SEGS - 1 ? ss(0.5, 0.8, u) : 0;
    endcap.style.opacity = endA;
    endcap.style.visibility = endA > 0.01 ? 'visible' : 'hidden';
    header.style.opacity = clamp((g - 0.8) / 0.4, 0, 1) * (1 - endA * 0.65);
    // fade the chart back as the endcap resolves, so the final copy reads clean
    svg.style.opacity = 1 - endA * 0.82;
    pbar.style.width = (pCur * 100) + '%';
  }
  requestAnimationFrame(render);

  /* ---------- autoplay (exhibit loop) ---------- */
  let apPos = 0, apHoldUntil = 0, pauseUntil = 0;
  function autoplayStep(dt, now) {
    const cfg = window.__warmCfg || {};
    if (!cfg.autoplay) { apPos = window.scrollY; return; }
    if (now < pauseUntil) { apPos = window.scrollY; return; }
    if (now < apHoldUntil) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const segScroll = max / SEGS;
    // move at whatever pace clears the current segment in its reading time
    const seg = clamp(Math.floor(apPos / segScroll), 0, SEGS - 1);
    const speed = segScroll / segDur[seg] * (cfg.speed || 1);
    apPos += speed * dt;
    if (apPos >= max) { apPos = max; apHoldUntil = now + 4500 + 1; window.scrollTo(0, max); setTimeout(() => { apPos = 0; window.scrollTo(0, 0); }, 4500); return; }
    window.scrollTo(0, apPos);
  }
  // user interaction pauses autoplay briefly
  const bump = () => { pauseUntil = performance.now() + 8000; };
  window.addEventListener('wheel', bump, { passive: true });
  window.addEventListener('touchstart', bump, { passive: true });

  /* ---------- keyboard step nav ---------- */
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft' && ev.key !== ' ') return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const segH = max / SEGS;
    const cur = Math.round(window.scrollY / segH);
    const next = clamp(cur + ((ev.key === 'ArrowLeft') ? -1 : 1), 0, SEGS);
    // land mid-hold of the target segment
    window.scrollTo({ top: clamp((next + 0.72) * segH - 0.72 * segH * (next === 0 ? 1 : 0), 0, max), behavior: 'smooth' });
    ev.preventDefault();
  });
})();
