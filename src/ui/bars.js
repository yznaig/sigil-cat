// Safari's bar strips (loadbars lane, p8 follow-up). iPhone Safari fills the strips under its status bar and toolbar
// with the page's root background colour (hush.css: --bars, the colour a grey sheet makes at the screen's edges while
// one is up); older Safari fills them with the theme-color instead. This keeps the theme-color the root's colour, so
// both agree: checked whenever something is added to or taken from the page (the sheets are), and inside a book (its
// "are you sure" card).
export function watchBars() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta || typeof MutationObserver !== 'function') return () => {};
  const root = document.documentElement, watched = new WeakSet();
  const sync = () => {
    const c = getComputedStyle(root).backgroundColor;
    if (c && !/^rgba\(.*, 0\)$|^transparent$/.test(c) && meta.content !== c) meta.content = c;
    for (const pop of document.querySelectorAll('body > .book-pop')) if (!watched.has(pop)) { watched.add(pop); seen.observe(pop, { childList: true }); }
  };
  const seen = new MutationObserver(sync);
  seen.observe(document.body, { childList: true });
  // the settings screen is always in the page and is shown by its hidden attribute (src/ui/settings.js)
  const settings = document.getElementById('settings');
  if (settings) seen.observe(settings, { attributes: true, attributeFilter: ['hidden'] });
  sync();
  return sync;
}
