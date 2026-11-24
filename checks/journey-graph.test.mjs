// The Journey's hint graph holds together (docs/journey/design.md §3): run by checks/run-all.sh, `node checks/journey-graph.test.mjs`.
//  1 every achievement in src/achievements.js has exactly one node; every node is an achievement or has a doneKey
//  2 every `needs` and `from` names a node; the needs graph has no cycle
//  3 no orphan: every node that can be nudged has a hint that exists before the node is done (no `from`, or a `from`
//    that does not itself need this node), and at least one 'cat' hint or an existing in-game route (grimoire/book/thing)
//  4 every last-page piece is a node, and the ending needs them all
//  5 every line id is unique; every line's if/unless names a node
//  6 the nudge picker: on a fresh save it picks a chapter-1 node; it never picks a done node, a luck node or a
//    post-game node; it walks a node's 'cat' hints in order; with everything done it returns null
import { ACHIEVEMENTS } from '../src/achievements.js';
import { NODES, PIECES, byId } from '../src/journey/graph.js';
import { LINES } from '../src/journey/lines.js';
import { frontier, pickNudge, pieces, title } from '../src/journey/progress.js';

let fails = 0, passes = 0;
const check = (name, ok, info = '') => { if (ok) passes++; else { fails++; console.log('FAIL ' + name + (info ? ' ' + info : '')); } };

// 1
const achIds = ACHIEVEMENTS.map((a) => a.id);
const nodeIds = NODES.map((n) => n.id);
check('1 node ids unique', new Set(nodeIds).size === nodeIds.length, nodeIds.filter((id, i) => nodeIds.indexOf(id) !== i).join());
check('1 every achievement has a node', achIds.every((id) => byId.has(id)), achIds.filter((id) => !byId.has(id)).join());
check('1 every node is an achievement or has a doneKey', NODES.every((n) => achIds.includes(n.id) || n.doneKey), NODES.filter((n) => !achIds.includes(n.id) && !n.doneKey).map((n) => n.id).join());
// 2
const bad = [];
for (const n of NODES) for (const id of [...n.needs, ...n.hints.map((h) => h.from).filter(Boolean)]) if (!byId.has(id)) bad.push(n.id + '->' + id);
check('2 needs and from name nodes', !bad.length, bad.join());
const needsAll = (id, seen = new Set()) => { for (const d of byId.get(id).needs) if (!seen.has(d)) { seen.add(d); needsAll(d, seen); } return seen; };
check('2 no cycle', NODES.every((n) => !needsAll(n.id).has(n.id)), NODES.filter((n) => needsAll(n.id).has(n.id)).map((n) => n.id).join());
// 3
const orphans = NODES.filter((n) => !n.luck && !n.grind && !n.post).filter((n) => !n.hints.some((h) => !h.from || !needsAll(h.from).has(n.id) && h.from !== n.id));
check('3 no orphan node', !orphans.length, orphans.map((n) => n.id).join());
const silent = NODES.filter((n) => !n.luck && !n.post && !n.hints.some((h) => ['cat', 'grimoire', 'book', 'thing', 'tell'].includes(h.via)));
check('3 every node has a route a player can meet', !silent.length, silent.map((n) => n.id).join());
const vias = new Set(['cat', 'grimoire', 'book', 'journal', 'tell', 'thing']);
check('3 every hint has a known via and text', NODES.every((n) => n.hints.every((h) => vias.has(h.via) && h.text && (h.via !== 'tell' || h.tell))));
// the ghost doodle is gone (playtest: it came too soon and gave the circle away); the first signs keep their routes
check('3 no hint names the removed ghost doodle', NODES.every((n) => n.hints.every((h) => h.tell !== 'ghost-doodle')));
// the whisker hum is gone too (e1123-59: it glinted the harp's tune order and gave the answer away); the harp keeps
// its grimoire riddle and the cat's nudges
check('3 no hint names the removed whisker hum', NODES.every((n) => n.hints.every((h) => h.tell !== 'whisker-hum' && !/whiskers glint/.test(h.text))));
check('3 the harp still has a route a player meets (its riddle and the cat)', byId.get('harp').hints.some((h) => !h.from && h.via === 'grimoire') && byId.get('harp').hints.some((h) => h.via === 'cat'));
check('3 the circle and the scribble still have a route a player meets', ['circle', 'scribble'].every((id) => byId.get(id).hints.some((h) => !h.from && ['cat', 'grimoire', 'thing'].includes(h.via))));
// 4
check('4 pieces are nodes', PIECES.every((id) => byId.has(id)));
check('4 the ending needs every piece', PIECES.every((id) => byId.get('ending').needs.includes(id)));
check('4 eight pieces', PIECES.length === 8);
// 5
const lineIds = LINES.map((l) => l.id);
check('5 line ids unique', new Set(lineIds).size === lineIds.length);
check('5 line if/unless name nodes', LINES.every((l) => (!l.if || byId.has(l.if)) && (!l.unless || byId.has(l.unless))));
const catHints = NODES.reduce((s, n) => s + n.hints.filter((h) => h.via === 'cat').length, 0);
check('5 forty lines or more (own lines + cat hints)', LINES.length + catHints >= 40, String(LINES.length + catHints));
// 6
const save = (ids, store = {}) => ({ has: (id) => ids.has(id), get: (p, d = null) => (p in store ? store[p] : d) });
const fresh = save(new Set());
const pick = pickNudge(fresh.has, fresh.get, {}, { random: () => 0 });
check('6 fresh save nudges a chapter-1 node', pick && pick.node.ch === 1, JSON.stringify(pick?.node.id));
check('6 fresh frontier has no luck, post or done nodes', frontier(fresh.has, fresh.get).every((n) => !n.luck && !n.post));
const some = save(new Set(['butter', 'circle', 'bonk-1']));
for (let i = 0; i < 200; i++) {
  const p = pickNudge(some.has, some.get, {}, {});
  if (!p || some.has(p.node.id) || p.node.luck || p.node.post) { check('6 never picks done/luck/post', false, p?.node.id); break; }
}
const b = byId.get('harp'), harpLines = b.hints.filter((h) => h.via === 'cat');
const onlyHarp = save(new Set(achIds.filter((id) => id !== 'harp' && !byId.get(id).needs.includes('harp') && !needsAll(id).has('harp'))));
const p0 = pickNudge(onlyHarp.has, onlyHarp.get, {}, {}), p1 = pickNudge(onlyHarp.has, onlyHarp.get, { harp: 1 }, {});
check('6 a node\'s cat hints are walked in order', p0?.node.id === 'harp' && p0.text === harpLines[0].text && p1?.text === harpLines[1].text, JSON.stringify([p0?.node.id, p0?.text, p1?.text]));
const all = save(new Set(achIds), { 'journey.ended': 1 });
check('6 everything done: no nudge', pickNudge(all.has, all.get, {}, {}) === null);
check('6 everything done: eight pieces, the last title', pieces(all.has, all.get).length === 8 && title(all.has, all.get) === 'the one who finished it');
check('6 fresh save: a visitor', title(fresh.has, fresh.get) === 'a visitor');

console.log(fails ? `journey graph: ${fails} FAILED, ${passes} passed` : `journey graph: all ${passes} passed`);
process.exit(fails ? 1 : 0);
