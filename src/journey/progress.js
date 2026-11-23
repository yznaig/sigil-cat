// The Journey's progress logic (docs/journey/design.md §3-§4). Pure functions over the graph and a `has(id)` test,
// so Node can check them (checks/journey-graph.test.mjs) and every unit reads progress the same way.
//   done(node, has, get)          is this node done (its achievement, or its doneKey)
//   frontier(has, get, opts)      nodes that can happen now and have not: needs all done, not done, not luck/post
//   pickNudge(has, get, hinted, opts)  the node to nudge when he is stuck, and which of its 'cat' hints is next
//   pieces(has, get)              the last page's pieces earned (ids, in PIECES order)
//   chapter(has, get)             the chapter the player is in: the lowest chapter with an open frontier node
//   title(has, get)               the player's title for the room card (design §6)
import { NODES, PIECES, byId } from './graph.js';

export const done = (n, has, get) => !!(has(n.id) || (n.doneKey && get(n.doneKey)));

export function frontier(has, get, { ended = !!get('journey.ended') } = {}) {
  return NODES.filter((n) => !done(n, has, get) && !n.luck && (!n.post || ended)
    && n.needs.every((id) => byId.get(id) && done(byId.get(id), has, get)));
}

// hinted: { [nodeId]: number of its 'cat' hints already spoken }. last: the node nudged last time (avoided if any other).
// Lowest chapter first; inside it, the node hinted least; grind nodes only when nothing else is open.
export function pickNudge(has, get, hinted = {}, { last = null, random = Math.random } = {}) {
  let open = frontier(has, get).filter((n) => n.hints.some((h) => h.via === 'cat'));
  const real = open.filter((n) => !n.grind);
  if (real.length) open = real;
  if (open.length > 1 && last) open = open.filter((n) => n.id !== last);   // >1 left, so never empty
  if (!open.length) return null;
  const ch = Math.min(...open.map((n) => n.ch));
  let pool = open.filter((n) => n.ch === ch);
  const least = Math.min(...pool.map((n) => hinted[n.id] || 0));
  pool = pool.filter((n) => (hinted[n.id] || 0) === least);
  const node = pool[Math.floor(random() * pool.length)];
  const lines = node.hints.filter((h) => h.via === 'cat');
  const index = Math.min(hinted[node.id] || 0, lines.length - 1);   // the last one repeats only once all are said
  return { node, index, text: lines[index].text, exhausted: (hinted[node.id] || 0) >= lines.length };
}

export const pieces = (has, get) => PIECES.filter((id) => done(byId.get(id), has, get));

export function chapter(has, get) {
  const open = frontier(has, get).filter((n) => !n.grind);
  return open.length ? Math.min(...open.map((n) => n.ch)) : 5;
}

// The room card's title (design §6): by how much of the graph is done (grind, luck and post-game left out).
export const TITLES = [
  [0, 'a visitor'], [0.1, 'a regular'], [0.25, 'a friend of the cat'], [0.45, 'keeper of signs'],
  [0.65, 'the butter\'s confidant'], [0.85, 'curator of the room'], [1, 'the one who finished it'],
];
export function score(has, get) {
  const counted = NODES.filter((n) => !n.grind && !n.luck && !n.post);
  return counted.filter((n) => done(n, has, get)).length / counted.length;
}
export function title(has, get) {
  const s = score(has, get);
  let t = TITLES[0][1];
  for (const [at, name] of TITLES) if (s >= at) t = name;
  return t;
}
