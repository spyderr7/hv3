(() => {
  'use strict';
  // Living grid. One fixed canvas sits between the section backgrounds and their copy:
  // each section paints its own colour, the canvas draws the lines in that section's line colour
  // (clipped to the section), so copy never sits on a colour that changed under it.
  const canvas = document.getElementById('hv-grid');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const root = document.documentElement;
  const body = document.body;
  const nav = document.getElementById('nav');
  const readout = document.getElementById('modeReadout');
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionOn = !reduceMQ.matches;
  const T = k => (window.HV && window.HV.t ? window.HV.t(k) : k);

  // ---------- colour schemes (match the section classes in CSS) ----------
  const SCHEMES = {
    violet: { line: [255, 255, 255], a: 0.17, hi: [255, 255, 255], ha: 0.95, acc: [0, 204, 102], txt: [255, 255, 255], node: [255, 255, 255] },
    green:  { line: [255, 255, 255], a: 0.34, hi: [255, 255, 255], ha: 1.0, acc: [76, 2, 232], txt: [13, 12, 18], node: [76, 2, 232] },
    white:  { line: [76, 2, 232], a: 0.12, hi: [76, 2, 232], ha: 0.8, acc: [76, 2, 232], txt: [13, 12, 18], node: [76, 2, 232] },
    yellow: { line: [35, 31, 32], a: 0.17, hi: [255, 255, 255], ha: 1.0, acc: [35, 31, 32], txt: [35, 31, 32], node: [35, 31, 32] }
  };
  const COLOR_KEYS = ['hi', 'acc', 'txt', 'node'];
  let scheme = SCHEMES.violet;
  const cur = {};
  const copyScheme = () => { for (const k of COLOR_KEYS) cur[k] = scheme[k].slice(); };
  copyScheme();

  // ---------- grid modes ----------
  const MODES = ['fabric', 'calm', 'modules', 'frames', 'process', 'pipeline', 'face', 'logo'];
  const CFG = {
    fabric:   { lens: 1.0,  alpha: 1.0,  hiR: 300, hi: 1.0,  amb: 1.0 },
    calm:     { lens: 0.22, alpha: 0.8,  hiR: 260, hi: 0.5,  amb: 0.35 },
    modules:  { lens: 0.6,  alpha: 1.1,  hiR: 300, hi: 0.9,  amb: 0.3 },
    frames:   { lens: 0.5,  alpha: 1.0,  hiR: 320, hi: 0.9,  amb: 0.2 },
    process:  { lens: 0.35, alpha: 0.5,  hiR: 280, hi: 0.45, amb: 0.3 },
    pipeline: { lens: 0.35, alpha: 0.5,  hiR: 280, hi: 0.45, amb: 0.3 },
    face:     { lens: 0.0,  alpha: 1.6,  hiR: 560, hi: 0.95, amb: 0.0 },
    logo:     { lens: 0.3,  alpha: 1.3,  hiR: 460, hi: 0.9,  amb: 0.0 }
  };
  const wt = {};
  for (const m of MODES) wt[m] = m === 'fabric' ? 1 : 0;
  let target = 'fabric';

  let W = 1, H = 1, DPR = 1, CELL = 48, NX = 2, NY = 2, SV = 2, SH = 2, X0 = 0, Y0 = 0, SIG2 = 45000;
  let intensity = 1, time = 0, last = 0, raf = 0, running = false, seamPx = 0, smooth = true;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, pt: 0, lastMove: -1e9 };
  const ripples = [];
  let lastRipple = 0;
  const mix = { lens: 0, alpha: 1, hiR: 300, hi: 1, amb: 0 };
  const o = { x: 0, y: 0 };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rgb = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const pad2 = n => String(Math.max(0, n)).padStart(2, '0');
  const MONO = '500 11px "Space Grotesk", ui-sans-serif, system-ui, sans-serif';
  const LABEL = '700 13px "Barlow Condensed", "Arial Narrow", sans-serif';

  // paired lines: cards (modules) and 16:9 frames with gutters
  let PM = null, PF = null;
  function makePairs(cw, ch, g) {
    const spanX = Math.floor((NX - 1) / 2) * (cw + g) + ((NX - 1) % 2) * cw;
    const spanY = Math.floor((NY - 1) / 2) * (ch + g) + ((NY - 1) % 2) * ch;
    return { cw, ch, g, ox: (W - spanX) / 2, oy: (H - spanY) / 2 };
  }
  const pairX = (P, i) => P.ox + Math.floor(i / 2) * (P.cw + P.g) + (i % 2) * P.cw;
  const pairY = (P, j) => P.oy + Math.floor(j / 2) * (P.ch + P.g) + (j % 2) * P.ch;

  // face: a procedural head drawn as a wireframe from the same lines
  const face = { cx: 0, cy: 0, S: 100, A: 0.74, vr: new Float32Array(2), yaw: 0, pitch: 0, cy1: 1, sy1: 0, cp: 1, sp: 0 };
  function faceHalf(v) {
    if (v <= -1 || v >= 1) return 0;
    const hw = face.A * Math.sqrt(1 - v * v);
    return hw * (v > 0 ? 1 - 0.34 * v * v : 1 - 0.08 * v * v);
  }
  function faceZ(u, v) {
    const A = face.A;
    const e = 1 - (u / A) * (u / A) - v * v;
    let z = e > 0 ? Math.sqrt(e) * 0.55 : 0;
    const g = (x, y, sx, sy) => { const dx = (u - x) / sx, dy = (v - y) / sy; return Math.exp(-0.5 * (dx * dx + dy * dy)); };
    z += 0.07 * g(0, -0.3, 0.42, 0.06);                                   // brow ridge
    z -= 0.13 * (g(-0.3, -0.12, 0.13, 0.08) + g(0.3, -0.12, 0.13, 0.08)); // eye sockets
    z += 0.05 * (g(-0.3, -0.12, 0.06, 0.04) + g(0.3, -0.12, 0.06, 0.04)); // eyes
    z += 0.17 * g(0, 0.02, 0.065, 0.2);                                   // nose bridge
    z += 0.12 * g(0, 0.2, 0.09, 0.06);                                    // nose tip
    z += 0.04 * (g(-0.09, 0.24, 0.05, 0.04) + g(0.09, 0.24, 0.05, 0.04)); // nostrils
    z += 0.05 * (g(-0.42, 0.1, 0.14, 0.12) + g(0.42, 0.1, 0.14, 0.12));   // cheekbones
    z += 0.05 * g(0, 0.5, 0.2, 0.045);                                    // upper lip
    z -= 0.035 * g(0, 0.545, 0.17, 0.012);                                // mouth line
    z += 0.035 * g(0, 0.59, 0.16, 0.035);                                 // lower lip
    z += 0.06 * g(0, 0.83, 0.13, 0.09);                                   // chin
    return z;
  }
  function faceProject(u, v, out) {
    const S = face.S;
    const x = u * S, y = v * S * 1.2, z = faceZ(u, v) * S;
    const x1 = x * face.cy1 + z * face.sy1, z1 = z * face.cy1 - x * face.sy1;
    const y1 = y * face.cp - z1 * face.sp, z2 = z1 * face.cp + y * face.sp;
    const f = 1 / (1 - z2 / (S * 6));
    out.x = face.cx + x1 * f;
    out.y = face.cy + y1 * f;
  }
  function buildFace() {
    const narrow = W < 900;
    face.S = Math.min(H * 0.33, narrow ? W * 0.38 : W * 0.2);
    face.cx = narrow ? W * 0.62 : W * 0.72;
    face.cy = H * (narrow ? 0.56 : 0.53);
    face.vr = new Float32Array(NX * 2);
    for (let i = 0; i < NX; i++) {
      const u = -face.A + 2 * face.A * (i / (NX - 1));
      let vmin = 2, vmax = -2;
      for (let s = 0; s <= 400; s++) {
        const v = -1 + s / 200;
        if (Math.abs(u) <= faceHalf(v)) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
      }
      if (vmin > vmax) { vmin = 0; vmax = 0; }
      face.vr[2 * i] = vmin;
      face.vr[2 * i + 1] = vmax;
    }
  }

  // logo: the classic mark (flag + two stems + crossbar), 105 x 80 units, stroke 14
  const logo = { ox: 0, oy: 0, s: 1, cx: 0, cy: 0, nF: 1, nL: 1, nR: 1, nFH: 1, nC: 1 };
  function buildLogo() {
    const narrow = W < 900;
    logo.s = Math.min((narrow ? W * 0.5 : W * 0.38) / 105, (H * (narrow ? 0.32 : 0.5)) / 80);
    logo.cx = narrow ? W * 0.6 : W * 0.72;
    logo.cy = H * 0.5;
    logo.ox = logo.cx - 52.5 * logo.s;
    logo.oy = logo.cy - 40 * logo.s;
    logo.nL = Math.round(NX * 0.37);
    logo.nR = Math.round(NX * 0.37);
    logo.nF = Math.max(1, NX - logo.nL - logo.nR);
    logo.nFH = Math.round(NY * 0.45);
    logo.nC = Math.max(1, NY - logo.nFH);
  }

  // node graphs drawn over a dimmed lattice: jeden.ai (inputs -> nodes -> formats) and the production process
  const graphs = { pipeline: { nodes: [], edges: [] }, process: { nodes: [], edges: [] } };
  function buildGraphs() {
    const narrow = W < 900;
    const col = f => Math.round((W * f - X0) / CELL);
    const row = f => Math.round((H * f - Y0) / CELL);
    // jeden.ai
    const cI = col(narrow ? 0.12 : 0.52), cN = col(narrow ? 0.46 : 0.68), cO = col(narrow ? 0.8 : 0.84);
    const ins = ['cv.in1', 'cv.in2', 'cv.in3'].map((k, i) => ({ c: cI, r: row(0.32 + i * 0.18), k, kind: 'src' }));
    const mids = ['cv.n1', 'cv.n2', 'cv.n3', 'cv.n4'].map((k, i) => ({ c: cN, r: row(0.26 + i * 0.16), k, kind: 'proc' }));
    const outs = ['cv.o1', 'cv.o2', 'cv.o3', 'cv.o4'].map((k, i) => ({ c: cO, r: row(0.26 + i * 0.16), k, kind: 'out' }));
    const pe = [];
    for (const a of ins) for (const b of mids) pe.push([a, b]);
    mids.forEach((m, i) => { pe.push([m, outs[i]]); pe.push([m, outs[(i + 1) % 4]]); });
    graphs.pipeline = { nodes: ins.concat(mids, outs), edges: pe };
    // production process: a two-row snake, 8 steps
    const xs = narrow ? [0.12, 0.37, 0.63, 0.88] : [0.56, 0.67, 0.78, 0.89];
    const y1 = row(narrow ? 0.78 : 0.36), y2 = row(narrow ? 0.9 : 0.6);
    const steps = [];
    for (let i = 0; i < 8; i++) {
      const top = i < 4;
      const xi = top ? i : 7 - i;
      steps.push({ c: col(xs[xi]), r: top ? y1 : y2, k: 'cv.p' + (i + 1), kind: i === 0 ? 'src' : i === 7 ? 'out' : 'proc', below: true });
    }
    const se = [];
    for (let i = 0; i < 7; i++) se.push([steps[i], steps[i + 1]]);
    graphs.process = { nodes: steps, edges: se, straight: true };
  }

  // base positions: each mode maps (line index, t along the line) to a point
  const VF = {}, HF = {};
  VF.fabric = VF.calm = VF.pipeline = VF.process = (i, t, p) => { p.x = X0 + i * CELL; p.y = -CELL + t * (H + 2 * CELL); };
  HF.fabric = HF.calm = HF.pipeline = HF.process = (j, t, p) => { p.y = Y0 + j * CELL; p.x = -CELL + t * (W + 2 * CELL); };
  VF.modules = (i, t, p) => { p.x = pairX(PM, i); p.y = -CELL + t * (H + 2 * CELL); };
  HF.modules = (j, t, p) => { p.y = pairY(PM, j); p.x = -CELL + t * (W + 2 * CELL); };
  VF.frames = (i, t, p) => { p.x = pairX(PF, i); p.y = -CELL + t * (H + 2 * CELL); };
  HF.frames = (j, t, p) => { p.y = pairY(PF, j); p.x = -CELL + t * (W + 2 * CELL); };
  VF.face = (i, t, p) => {
    const u = -face.A + 2 * face.A * (i / (NX - 1));
    const a = face.vr[2 * i], b = face.vr[2 * i + 1];
    faceProject(u, a + (b - a) * t, p);
  };
  HF.face = (j, t, p) => {
    const v = -0.97 + 1.94 * (j / (NY - 1));
    const hw = faceHalf(v);
    faceProject(-hw + 2 * hw * t, v, p);
  };
  VF.logo = (i, t, p) => {
    let x, y1;
    if (i < logo.nF) { x = (i + 0.5) / logo.nF * 43; y1 = 14; }
    else if (i < logo.nF + logo.nL) { x = 43 + (i - logo.nF + 0.5) / logo.nL * 14; y1 = 80; }
    else { x = 91 + (i - logo.nF - logo.nL + 0.5) / logo.nR * 14; y1 = 80; }
    p.x = logo.ox + x * logo.s;
    p.y = logo.oy + y1 * t * logo.s;
  };
  HF.logo = (j, t, p) => {
    let y, xa, xb;
    if (j < logo.nFH) { y = (j + 0.5) / logo.nFH * 14; xa = 0; xb = 57; }
    else { y = 33 + (j - logo.nFH + 0.5) / logo.nC * 14; xa = 43; xb = 105; }
    p.x = logo.ox + (xa + (xb - xa) * t) * logo.s;
    p.y = logo.oy + y * logo.s;
  };

  // ---------- sections ----------
  const scenes = Array.from(document.querySelectorAll('[data-mode]'));
  function linkScenes() {
    scenes.forEach((s, i) => {
      const prev = i ? scenes[i - 1].dataset.bg : s.dataset.bg;
      s.dataset.prev = prev;
      s.style.setProperty('--prev-bg', 'var(--c-' + prev + ')');
    });
  }
  function applySeam() {
    seamPx = smooth ? Math.round(clamp(H * 0.2, 110, 210)) : 0;
    root.style.setProperty('--seam', seamPx + 'px');
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, root.clientWidth || window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CELL = W < 640 ? 36 : W < 1100 ? 44 : 48;
    const step = W < 640 ? 15 : 12;
    NX = Math.ceil(W / CELL) + 3;
    NY = Math.ceil(H / CELL) + 3;
    X0 = (W - (NX - 1) * CELL) / 2;
    Y0 = (H - (NY - 1) * CELL) / 2;
    SV = Math.ceil((H + 2 * CELL) / step) + 1;
    SH = Math.ceil((W + 2 * CELL) / step) + 1;
    const sig = clamp(W * 0.1, 110, 170);
    SIG2 = 2 * sig * sig;
    PM = makePairs(CELL * 3, CELL * 3, CELL * 0.5);
    const fw = CELL * (W < 640 ? 3.2 : 4);
    PF = makePairs(fw, fw * 9 / 16, CELL * 0.5);
    buildFace();
    buildLogo();
    buildGraphs();
    applySeam();
    if (ptr.lastMove < 0) { ptr.x = ptr.tx = W * 0.62; ptr.y = ptr.ty = H * 0.45; }
    requestDraw();
  }

  function displace(p) {
    const k = mix.lens;
    if (k > 1e-4) {
      const dx = ptr.x - p.x, dy = ptr.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < SIG2 * 5) { const f = k * Math.exp(-d2 / SIG2); p.x += dx * f; p.y += dy * f; }
    }
    for (let r = 0; r < ripples.length; r++) {
      const R = ripples[r];
      const dx = p.x - R.x, dy = p.y - R.y, d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      const q = (d - R.rad) / R.wid;
      if (q > -3 && q < 3) {
        const m = -q * R.amp * R.life * Math.exp(-0.5 * q * q);
        p.x += (dx / d) * m;
        p.y += (dy / d) * m;
      }
    }
    if (mix.amb > 0.01) {
      p.x += Math.cos(p.y * 0.005 + time * 0.0005) * mix.amb;
      p.y += Math.sin(p.x * 0.006 + time * 0.0007) * mix.amb;
    }
  }

  // modes currently visible, with normalised eased weights
  const actV = [], actH = [], actE = [], actM = [];
  function prepAct() {
    actV.length = actH.length = actE.length = actM.length = 0;
    let s = 0;
    for (let n = 0; n < MODES.length; n++) {
      const m = MODES[n], x = wt[m], e = x * x * (3 - 2 * x);
      if (e > 0.002) { actV.push(VF[m]); actH.push(HF[m]); actE.push(e); actM.push(m); s += e; }
    }
    for (let n = 0; n < actE.length; n++) actE[n] /= s;
  }
  function posV(i, t) {
    let x = 0, y = 0;
    for (let n = 0; n < actE.length; n++) { actV[n](i, t, o); x += o.x * actE[n]; y += o.y * actE[n]; }
    o.x = x; o.y = y; displace(o);
  }
  function posH(j, t) {
    let x = 0, y = 0;
    for (let n = 0; n < actE.length; n++) { actH[n](j, t, o); x += o.x * actE[n]; y += o.y * actE[n]; }
    o.x = x; o.y = y; displace(o);
  }

  // ---------- focus bracket (viewfinder corners) ----------
  const br = { x0: 0, y0: 0, x1: 0, y1: 0, ok: false, lab: '', rec: false };
  function bracketTarget() {
    let dom = 'fabric', best = -1;
    for (const m of ['fabric', 'calm', 'modules', 'frames']) if (wt[m] > best) { best = wt[m]; dom = m; }
    if (dom === 'modules' || dom === 'frames') {
      const P = dom === 'modules' ? PM : PF;
      const px = P.cw + P.g, py = P.ch + P.g;
      const p = Math.floor((ptr.x - P.ox) / px), q = Math.floor((ptr.y - P.oy) / py);
      const xa = P.ox + p * px, ya = P.oy + q * py;
      const lab = dom === 'modules' ? T('cv.module') + ' ' + pad2(p) + '·' + pad2(q) : T('cv.scene') + ' ' + pad2(p) + ' · ' + T('cv.shot') + ' ' + pad2(q);
      return [xa, ya, xa + P.cw, ya + P.ch, lab, dom === 'frames'];
    }
    const i = Math.floor((ptr.x - X0) / CELL), j = Math.floor((ptr.y - Y0) / CELL);
    const xa = X0 + i * CELL, ya = Y0 + j * CELL;
    return [xa, ya, xa + CELL, ya + CELL, 'x ' + pad2(i) + ' · y ' + pad2(j), false];
  }
  function timecode() {
    const f = Math.floor(time / 40);
    return '00:' + pad2(Math.floor(f / 1500) % 60) + ':' + pad2(Math.floor(f / 25) % 60) + ':' + pad2(f % 25);
  }

  // ---------- simulation step ----------
  function step(dt) {
    time += dt;
    const idle = performance.now() - ptr.lastMove > 3200;
    if (idle) {
      ptr.tx = W * (0.6 + 0.24 * Math.sin(time * 0.00029));
      ptr.ty = H * (0.48 + 0.22 * Math.sin(time * 0.00043 + 1.1));
    }
    const a = 1 - Math.exp(-dt / (idle ? 260 : 80));
    ptr.x += (ptr.tx - ptr.x) * a;
    ptr.y += (ptr.ty - ptr.y) * a;

    const aw = 1 - Math.exp(-dt / 360);
    for (const m of MODES) wt[m] += ((m === target ? 1 : 0) - wt[m]) * aw;
    computeMix(true);

    const ac = 1 - Math.exp(-dt / 260);
    for (const k of COLOR_KEYS) for (let n = 0; n < 3; n++) cur[k][n] += (scheme[k][n] - cur[k][n]) * ac;

    for (let r = ripples.length - 1; r >= 0; r--) {
      const R = ripples[r];
      R.rad += R.v * dt;
      R.life -= dt / R.dur;
      if (R.life <= 0) ripples.splice(r, 1);
    }

    const tyaw = clamp((ptr.x - face.cx) / (W * 0.45), -1, 1) * 0.5;
    const tpitch = clamp((face.cy - ptr.y) / (H * 0.5), -1, 1) * 0.26;
    face.yaw += (tyaw - face.yaw) * a;
    face.pitch += (tpitch - face.pitch) * a;

    const bt = bracketTarget();
    const ab = 1 - Math.exp(-dt / 70);
    if (!br.ok) { br.x0 = bt[0]; br.y0 = bt[1]; br.x1 = bt[2]; br.y1 = bt[3]; br.ok = true; }
    br.x0 += (bt[0] - br.x0) * ab; br.y0 += (bt[1] - br.y0) * ab;
    br.x1 += (bt[2] - br.x1) * ab; br.y1 += (bt[3] - br.y1) * ab;
    br.lab = bt[4]; br.rec = bt[5];
  }

  function computeMix(animated) {
    mix.lens = mix.alpha = mix.hiR = mix.hi = mix.amb = 0;
    for (const m of MODES) {
      const e = wt[m], c = CFG[m];
      mix.lens += e * c.lens; mix.alpha += e * c.alpha; mix.hiR += e * c.hiR; mix.hi += e * c.hi; mix.amb += e * c.amb;
    }
    mix.lens *= animated ? 0.36 * intensity : 0;
    mix.amb *= animated ? intensity : 0;
  }

  // ---------- regions: the sections currently on screen ----------
  const regions = [];
  let activeRegion = null;
  function computeRegions() {
    regions.length = 0;
    activeRegion = null;
    for (const s of scenes) {
      const r = s.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= H) continue;
      const g = { top: r.top, bottom: r.bottom, own: SCHEMES[s.dataset.bg], prev: SCHEMES[s.dataset.prev] || SCHEMES[s.dataset.bg], ownKey: s.dataset.bg, prevKey: s.dataset.prev || s.dataset.bg, el: s };
      regions.push(g);
      if (s === activeScene) activeRegion = g;
    }
    // the nav follows whatever colour sits under it
    const y = 34;
    for (const g of regions) {
      if (y >= g.top && y < g.bottom) {
        const k = seamPx > 0 && y - g.top < seamPx * 0.5 ? g.prevKey : g.ownKey;
        if (body.dataset.nav !== k) body.dataset.nav = k;
        break;
      }
    }
  }

  // ---------- drawing ----------
  function focusCenter() {
    let x = 0, y = 0;
    for (let n = 0; n < actM.length; n++) {
      const m = actM[n], e = actE[n];
      if (m === 'face') { x += (face.cx + (ptr.x - face.cx) * 0.25) * e; y += (face.cy + (ptr.y - face.cy) * 0.25) * e; }
      else if (m === 'logo') { x += (logo.cx + (ptr.x - logo.cx) * 0.3) * e; y += (logo.cy + (ptr.y - logo.cy) * 0.3) * e; }
      else { x += ptr.x * e; y += ptr.y * e; }
    }
    return [x, y];
  }

  function draw() {
    prepAct();
    computeRegions();
    face.cy1 = Math.cos(face.yaw); face.sy1 = Math.sin(face.yaw);
    face.cp = Math.cos(face.pitch); face.sp = Math.sin(face.pitch);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!regions.length) return;

    const path = new Path2D();
    for (let i = 0; i < NX; i++) {
      for (let k = 0; k < SV; k++) { posV(i, k / (SV - 1)); if (k) path.lineTo(o.x, o.y); else path.moveTo(o.x, o.y); }
    }
    for (let j = 0; j < NY; j++) {
      for (let k = 0; k < SH; k++) { posH(j, k / (SH - 1)); if (k) path.lineTo(o.x, o.y); else path.moveTo(o.x, o.y); }
    }
    // on phones the scene art sits behind the copy, so it steps back a little
    const dim = W < 900 ? 1 - 0.5 * (wt.pipeline + wt.process) - 0.62 * (wt.face + wt.logo) : 1;
    const c = focusCenter();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    for (const g of regions) {
      const top = Math.max(0, g.top), bot = Math.min(H, g.bottom);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, bot - top);
      ctx.clip();
      let st;
      if (seamPx > 0 && g.prev !== g.own && g.top + seamPx > 0) {
        const lg = ctx.createLinearGradient(0, g.top, 0, g.top + seamPx);
        lg.addColorStop(0, rgba(g.prev.line, g.prev.a * mix.alpha * dim));
        lg.addColorStop(1, rgba(g.own.line, g.own.a * mix.alpha * dim));
        st = lg;
      } else {
        st = rgba(g.own.line, g.own.a * mix.alpha * dim);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = st;
      ctx.stroke(path);
      if (mix.hi > 0.01) {
        const rg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], Math.max(10, mix.hiR));
        const a = g.own.ha * mix.hi * dim;
        rg.addColorStop(0, rgba(g.own.hi, a));
        rg.addColorStop(0.38, rgba(g.own.hi, a * 0.38));
        rg.addColorStop(1, rgba(g.own.hi, 0));
        ctx.strokeStyle = rg;
        ctx.lineWidth = 1.3;
        ctx.stroke(path);
      }
      ctx.restore();
    }

    // overlays belong to the active section and never spill into its neighbours
    if (!activeRegion) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, Math.max(0, activeRegion.top + seamPx * 0.6), W, Math.min(H, activeRegion.bottom) - Math.max(0, activeRegion.top + seamPx * 0.6));
    ctx.clip();
    const geo = wt.face + wt.logo;
    const graph = wt.pipeline + wt.process;
    const nodesA = (wt.fabric + wt.calm * 0.4 + wt.modules * 0.7) * (1 - geo);
    if (nodesA > 0.03) drawNodes(nodesA);
    if (fade(wt.frames) > 0) drawFrames(fade(wt.frames));
    const brA = (wt.fabric + wt.calm * 0.5 + wt.modules + wt.frames) * (1 - geo - graph);
    if (brA > 0.03) drawBracket(brA);
    // on narrow screens the diagrams sit behind one column of copy: fainter, and without labels
    const gA = W < 900 ? 0.45 : 1;
    if (fade(wt.pipeline) > 0) drawGraph(graphs.pipeline, fade(wt.pipeline) * dim * gA);
    if (fade(wt.process) > 0) drawGraph(graphs.process, fade(wt.process) * dim * gA);
    // on narrow screens the face also drops the pupils, scan line and labels
    if (fade(wt.face) > 0 && W >= 900) drawFaceExtras(fade(wt.face));
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function fade(w) { return w > 0.1 ? (w - 0.1) / 0.9 : 0; }

  // keep canvas labels inside the page gutter
  function labelX(x, w, align) {
    const g = 20, left = align === 'center' ? x - w / 2 : x;
    return x + Math.max(0, g - left) + Math.min(0, W - g - (left + w));
  }

  function latticeNode(i, j) {
    let x = 0, y = 0, s = 0;
    for (let n = 0; n < actM.length; n++) {
      const m = actM[n];
      if (m === 'face' || m === 'logo') continue;
      const e = actE[n];
      actV[n](i, 0.5, o); x += o.x * e;
      actH[n](j, 0.5, o); y += o.y * e;
      s += e;
    }
    if (s < 1e-3) return false;
    o.x = x / s; o.y = y / s;
    displace(o);
    return true;
  }

  function drawNodes(alpha) {
    const R = 240;
    ctx.fillStyle = rgb(cur.node);
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        if (!latticeNode(i, j)) continue;
        const dx = o.x - ptr.x, dy = o.y - ptr.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > R) continue;
        const k = 1 - d / R, s = 1.2 + 2.6 * k * k;
        ctx.globalAlpha = alpha * k * 0.9;
        ctx.fillRect(o.x - s / 2, o.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  function corners(xa, ya, xb, yb) {
    return [[xa, ya], [xb, ya], [xb, yb], [xa, yb]].map(q => { o.x = q[0]; o.y = q[1]; displace(o); return [o.x, o.y]; });
  }

  function drawBracket(alpha) {
    const q = corners(br.x0, br.y0, br.x1, br.y1);
    const L = clamp((br.x1 - br.x0) * 0.22, 6, 18);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgb(cur.node);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1] + L); ctx.lineTo(q[0][0], q[0][1]); ctx.lineTo(q[0][0] + L, q[0][1]);
    ctx.moveTo(q[1][0] - L, q[1][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.lineTo(q[1][0], q[1][1] + L);
    ctx.moveTo(q[2][0], q[2][1] - L); ctx.lineTo(q[2][0], q[2][1]); ctx.lineTo(q[2][0] - L, q[2][1]);
    ctx.moveTo(q[3][0] + L, q[3][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.lineTo(q[3][0], q[3][1] - L);
    ctx.stroke();
    if (W < 900) { ctx.globalAlpha = 1; return; }
    ctx.font = MONO;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = rgb(cur.txt);
    const tw = ctx.measureText(br.lab).width + (br.rec ? 23 + ctx.measureText('REC 00:00:00:00').width : 0);
    let tx = q[1][0] + 10;
    if (tx + tw > W - 20) tx = q[0][0] - 10 - tw;
    const ty = q[1][1] + 1;
    ctx.fillText(br.lab, tx, ty);
    if (br.rec) {
      tx += ctx.measureText(br.lab).width + 14;
      ctx.fillStyle = 'rgb(255,69,58)';
      if (Math.floor(time / 600) % 2 === 0) { ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = rgb(cur.txt);
      ctx.fillText('REC ' + timecode(), tx + 9, ty);
    }
    ctx.globalAlpha = 1;
  }

  const STAGES = ['cv.idea', 'cv.script', 'cv.look', 'cv.cut'];
  function drawFrames(alpha) {
    const P = PF, px = P.cw + P.g, py = P.ch + P.g;
    const pMax = Math.floor((NX - 2) / 2), qMax = Math.floor((NY - 2) / 2);
    const hp = Math.floor((ptr.x - P.ox) / px), hq = Math.floor((ptr.y - P.oy) / py);
    ctx.font = LABEL;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (let p = 0; p <= pMax; p++) {
      const xa = P.ox + p * px, xb = xa + P.cw;
      if (xb < -60 || xa > W + 60) continue;
      for (let q = 0; q <= qMax; q++) {
        const ya = P.oy + q * py, yb = ya + P.ch;
        if (yb < -60 || ya > H + 60) continue;
        const hv = p === hp && q === hq;
        const h = hash(p, q);
        if (!hv && h < 0.66) continue;
        const c = corners(xa, ya, xb, yb);
        ctx.globalAlpha = alpha * (hv ? 0.16 : 0.05 + 0.035 * Math.sin(time * 0.0012 + h * 40));
        ctx.fillStyle = rgb(cur.acc);
        ctx.beginPath();
        ctx.moveTo(c[0][0], c[0][1]); ctx.lineTo(c[1][0], c[1][1]); ctx.lineTo(c[2][0], c[2][1]); ctx.lineTo(c[3][0], c[3][1]);
        ctx.closePath();
        ctx.fill();
        if (h > 0.9 && !hv && W >= 900) {
          ctx.globalAlpha = alpha * 0.45;
          ctx.fillStyle = rgb(cur.txt);
          ctx.fillText(T(STAGES[Math.floor(h * 1000) % 4]).toUpperCase(), c[0][0] + 8, c[0][1] + 7);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function bez(t, a, b, c, d) { const s = 1 - t; return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d; }

  function drawGraph(G, alpha) {
    const narrow = W < 900;
    const P = new Map();
    for (const n of G.nodes) { o.x = X0 + n.c * CELL; o.y = Y0 + n.r * CELL; displace(o); P.set(n, [o.x, o.y]); }
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgb(cur.acc);
    ctx.globalAlpha = alpha * 0.8;
    ctx.setLineDash([3, 7]);
    ctx.lineDashOffset = -time * 0.03;
    const packets = [];
    G.edges.forEach((ed, k) => {
      const A = P.get(ed[0]), B = P.get(ed[1]);
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      const t = (time * 0.00032 + k * 0.137) % 1;
      if (G.straight) {
        ctx.lineTo(B[0], B[1]);
        packets.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
      } else {
        const mx = (A[0] + B[0]) / 2;
        ctx.bezierCurveTo(mx, A[1], mx, B[1], B[0], B[1]);
        packets.push([bez(t, A[0], mx, mx, B[0]), bez(t, A[1], A[1], B[1], B[1])]);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgb(cur.hi);
    for (const pk of packets) ctx.fillRect(pk[0] - 2, pk[1] - 2, 4, 4);
    ctx.font = LABEL;
    ctx.textBaseline = 'middle';
    for (const n of G.nodes) {
      const q = P.get(n), s = n.kind === 'src' ? 14 : n.kind === 'proc' ? 11 : 9;
      ctx.globalAlpha = alpha;
      if (n.kind === 'proc') {
        ctx.strokeStyle = rgb(cur.acc); ctx.lineWidth = 1.6; ctx.strokeRect(q[0] - s / 2, q[1] - s / 2, s, s);
      } else {
        ctx.fillStyle = rgb(n.kind === 'src' ? cur.hi : cur.acc);
        ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
      if (narrow) continue;
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = rgb(cur.txt);
      const label = T(n.k).toUpperCase(), lw = ctx.measureText(label).width;
      if (n.below) { ctx.textAlign = 'center'; ctx.fillText(label, labelX(q[0], lw, 'center'), q[1] + 20); }
      else if (n.kind === 'out') { ctx.textAlign = 'left'; ctx.fillText(label, labelX(q[0] + 13, lw, 'left'), q[1]); }
      else { ctx.textAlign = 'center'; ctx.fillText(label, labelX(q[0], lw, 'center'), q[1] - 18); }
    }
    ctx.globalAlpha = 1;
  }

  function drawFaceExtras(alpha) {
    // scanning beam in white, the AlterCast secondary colour
    const ph = (time % 4200) / 4200, v = -1.05 + ph * 2.5;
    if (v > -0.96 && v < 0.96) {
      const hw = faceHalf(v);
      ctx.beginPath();
      for (let k = 0; k <= 48; k++) { faceProject(-hw + 2 * hw * (k / 48), v, o); if (k) ctx.lineTo(o.x, o.y); else ctx.moveTo(o.x, o.y); }
      ctx.strokeStyle = 'rgb(255,255,255)';
      ctx.globalAlpha = alpha * 0.35; ctx.lineWidth = 8; ctx.stroke();
      ctx.globalAlpha = alpha; ctx.lineWidth = 1.8; ctx.stroke();
    }
    // pupils follow the cursor, with a blink every few seconds (the dot in AlterCast's C)
    const gx = clamp((ptr.x - face.cx) / W, -0.5, 0.5) * 0.07;
    const gy = clamp((ptr.y - face.cy) / H, -0.5, 0.5) * 0.05;
    const blink = time % 5600 < 150 ? 0.15 : 1;
    const r = Math.max(3, face.S * 0.03);
    ctx.fillStyle = 'rgb(35,31,32)';
    ctx.globalAlpha = alpha;
    for (const ex of [-0.3, 0.3]) {
      faceProject(ex + gx, -0.12 + gy, o);
      ctx.beginPath(); ctx.ellipse(o.x, o.y, r, r * blink, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (W >= 900) {
      faceProject(0.6, -0.8, o);
      ctx.font = LABEL; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const lw = 18 + Math.max(ctx.measureText(T('cv.ac1').toUpperCase()).width, ctx.measureText(T('cv.ac2').toUpperCase()).width);
      const lx = labelX(o.x + 22, lw, 'left'), ly = o.y;
      ctx.fillStyle = 'rgb(255,255,255)'; ctx.fillRect(lx, ly - 5, 10, 10);
      ctx.globalAlpha = alpha * 0.9; ctx.fillStyle = 'rgb(35,31,32)';
      ctx.fillText(T('cv.ac1').toUpperCase(), lx + 18, ly);
      ctx.fillText(T('cv.ac2').toUpperCase(), lx + 18, ly + 18);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- loop ----------
  function loop(now) {
    const dt = Math.min(48, now - last || 16);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || !motionOn || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function snap() {
    for (const m of MODES) wt[m] = m === target ? 1 : 0;
    copyScheme();
    ripples.length = 0;
    face.yaw = -0.35; face.pitch = 0.05;
    computeMix(false);
    const bt = bracketTarget();
    br.x0 = bt[0]; br.y0 = bt[1]; br.x1 = bt[2]; br.y1 = bt[3]; br.lab = bt[4]; br.rec = false; br.ok = true;
  }
  let staticQueued = false;
  function requestDraw() {
    if (running || staticQueued) return;
    staticQueued = true;
    requestAnimationFrame(() => { staticQueued = false; if (running) return; snap(); draw(); });
  }

  function addRipple(x, y, strength, wid) {
    ripples.push({ x, y, rad: 0, wid, amp: 18 * strength * intensity, life: 1, v: 0.62, dur: 1500 });
    if (ripples.length > 10) ripples.shift();
  }

  // ---------- input ----------
  window.addEventListener('pointermove', e => {
    const now = performance.now();
    const dt = Math.max(1, now - ptr.pt), dist = Math.hypot(e.clientX - ptr.px, e.clientY - ptr.py);
    const speed = ptr.pt ? dist / dt : 0;
    ptr.px = e.clientX; ptr.py = e.clientY; ptr.pt = now;
    ptr.tx = e.clientX; ptr.ty = e.clientY; ptr.lastMove = now;
    if (running && e.pointerType === 'mouse' && speed > 1.6 && now - lastRipple > 140) {
      addRipple(e.clientX, e.clientY, Math.min(1, speed / 5) * 0.55, 20);
      lastRipple = now;
    }
  }, { passive: true });
  window.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('a, button, input, textarea, label, select, .panel, figure')) return;
    ptr.tx = e.clientX; ptr.ty = e.clientY; ptr.lastMove = performance.now();
    if (running) addRipple(e.clientX, e.clientY, 1, 30);
  }, { passive: true });
  root.addEventListener('mouseleave', () => { ptr.lastMove = -1e9; });
  window.addEventListener('blur', () => { ptr.lastMove = -1e9; });

  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 80); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    requestDraw();
  }, { passive: true });

  let activeScene = scenes[0];
  function setScene(el) {
    activeScene = el;
    target = el.dataset.mode;
    scheme = SCHEMES[el.dataset.bg] || SCHEMES.violet;
    if (readout) readout.textContent = T('mode.' + target);
    requestDraw();
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) setScene(e.target);
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    scenes.forEach(s => io.observe(s));
  }

  // public hooks for the page script (panel, language)
  window.HVGrid = {
    setIntensity(v) { intensity = v; requestDraw(); },
    setMotion(on) { motionOn = on; if (on) start(); else { stop(); requestDraw(); } },
    setSmooth(on) { smooth = on; applySeam(); requestDraw(); },
    refreshLabels() { if (readout) readout.textContent = T('mode.' + target); requestDraw(); },
    get motion() { return motionOn; }
  };

  linkScenes();
  resize();
  setScene(activeScene);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestDraw());
  start();
})();
