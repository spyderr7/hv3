(() => {
  'use strict';
  // Work grid and its overlay, the reel placeholder's timecode, and motion control for every video on the page
  // (reduced motion, the concept panel's "Animate" checkbox, pausing what is off screen).
  const doc = document;
  const root = doc.documentElement;
  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const motionBox = doc.getElementById('motion');
  let motionOn = !reduceMQ.matches;

  // ---------- reel, loops and the slate timecode ----------
  const reel = doc.querySelector('.reel');
  const reelVideo = doc.querySelector('.reel-video');
  const slate = doc.querySelector('.reel-slate');
  const tcEl = slate && slate.querySelector('.reel-tc');
  const videos = Array.from(doc.querySelectorAll('video.reel-video, video.work-loop'));
  const inView = new Set();
  // no player at all: no picture-in-picture or cast button over the reel and the loops
  videos.forEach(v => { v.disablePictureInPicture = true; v.disableRemotePlayback = true; });

  const syncVideo = v => {
    const play = motionOn && inView.has(v) && !doc.hidden;
    if (play && v.paused) {
      const p = v.play();
      if (p && p.catch) p.catch(() => { /* autoplay refused: the first frame stays */ });
    } else if (!play && !v.paused) {
      v.pause();
    }
  };

  // an animated GIF cannot be paused: with motion off it is swapped for a still of its first frame, and back again when
  // motion returns. Needs same-origin pixels; where the browser refuses (file://, another origin) the GIF keeps playing.
  const gifs = Array.from(doc.querySelectorAll('img.work-loop'));
  const stills = new WeakMap();
  const syncGif = img => {
    if (!img.dataset.gif) img.dataset.gif = img.getAttribute('src');
    if (motionOn) {
      if (img.getAttribute('src') !== img.dataset.gif) img.src = img.dataset.gif;
      return;
    }
    if (stills.has(img)) { img.src = stills.get(img); return; }
    const grab = () => {
      try {
        const c = doc.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        stills.set(img, c.toDataURL('image/png'));
        if (!motionOn) img.src = stills.get(img);
      } catch (err) { /* tainted canvas: leave the GIF playing */ }
    };
    if (img.complete && img.naturalWidth) grab(); else img.addEventListener('load', grab, { once: true });
  };

  // 25 fps timecode, HH:MM:SS:FF. It only runs while the slate is shown, on screen and motion is on; otherwise it holds its value.
  const FPS = 25;
  let tcRaf = 0, tcT0 = 0, tcMs = 0, tcShown = -1, slateInView = true;
  const two = n => (n < 10 ? '0' : '') + n;
  const tcText = fr => {
    const s = Math.floor(fr / FPS);
    return two(Math.floor(s / 3600) % 100) + ':' + two(Math.floor(s / 60) % 60) + ':' + two(s % 60) + ':' + two(fr % FPS);
  };
  const tcFrame = now => {
    tcMs += Math.max(0, now - tcT0);
    tcT0 = now;
    const fr = Math.floor(tcMs * FPS / 1000);
    if (fr !== tcShown) { tcShown = fr; tcEl.textContent = tcText(fr); }
    tcRaf = requestAnimationFrame(tcFrame);
  };
  const tcSync = () => {
    if (!tcEl) return;
    const run = motionOn && slateInView && !doc.hidden && slate.offsetParent !== null;
    if (run && !tcRaf) { tcT0 = performance.now(); tcRaf = requestAnimationFrame(tcFrame); }
    else if (!run && tcRaf) { cancelAnimationFrame(tcRaf); tcRaf = 0; }
  };

  const setMotion = on => {
    motionOn = on;
    root.classList.toggle('motion-off', !on);
    videos.forEach(syncVideo);
    gifs.forEach(syncGif);
    tcSync();
  };

  // reduced motion: the videos stay on their first frame (no autoplay) until the person turns motion on
  if (!motionOn) {
    root.classList.add('motion-off');
    videos.forEach(v => { v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); });
    gifs.forEach(syncGif);
  }
  // a reel file the browser cannot play: fall back to the slate instead of an empty black frame
  if (reelVideo && reel) {
    const noVideo = () => { reel.classList.add('no-video'); tcSync(); };
    if (reelVideo.error) noVideo(); else reelVideo.addEventListener('error', noVideo);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.target === slate) { slateInView = e.isIntersecting; tcSync(); return; }
        if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target);
        syncVideo(e.target);
      });
    }, { rootMargin: '120px 0px' });
    videos.forEach(v => io.observe(v));
    if (slate) io.observe(slate);
  } else {
    videos.forEach(v => inView.add(v));
    tcSync();
  }

  // the concept panel checkbox drives the grid animation; the videos and the timecode follow it
  if (motionBox) motionBox.addEventListener('change', () => setMotion(motionBox.checked));
  // the system setting can change while the page is open: follow it through the same checkbox
  const onReduceChange = e => {
    if (motionBox) { motionBox.checked = !e.matches; motionBox.dispatchEvent(new Event('change', { bubbles: true })); }
    else setMotion(!e.matches);
  };
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
  else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);
  doc.addEventListener('visibilitychange', () => { videos.forEach(syncVideo); tcSync(); });

  // ---------- work overlay ----------
  const dlg = doc.getElementById('workDialog');
  const grid = doc.querySelector('.work-grid');
  if (!dlg || !grid || typeof dlg.showModal !== 'function') return;
  const frame = dlg.querySelector('.wd-frame');
  const mediaBox = dlg.querySelector('.wd-media');
  const titleEl = doc.getElementById('wdTitle');
  const subEl = dlg.querySelector('.wd-sub');
  const descEl = dlg.querySelector('.wd-desc');
  const closeBtn = dlg.querySelector('.wd-close');
  let opener = null;

  // stop and drop every media element: nothing keeps playing (or downloading) behind a closed overlay
  const clearMedia = () => {
    mediaBox.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    mediaBox.textContent = '';
  };

  const buildMedia = tile => {
    const film = tile.dataset.film;
    const loop = tile.dataset.loop;
    clearMedia();
    let el;
    if (film) {
      // the full film, with controls; opening it is the person's own request, so it starts
      el = doc.createElement('video');
      el.src = film; el.controls = true; el.autoplay = true; el.playsInline = true;
    } else if (loop && /\.gif(?:[?#]|$)/i.test(loop)) {
      el = doc.createElement('img');
      el.src = loop; el.alt = '';
    } else if (loop) {
      // the loop at full size; with reduced motion it waits on its first frame and gets controls to start it
      el = doc.createElement('video');
      el.src = loop; el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = motionOn; el.controls = !motionOn;
      el.setAttribute('aria-hidden', 'true');
      el.disablePictureInPicture = true; el.disableRemotePlayback = true;
    } else {
      el = doc.createElement('div');
      el.className = 'work-slate';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<b></b><small></small>';
      el.firstChild.textContent = tile.dataset.id || '';
      el.lastChild.innerHTML = window.HV ? window.HV.t('work.slate') : 'Loop · 3 s';
    }
    mediaBox.appendChild(el);
  };

  const open = tile => {
    const item = tile.closest('.work-item') || tile.parentElement;
    const title = tile.querySelector('.work-title');
    const sub = tile.querySelector('.work-sub');
    const desc = item && item.querySelector('.work-desc');
    // text comes from the tile, so it is already in the page language
    titleEl.innerHTML = title ? title.innerHTML : '';
    subEl.innerHTML = sub ? sub.innerHTML : '';
    descEl.innerHTML = desc ? desc.innerHTML : '';
    buildMedia(tile);
    opener = tile;
    if (!dlg.open) dlg.showModal();
    frame.scrollTop = 0;
  };

  grid.addEventListener('click', e => {
    const tile = e.target.closest ? e.target.closest('.work-tile') : null;
    if (tile) open(tile);
  });

  closeBtn.addEventListener('click', () => dlg.close());
  // a click on the backdrop lands on the dialog itself; a drag that starts inside the frame and ends outside must not close it
  let downInFrame = false;
  dlg.addEventListener('pointerdown', e => { downInFrame = frame.contains(e.target); });
  dlg.addEventListener('click', e => {
    if (e.target === dlg && !downInFrame) dlg.close();
    downInFrame = false;
  });
  dlg.addEventListener('close', () => {
    clearMedia();
    const tile = opener;
    opener = null;
    if (tile && tile.isConnected) tile.focus({ preventScroll: true });
  });

  // the page behind does not scroll: wheel and touch on the backdrop are swallowed, and so are they inside the frame when it has nothing to scroll
  const hold = e => {
    const t = e.target;
    const scrolls = frame.scrollHeight > frame.clientHeight + 1;
    if (t !== dlg && (scrolls || (e.type === 'touchmove' && t.closest && t.closest('video')))) return;
    e.preventDefault();
  };
  dlg.addEventListener('wheel', hold, { passive: false });
  dlg.addEventListener('touchmove', hold, { passive: false });
})();
