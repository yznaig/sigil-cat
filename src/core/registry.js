// What there is to find, and the combo table.
// A find is one secret of the page: a sigil, an egg, a gag. Each has a mark (a small line drawing for the row at the
// bottom of the page and for the grimoire), a riddle shown before it is found, and a line for after. Finds are
// remembered on the device. The list itself is src/finds.js; this file keeps who has found what.
// Combos: a small table (src/combos.js) of things that do something else when cast after, or while, another thing.
import { store } from './store.js';

export function createRegistry(site, FINDS) {
  const byId = new Map(FINDS.map((f) => [f.id, f]));
  const listeners = [];
  const has = (id) => !!store.get('found.' + id);
  const count = () => FINDS.filter((f) => has(f.id)).length;
  // Mark something found. Returns true the first time (and tells the page, which says so in his script).
  function find(id, { quiet = false } = {}) {
    const f = byId.get(id);
    if (!f || has(id)) return false;
    store.set('found.' + id, 1);
    for (const l of listeners) l(f, { quiet });
    return true;
  }
  return { FINDS, byId, has, count, find, onFind: (f) => listeners.push(f), get total() { return FINDS.length; } };
}

// rows: { id, second, first?, within? (seconds), when?(site), run(site, info) }
//   `second` just happened (a sigil name or an event). The row fires when `first` happened no more than `within`
//   seconds before (if it names one) and `when` agrees (if it has one). The first row that fires wins and replaces
//   what `second` would have done on its own.
export function createCombos(site, ROWS) {
  const lastAt = {};
  const now = () => performance.now() / 1000;
  return {
    ROWS,
    note(name) { lastAt[name] = now(); },
    forget(name) { delete lastAt[name]; },
    // returns the row that takes this event, or null
    resolve(name) {
      const t = now();
      for (const row of ROWS) {
        if (row.second !== name) continue;
        if (row.first && !(lastAt[row.first] !== undefined && t - lastAt[row.first] <= (row.within ?? 5))) continue;
        if (row.when && !row.when(site)) continue;
        return row;
      }
      return null;
    },
    since: (name) => (lastAt[name] === undefined ? Infinity : now() - lastAt[name]),
  };
}
