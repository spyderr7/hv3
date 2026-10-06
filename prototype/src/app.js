(() => {
  'use strict';
  // Language switch, concept panel, contact form and copy button.
  const DICT = window.HV_I18N || { pl: {}, en: {} };
  let lang = 'pl';
  try { const saved = localStorage.getItem('hv3-lang'); if (saved === 'en' || saved === 'pl') lang = saved; } catch (err) { /* storage unavailable */ }

  const t = k => {
    const d = DICT[lang] || {};
    if (d[k] != null) return d[k];
    return DICT.en && DICT.en[k] != null ? DICT.en[k] : k;
  };
  window.HV = { t, lang: () => lang };

  function apply() {
    document.documentElement.lang = lang;
    const d = DICT[lang] || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = d[el.dataset.i18n];
      if (v != null && el.innerHTML !== v) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const i = pair.indexOf(':');
        const v = d[pair.slice(i + 1)];
        if (v != null) el.setAttribute(pair.slice(0, i), v);
      });
    });
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (d['doc.title']) document.title = d['doc.title'];
    if (window.HVGrid) window.HVGrid.refreshLabels();
  }
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('hv3-lang', lang); } catch (err) { /* storage unavailable */ }
    apply();
  }));

  // navigation menu (below 900px the links live in a panel under the bar)
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  if (nav && navToggle) {
    const isOpen = () => navToggle.getAttribute('aria-expanded') === 'true';
    const setMenu = (open, returnFocus) => {
      nav.classList.toggle('menu-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      if (!open && returnFocus) navToggle.focus();
    };
    navToggle.addEventListener('click', () => setMenu(!isOpen()));
    // any link in the bar closes the menu (the page then scrolls to its section)
    nav.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !isOpen()) return;
      setMenu(false, nav.contains(document.activeElement));
    });
    // a tap outside the bar closes it too
    document.addEventListener('pointerdown', e => { if (isOpen() && !nav.contains(e.target)) setMenu(false); });
    // widening past the breakpoint puts the links back in the bar: reset
    const wide = window.matchMedia('(min-width: 900px)');
    const onWide = e => { if (e.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
  }

  // concept panel
  const toggle = document.getElementById('panelToggle');
  const panelBody = document.getElementById('panelBody');
  toggle.addEventListener('click', () => {
    const open = panelBody.hidden;
    panelBody.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('input[name="trans"]').forEach(r => r.addEventListener('change', () => {
    if (r.checked && window.HVGrid) window.HVGrid.setSmooth(r.value === 'soft');
  }));
  const range = document.getElementById('intensity');
  const out = document.getElementById('intensityOut');
  range.addEventListener('input', () => {
    out.textContent = range.value + '%';
    if (window.HVGrid) window.HVGrid.setIntensity(Number(range.value) / 100);
  });
  const motion = document.getElementById('motion');
  motion.addEventListener('change', () => { if (window.HVGrid) window.HVGrid.setMotion(motion.checked); });
  window.addEventListener('load', () => { if (window.HVGrid) motion.checked = window.HVGrid.motion; });

  // contact form: a prototype, so it only confirms locally
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  form.addEventListener('submit', e => {
    e.preventDefault();
    status.textContent = t('ct.ok');
  });

  // copy the careers address
  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    const done = () => { btn.textContent = t('ca.copied'); setTimeout(() => { btn.textContent = t('ca.copy'); }, 1800); };
    const fallback = () => {
      const code = btn.parentElement.querySelector('code');
      if (!code) return;
      const sel = window.getSelection();
      const rng = document.createRange();
      rng.selectNodeContents(code);
      sel.removeAllRanges();
      sel.addRange(rng);
    };
    try {
      navigator.clipboard.writeText(text).then(done, fallback);
    } catch (err) { fallback(); }
  }));

  apply();
})();
