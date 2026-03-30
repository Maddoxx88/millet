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
  const sections = links
    .map(link => {
      const target = document.querySelector(link.getAttribute('href'));
      return target ? { link, target } : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  const setCurrent = (id) => {
    links.forEach(a => {
      const href = a.getAttribute('href');
      const isCurrent = href === `#${id}`;
      if (isCurrent) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };

  const updateByScroll = () => {
    const marker = window.scrollY + window.innerHeight * 0.28;
    let active = sections[0];

    for (const section of sections) {
      if (section.target.offsetTop <= marker) {
        active = section;
      } else {
        break;
      }
    }

    setCurrent(active.target.id);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateByScroll();
      ticking = false;
    });
  };

  links.forEach(link => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('href').slice(1);
      setCurrent(id);
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1);
    if (id) setCurrent(id);
  });

  updateByScroll();
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

