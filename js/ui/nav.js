// Fixed nav + full-screen mobile menu: aria-expanded, focus trap, Esc to close.

const FOCUSABLE = 'a[href], button:not([disabled])';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function scrollToHash(hash) {
  const target = hash && document.querySelector(hash);
  if (!target) return;
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  history.pushState(null, '', hash);
  target.focus({ preventScroll: true });
}

export function initNav() {
  const toggle = document.querySelector('[data-menu-open]');
  const menu = document.getElementById('menu');
  if (!toggle || !menu) return;

  const closeBtn = menu.querySelector('[data-menu-close]');
  const background = document.querySelectorAll('[data-inert-when-menu]');
  let isOpen = false;

  function open() {
    isOpen = true;
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('is-locked');
    background.forEach((el) => { el.inert = true; });
    document.addEventListener('keydown', onKeydown);
    // visibility flips with the class, so focus on the next frame
    requestAnimationFrame(() => closeBtn.focus());
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('is-locked');
    background.forEach((el) => { el.inert = false; });
    document.removeEventListener('keydown', onKeydown);
    if (restoreFocus) toggle.focus();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = [...menu.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!menu.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', () => close());

  menu.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    close({ restoreFocus: false });
    scrollToHash(link.hash);
  });

  // leaving the mobile layout with the menu open
  matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
    if (event.matches) close({ restoreFocus: false });
  });
}
