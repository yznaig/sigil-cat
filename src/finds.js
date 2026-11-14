// Everything there is to find on the page, in the order of the row of marks. Used by the page (the marks, the count,
// "new" messages) and by the grimoire (spellbook.html).
//   kind   'sigil' (drawn in the air), 'combo' (two things together), 'secret' (found by handling him)
//   d      the mark: a 24 x 24 line drawing
//   riddle what the grimoire says before it is found (never the shape)
//   does   what the grimoire says after
//   sigil  for sigils: the name of its shape in src/sigils/templates.js
export const FINDS = [
  { id: 'butter', kind: 'sigil', sigil: 'butter', name: 'B for Butter', d: 'M8 4v16M8 4h5a4 4 0 0 1 0 8H8M8 12h6a4 4 0 0 1 0 8H8',
    riddle: 'the second sign in the alphabet. someone has spreading to do', does: 'the spreader answers. each visit turns another page.' },
  { id: 'circle', kind: 'sigil', sigil: 'circle', name: 'The Circle', d: 'M12 4a8 8 0 1 0 .01 0',
    riddle: 'come back to where you began. leave no corner to catch on', does: 'twenty turns. two seconds misplaced.' },
  { id: 'bolt', kind: 'sigil', sigil: 'zigzag', name: 'The Bolt', d: 'M15 3 8 12h7l-6 9',
    riddle: 'a broken path from cloud to earth. the sky remembers', does: 'borrowed weather. one cloud forgets to leave.' },
  // The star is a secret now, found by spinning him really fast (Aaron, playtest 2: "the star should not be a sigil").
  { id: 'star', kind: 'secret', name: 'The Star', d: 'M12 3l5.3 16.5L3.4 9.3h17.2L6.7 19.5z',
    riddle: 'faster than any cat should turn. keep going', does: 'spun past dizzy, something vast borrows his outline. a click brings him back.' },
  { id: 'loaf', kind: 'sigil', sigil: 'dome', name: 'The Loaf', d: 'M4 17a8 8 0 0 1 16 0M3 17h18',
    riddle: 'an oven roof, drawn from one end of the crust to the other', does: 'he becomes what he was already pretending to be.' },
  { id: 'glass', kind: 'sigil', sigil: 'cup', name: 'The Cup', d: 'M7 4l1 14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-14zM7.5 10h9',
    riddle: 'trace a hollow that could keep a little rain', does: 'water, within reach. he has an opinion.' },
  { id: 'box', kind: 'sigil', sigil: 'square', name: 'The Box', d: 'M4 9h16v11H4zM4 9l3-4h10l3 4M12 5v4',
    riddle: 'four equal walls. leave room for someone who insists he fits', does: 'his one visit is over. it opens like a chest; hold to lift it. flour, butter, milk and an egg inside, then close it and shake.' },
  { id: 'eyes', kind: 'sigil', sigil: 'eight', name: 'The Eyes', d: 'M7 7a5 5 0 1 0 .01 0M17 7a5 5 0 1 0 .01 0M8 13h.01M16 13h.01',
    riddle: 'a sleeping number, one more than seven, looks back', does: 'a borrowed gaze. poorly attached.' },
  { id: 'hat', kind: 'sigil', sigil: 'triangle', name: 'The Hat', d: 'M12 3l6 15H6zM3 18h18',
    riddle: 'three corners shelter a thought. the highest points up', does: 'something for his thoughts. the rack has other ideas.' },
  { id: 'fork', kind: 'sigil', sigil: 'fork', name: 'The Fork', d: 'M12 22V10L3 9V3v7h9V1v9l9 1V6',
    riddle: 'one handle climbs to three uneven teeth. retrace their roots; the middle reaches furthest', does: 'a little farm work. the sky may have something to spare.' },
  { id: 'noscope', kind: 'secret', name: 'The 360', d: 'M2 15l3-4h11l1-2h4v2h-3l-1 2H8l-3 4zM9 9h5',
    riddle: 'send him all the way round in one flick. leave the ending to him', does: 'one unbroken revolution, released. a very particular reply.' },
  { id: 'blastoff', kind: 'combo', name: 'Blasting off', d: 'M12 3c.8 5 3.500 8 9 9-5.500 1-8.200 4-9 9-.8-5-3.500-8-9-9 5.500-1 8.200-4 9-9z',
    riddle: 'let him become something baked. then turn him faster than bread should go', does: 'spin the loaf hard enough and the sky takes it.' },
  { id: 'paradox', kind: 'combo', name: 'The Paradox', d: 'M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2H5zM5 11v6h14v-6M9 3v3M15 3v3M4 21c2-2 4-2 5 0M15 21c1-2 3-2 5 0',
    riddle: 'four paws must land down. the spread must land down too. both cannot win', does: 'butter above, bread below. the floor declines to decide.' },
  { id: 'fling', kind: 'combo', name: 'The Fling', d: 'M3 14l4-3h9l-4 3zM3 14v4h9v-4M12 18l4-3v-4M18 5l3-2M19 9h3M16 3l1-2',
    riddle: 'the spread has less grip than he thinks. turn him', does: 'turn a buttered cat quickly. the glass gets its share.' },
  { id: 'harp', kind: 'secret', name: 'The Harp', d: 'M9 18a3 3 0 1 1 0-.01M9 18V5l10-2v12M19 15a3 3 0 1 1 0-.01',
    riddle: 'six small strings beside his nose remember the spreader’s tune', does: 'the first sung line, borrowed by his whiskers.' },
  { id: 'bite', kind: 'secret', name: 'The Bite', d: 'M4 9l16 6M6 6l12 12M9 5l10 10M5 9l10 10M10.500 10.500l3 3',
    riddle: 'up, down. kindness has a limit, and he is counting', does: 'seven kindnesses. one lasting mark. he remembers the hand.' },
  { id: 'whisper', kind: 'secret', name: 'The Whisper', d: 'M5 10v4M9 7v10M13 9v6M17 11v2M20 11.500v1',
    riddle: 'the spread has something to say. bring your pointer close', does: 'near his crown, a voice too small for the room.' },
  { id: 'bird', kind: 'secret', name: 'The Game', d: 'M3 15c0-8 3-9 6-7h6c3-2 6-1 6 7s-4 2-6-1H9c-2 3-6 5-6 1zM6 9v5M4 11.5h4M16 10h.01M18 13h.01',
    riddle: 'a distant visitor takes its time. some things are better forgotten', does: 'a little flight. a fallen controller. you remember now.' },
];
