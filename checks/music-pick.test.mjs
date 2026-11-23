// The music's next-song picker (p8: "when a song plays it doesnt play again for another 2 songs"). Run: node checks/music-pick.test.mjs
// Thousands of draws over pools of 1, 2, 3 and 5 songs (and 4, the real rotation): no song comes back within the
// window when the pool allows it (of n songs, the last min(2, n-1) are kept out), every song still gets picked and
// about evenly, a song unlocked mid-run joins at once, and the old (pool, last) call still works. Seeded: same every run.
import assert from 'node:assert/strict';
import { pickNext, NO_REPEAT } from '../src/core/music-pick.js';

let a = 20261121 >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const names = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
const DRAWS = 20000;

assert.equal(NO_REPEAT, 2);
for (const size of [1, 2, 3, 4, 5]) {
  const pool = names(size), keep = Math.min(NO_REPEAT, size - 1), played = [pool[0]], n = {};
  let bad = 0;
  for (let i = 0; i < DRAWS; i++) {
    const t = pickNext(pool, played, rnd);
    if (played.slice(played.length - keep).includes(t)) bad++;
    n[t] = (n[t] || 0) + 1; played.push(t);
  }
  assert.equal(bad, 0, `pool of ${size}: ${bad} picks inside the window of ${keep}`);
  for (const t of pool) assert.ok(n[t] > DRAWS / size * 0.9 && n[t] < DRAWS / size * 1.1, `pool of ${size}: ${t} picked ${n[t]} times`);
  // an A B A anywhere (pools of 3 and more)
  const aba = played.filter((t, i) => i >= 2 && t === played[i - 2]).length;
  if (size >= 3) assert.equal(aba, 0, `pool of ${size}: ${aba} A B A`);
  if (size === 2) assert.equal(played.filter((t, i) => i && t === played[i - 1]).length, 0, 'pool of 2: a repeat');
  console.log(`CHECK music picker, pool of ${size}: ${DRAWS} draws, none of the last ${keep} again, ${aba} A B A: PASS ${JSON.stringify(n)}`);
}
// with five: every eligible song gets picked from every state (the three not kept out each come up)
{
  const pool = names(5), seen = new Set();
  for (let i = 0; i < 3000; i++) seen.add(pickNext(pool, ['A', 'B'], rnd));
  assert.deepEqual([...seen].sort(), ['C', 'D', 'E']);
}
// a song unlocked mid-run (three go round in turn, then a fourth joins): it may come at once, and the window holds
{
  const three = names(3), four = names(4); let first = 0;
  for (let k = 0; k < 2000; k++) {
    const played = ['A'];
    for (let i = 0; i < 6; i++) played.push(pickNext(three, played, rnd));
    const t = pickNext(four, played, rnd);
    assert.ok(!played.slice(-2).includes(t)); if (t === 'D') first++;
  }
  assert.ok(first > 800 && first < 1200, `the new song came first ${first} of 2000 times (about half: two choices)`);
  console.log(`CHECK music picker: a song unlocked mid-run joins at once (first pick ${first}/2000), the window holds: PASS`);
}
// edge cases: nothing played yet, a single last name, an empty pool, one song
assert.ok(['A', 'B', 'C'].includes(pickNext(names(3), null, rnd)));
assert.notEqual(pickNext(names(3), 'A', rnd), 'A');
assert.equal(pickNext([], ['A'], rnd), null);
assert.equal(pickNext(['A'], ['A', 'A'], rnd), 'A');
console.log('CHECK music picker edge cases (nothing played, a single name, an empty pool, one song): PASS');
