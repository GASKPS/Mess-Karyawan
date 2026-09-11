(function () {
  'use strict';
  const root = document.documentElement, key = 'mess-tema';
  const moon = '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/>';
  const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
  function paint(theme) {
    root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('[data-mess-theme]').forEach(button => {
      const dark = root.dataset.theme === 'dark';
      button.setAttribute('aria-label', dark ? 'Gunakan tema terang' : 'Gunakan tema gelap');
      button.title = button.getAttribute('aria-label');
      button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (dark ? sun : moon) + '</svg>';
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = root.dataset.theme === 'dark' ? '#181e25' : '#f4f6f8';
  }
  let initial = 'light';
  try { initial = localStorage.getItem(key) || 'light'; } catch {}
  paint(initial);
  document.addEventListener('DOMContentLoaded', () => {
    paint(root.dataset.theme);
    document.querySelectorAll('[data-mess-theme]').forEach(button => button.addEventListener('click', () => {
      paint(root.dataset.theme === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem(key, root.dataset.theme); } catch {}
    }));
  });
  window.addEventListener('storage', event => { if (event.key === key) paint(event.newValue); });
})();
