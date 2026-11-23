// The grimoire's "what he said" page (docs/journey/design.md §5.5): every journey line he has spoken, kept so a hint
// missed in the moment is never lost. Grouped by the secret it hinted (that secret's name once it is found, "something"
// before), newest group first, newest line first in each; the lines that hinted nothing go last, as "in passing".
// Hidden while empty. Saved under 'journey.journal' ([{ id, text, node, at }], newest last, at most JOURNAL.keep).
// It records the journey's 'said' event (src/journey/voice.js emits one per spoken line); journal.add() is the same.
// api (journey.journal): entries(), add({ id, text, node }), html()
import { css } from '../core/util.js';
import { ACHIEVEMENTS } from '../achievements.js';
import { done } from './progress.js';

export const JOURNAL = { key: 'journey.journal', keep: 80, passing: 6, order: 30 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

css('journey-journal', `
.journal { margin: 72px auto 0; max-width: 34em; text-align: center; color: var(--soft); }
.journal h2 { margin: 0 0 6px; font: 800 13px/1.2 var(--type); font-stretch: 125%; letter-spacing: .14em; color: var(--dark); }
.journal .j-lead { margin: 0 0 26px; text-transform: none; letter-spacing: .02em; font: 500 12px/1.6 var(--type); font-stretch: 100%; }
.journal ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; }
.journal h3 { margin: 0 0 6px; font: 800 10.5px/1.2 var(--type); font-stretch: 125%; letter-spacing: .14em; color: var(--soft); }
.journal .found h3 { color: var(--dark); }
.journal .found h3::after { content: " \\2713"; }
.journal ul { list-style: none; margin: 0; padding: 0; }
.journal li li { text-transform: none; letter-spacing: .02em; font: 500 13px/1.5 var(--type); font-stretch: 100%; color: var(--dark); }
.journal li li + li { margin-top: 3px; color: var(--soft); }
.journal .found li li { color: var(--soft); text-decoration: line-through; text-decoration-color: rgba(141, 131, 120, .45); }
`);

export default function createJournal(site, journey) {
  const { store } = site, J = JOURNAL;
  const names = new Map(ACHIEVEMENTS.map((a) => [a.id, a.name]));
  const entries = () => { const l = store.get(J.key, []); return Array.isArray(l) ? l : []; };
  function add({ id = null, text, node = null } = {}) {
    if (!text) return false;
    const list = entries().filter((e) => e.text !== text);                      // said again: it moves to the top
    list.push({ id, text: String(text), node: node || null, at: Date.now() });
    while (list.length > J.keep) list.shift();
    store.set(J.key, list);
    return true;
  }
  journey.on('said', (d) => add(d || {}));

  const isDone = (id) => { const n = journey.node(id); return n ? done(n, journey.has, journey.get) : journey.has(id); };
  function html() {
    const list = entries();
    if (!list.length) return '';
    const groups = new Map();                                                    // newest first: insertion order
    for (const e of [...list].reverse()) {
      const k = e.node || '';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e.text);
    }
    const rows = [...groups].filter(([k]) => k).map(([k, lines]) => {
      const got = isDone(k), name = got ? (names.get(k) || (k === 'ending' ? 'the last page' : k)) : 'something';
      return `<li class="${got ? 'found' : 'open'}" data-node="${esc(k)}"><h3>${esc(name)}</h3><ul>${lines.map((t) => `<li>&ldquo;${esc(t)}&rdquo;</li>`).join('')}</ul></li>`;
    });
    const passing = groups.get('');
    if (passing) rows.push(`<li class="passing"><h3>in passing</h3><ul>${passing.slice(0, J.passing).map((t) => `<li>&ldquo;${esc(t)}&rdquo;</li>`).join('')}</ul></li>`);
    return `<div class="journal"><h2>what he said</h2><p class="j-lead">everything he has told you, in case you were not listening.</p><ol>${rows.join('')}</ol></div>`;
  }
  journey.addSection('grimoire', { id: 'journal', order: J.order, html });
  return { config: JOURNAL, entries, add, html };
}
