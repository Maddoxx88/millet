const STORAGE_KEY = 'millet-docs.theme';

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
}

function setButtonLabel(btn, mode) {
  const current = mode[0].toUpperCase() + mode.slice(1);
  const next = mode === 'light' ? 'Dark' : 'Light';
  btn.setAttribute('aria-label', `Current theme: ${current}. Switch to ${next}.`);
  btn.textContent = current;
}

function cycleTheme(mode) {
  return mode === 'light' ? 'dark' : 'light';
}

function initThemeToggle() {
  const btn = document.querySelector('[data-docs-theme-toggle]');
  if (!btn) return;

  let mode = getInitialTheme();
  applyTheme(mode);
  setButtonLabel(btn, mode);

  btn.addEventListener('click', () => {
    mode = cycleTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    applyTheme(mode);
    setButtonLabel(btn, mode);
  });
}

function initSectionSpy() {
  const nav = document.querySelector('.docs-nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const targets = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if (!targets.length) return;

  const setCurrent = (id) => {
    links.forEach(a => {
      const href = a.getAttribute('href');
      const isCurrent = href === `#${id}`;
      if (isCurrent) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target?.id) setCurrent(visible.target.id);
  }, { rootMargin: '-30% 0px -65% 0px', threshold: [0.1, 0.2, 0.4, 0.6] });

  targets.forEach(t => observer.observe(t));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initSectionSpy();
  });
} else {
  initThemeToggle();
  initSectionSpy();
}

