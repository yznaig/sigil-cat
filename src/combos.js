// The combo table: things that do something else when cast after, or while, another thing.
// Each row: { id, second, first?, within? (seconds), when?(site), run(site, info) }. `second` is the sigil just cast
// (its name in src/sigils/templates.js). The row fires when `first` was cast no more than `within` seconds before
// (if it names one) and `when` agrees (if it has one); the first row that fires replaces what `second` does alone.
// To add a combo: add a row. Its `id` is the find it unlocks (src/finds.js), if it has one.
export const COMBOS = [
  // (The blast-off was 'the star cast while he is bread'. The star is no longer a sigil (playtest 2): spinning the
  // bread really fast sends it to space now, in src/eggs/galaxy.js's spin trigger.)
  // The loaf on a cat who is wearing butter: toast lands butter down, cats land on their feet. He can do neither.
  // (Not every time: see PARADOX.again in src/gags/paradox.js, so the blast-off stays within reach of a buttered cat.)
  { id: 'paradox', second: 'dome', when: (site) => !!site.eggs.paradox?.due(), run: (site) => site.eggs.paradox.start() },
  // The bolt grounds through the fixed water patch; strike also charges a top whose floor footprint is wet, and lights
  // the dropped bulb if it lies in the water (src/world/lamp.js).
  { id: 'shock', second: 'zigzag', when: (site) => !!site.eggs.glass?.puddle && !!site.eggs.bolt, run: (site) => { site.lamp?.shock(); return site.eggs.bolt.strike({ via: site.eggs.glass.puddle }); } },
];
