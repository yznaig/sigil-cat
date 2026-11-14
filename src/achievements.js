// Achievements: the second book (achievements.html), in the order it is printed. Used by the page's runtime
// (src/ui/achievements.js: what unlocks each one, the toast, the mark by the grimoire link) and by the book.
//   id      stable key, saved under store 'achievements.<id>' as the time it was earned (ms since 1970)
//   group   the book's section
//   name    shown once earned (and while locked, unless `secret`)
//   hint    a vague line while locked (never the shape or the trick); hidden while locked if `secret`
//   said    the line under it once earned
//   d       its mark: a 24 x 24 line drawing (src/finds.js marks are reused where there is one)
//   secret  true when the name or hint would give a secret away: locked, it is only "???"
//   find    earned with this grimoire find (src/finds.js), now or already
//   bonks   earned at this many bonks
//   metal   the bonk tiers: wood, bronze, silver, gold, platinum (their wax once earned; everything else is gold)
// Everything is earnable in about an hour of focused play, except the 10,000-bonk tier.
import { FINDS } from './finds.js';

const mark = (id) => FINDS.find((f) => f.id === id).d;
// [id, title, short]: `short` heads its column in the book's all-at-once view (e1113-05: one word that fits a column)
export const GROUPS = [
  ['signs', 'Signs', 'Signs'], ['bonks', 'Bonks', 'Bonks'], ['handling', 'Handling him', 'Handling'], ['happenings', 'Happenings', 'Events'],
  ['room', 'The room', 'Room'], ['kitchen', 'The kitchen', 'Kitchen'], ['bird', 'The bird', 'Bird'], ['mastery', 'Mastery', 'Mastery'],
];
const sign = (id, find, name, said) => ({ id, group: 'signs', find, name, said, d: mark(find), secret: true });
const ICON = {
  scribble: 'M3 15c2-7 4-7 5-2s3 5 4 0 3-6 4-1 2 5 5 1',
  fluent: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  // the clover (e1113-04): the stem curves left from the leaves' join, the leaves centred
  lucky: 'M10.5 12a3.2 3.2 0 1 1 0-5 3.2 3.2 0 1 1 5 0 3.2 3.2 0 1 1 0 5 3.2 3.2 0 1 1-5 0zM10.5 12c-.5 3-1.8 6-4.5 9',
  spin: 'M20 12a8 8 0 1 1-2.4-5.7M20 3.5V8h-4.5M12 12h.01',
  purr: 'M12 20s-7-4.4-7-9.6A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.4C19 15.6 12 20 12 20z',
  galaxy: 'M12 12.5c.6-.9 2-.5 2 .6 0 1.6-1.8 2.6-3.3 2.2-2.2-.6-2.8-3.3-1.5-5 1.8-2.4 5.6-2.1 7.2.4 2 3.2 0 7.4-3.8 8.2C8 19.7 3.8 16.6 4.2 12',
  buttaman: 'M4 14l4-4h12l-4 4zM4 14v4h12v-4M16 18l4-4v-4M11 2v4M14.5 3l-1 3M7.5 3l1 3',
  shelf: 'M3 10h18v2H3zM5 12v8M19 12v8M7 10V5h3v5M13 10V7h4v3',
  pin: 'M9 3h6l-1 6 3 3H7l3-3zM12 12v9',
  rack: 'M12 3v17M8 20h8M12 7 7.5 4.5M12 7l4.5-2.5M12 11l-4.5 2.5M12 11l4.5 2.5',
  dress: 'M8 15V5h8v10M5 15h14l-1 3H6zM8 11h8',
  light: 'M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.8 10.6c.8.7 1.3 1.6 1.3 2.4h5c0-.8.5-1.7 1.3-2.4A6 6 0 0 0 12 3zM12 9l-1 3h2l-1 3',
  charged: 'M6 9h12l-6 11zM6 9a6 3.5 0 0 1 12 0M12 2v3M3 13l2-1M21 13l-2-1',
  collector: 'M3 12h18v2H3zM5 14v6M19 14v6M5 12V8h2v4M9 12V6h2v6M13 12V9h2v3M17 12V7h2v5',
  curator: 'M3 4h18v15H3zM5.5 6.5h5.5v7H5.5zM13.5 6.5h5v4.5h-5zM13.5 13h5v3.5h-5zM6 15.5h4.5v1.5H6zM8.2 6v1M16 6v1',
  milk: 'M6 8h12l-1.5 12.5h-9zM5 8c2-1 4 1 7 0s5-1 7 0M8 5c2.5-2.5 5.5-2.5 8 0',
  baker: 'M4 20h16v-7H4zM4 15.5c1.8 1.2 3.7 1.2 5.3 0s3.6-1.2 5.4 0 3.6 1.2 5.3 0M12 13V9M12 6.5v.01',
  birthday: 'M12 3l5 16H7zM9.5 11l4.5 1.5M8.3 15l7.2 2.2M17 19l3-1.5M20 17.5c1 .5 1.5-1 .5-1.5',
  watcher: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zM12 9.5a2.5 2.5 0 1 0 .01 0',
  flappy: 'M3.5 13c1-5 5-7.5 9-6l5.5-2-1.5 4.5c1.5 4-1.5 8-6.5 7.5-3.5-.3-6.2-2-6.5-4zM10 10.5v.01M6 13c2 1 4 1 5.5 0',
  pipes: 'M5 3h5v6H5zM4 9h7M4 15h7M5 15h5v6H5zM14 3h5v9h-5zM13 12h7M13 17h7M14 17h5v4h-5z',
  complete: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M12 5.5l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4z',
  platinum: 'M4.5 5l4.5 4.5h6L19.5 5v9a7.5 7.5 0 0 1-15 0zM9.5 14v.01M14.5 14v.01M11 17.2l1 .6 1-.6',
  recycle: 'M12 3.5 4 17.5h16zM12 3.5 9.8 6.6M12 3.5l2.2 3.1M4 17.5l3.8.4M4 17.5l1.6-3.4M20 17.5l-1.6-3.4M20 17.5l-3.8.4',
};
// metal: the tier's material once earned, on its wax in the book and in the reveal (playtest-2, text lane)
// The marks (e1113-03, "the cat sees stars"): his head, with more stars circling each tier; X eyes from gold, and at
// platinum a ring under the stars. Each tier its own drawing, no dots. Simplified after looking at them in the reveal
// at 44px (book lane, playtest-3): the X eyes sit a little wider apart so they do not run together, and platinum's
// ring is slimmer and higher with its three stars above it (the spec's two low stars touched the ears: a crown of mush).
const HEAD = 'M6.2 21c-1.3-2.6-1.3-5.4 0-8l.7-4.6 3.5 2.7h3.2l3.5-2.7.7 4.6c1.3 2.6 1.3 5.4 0 8z';
const EYES = 'M10 16v.01M14 16v.01', XEYES = 'M8.6 15l2 2M10.6 15l-2 2M13.4 15l2 2M15.4 15l-2 2';
const twinkle = (x, y, r) => `M${x} ${y - r}v${2 * r}M${x - r} ${y}h${2 * r}`;
const STARS = {
  wood: HEAD + EYES,
  bronze: HEAD + EYES + twinkle(12, 3.5, 2),
  silver: HEAD + EYES + twinkle(6, 4, 1.8) + twinkle(18, 4, 1.8),
  gold: HEAD + XEYES + twinkle(4.5, 5, 1.7) + twinkle(12, 2.5, 1.7) + twinkle(19.5, 5, 1.7),
  platinum: HEAD + XEYES + 'M3 5c0-2 18-2 18 0s-18 2-18 0' + twinkle(4, 1, 1.3) + twinkle(12, -0.5, 1.6) + twinkle(20, 1, 1.3),
};
const tier = (id, bonks, name, hint, said, metal) => ({ id, group: 'bonks', bonks, name, hint, said, d: STARS[metal], metal });

export const ACHIEVEMENTS = [
  sign('butter', 'butter', 'B for Butter', 'the spreader came when you wrote his letter.'),
  sign('circle', 'circle', 'Full Circle', 'twenty turns, two seconds, one dizzy cat.'),
  sign('bolt', 'bolt', 'Ride the Lightning', 'you drew the weather down.'),
  // 'star' (Starstruck) is gone: the star is no longer a sign (playtest 2, e1112-38); the galaxy earns Into the Void.
  // An old save's achievements.star is simply never read.
  sign('loaf', 'loaf', 'Loafing Around', 'he became a loaf. he was always a loaf.'),
  sign('cup', 'glass', 'Half Full', 'a hollow that keeps a little rain.'),
  sign('box', 'box', 'Thinking Inside It', 'four walls, one cat who insisted.'),
  sign('eyes', 'eyes', 'Seeing Things', 'a borrowed gaze, poorly attached.'),
  sign('hat', 'hat', 'Hat Trick', 'three corners for his thoughts.'),
  sign('fork', 'fork', 'Fork Found', 'one handle, three uneven teeth.'),
  { id: 'fluent', group: 'signs', name: 'Fluent', hint: 'every sign he knows', said: 'all nine signs, in one stroke each.', d: ICON.fluent },
  { id: 'scribble', group: 'signs', name: 'Scribble', hint: 'draw something he does not know', said: 'he had no idea what that was.', d: ICON.scribble },

  tier('bonk-1', 1, 'First Bonk', 'say hello. gently', 'hello.', 'wood'),
  tier('bonk-100', 100, 'Bonk Apprentice', 'a hundred small hellos', 'one hundred bonks.', 'bronze'),
  tier('bonk-500', 500, 'Bonk Adept', 'five hundred. he has stopped counting', 'five hundred bonks.', 'silver'),
  tier('bonk-1000', 1000, 'Bonk Master', 'a thousand. he is counting again', 'one thousand bonks.', 'gold'),
  tier('bonk-10000', 10000, 'Bonk Legend', 'ten thousand. this is a way of life now', 'ten thousand bonks. truly.', 'platinum'),
  { id: 'lucky', group: 'bonks', name: 'Lucky Bonk', hint: 'some bonks ring differently', said: 'a rare bonk. one in four hundred.', d: ICON.lucky },

  { id: 'spin', group: 'handling', name: 'Spin Doctor', hint: 'turn him faster than he would like', said: 'a properly fast spin.', d: ICON.spin },
  { id: 'purr', group: 'handling', name: 'Purr-fect', hint: 'find the rhythm he likes', said: 'he purred. briefly.', d: ICON.purr },
  { id: 'bite', group: 'handling', find: 'bite', name: 'Fair Warning', hint: '', said: 'he did warn you.', d: mark('bite'), secret: true },
  { id: 'whisper', group: 'handling', find: 'whisper', name: 'Ask the Butter', hint: '', said: 'a voice too small for the room.', d: mark('whisper'), secret: true },
  { id: 'noscope', group: 'handling', find: 'noscope', name: '360 No Scope', hint: '', said: 'one revolution. a very particular reply.', d: mark('noscope'), secret: true },
  { id: 'harp', group: 'handling', find: 'harp', name: 'Encore', hint: '', said: 'his whiskers know the tune.', d: mark('harp'), secret: true },

  { id: 'void', group: 'happenings', name: 'Into the Void', hint: '', said: 'he was a window onto the night.', d: ICON.galaxy, secret: true },
  { id: 'blastoff', group: 'happenings', find: 'blastoff', name: 'Blasting Off', hint: '', said: 'bread, launched.', d: mark('blastoff'), secret: true },
  { id: 'paradox', group: 'happenings', find: 'paradox', name: 'The Paradox', hint: '', said: 'butter side down. feet side down. neither.', d: mark('paradox'), secret: true },
  { id: 'fling', group: 'happenings', find: 'fling', name: 'Fling', hint: '', said: 'the spread had less grip than he thought.', d: mark('fling'), secret: true },
  { id: 'buttaman', group: 'happenings', name: 'Buttaman!', hint: '', said: 'he said his name. three times.', d: ICON.buttaman, secret: true },

  { id: 'shelf', group: 'room', name: 'Shelf Life', hint: '', said: 'somewhere to keep the solid things.', d: ICON.shelf, secret: true },
  { id: 'board', group: 'room', name: 'Pin It', hint: '', said: 'somewhere to keep the flat things.', d: ICON.pin, secret: true },
  { id: 'rack', group: 'room', name: 'Hat Rack', hint: '', said: 'four pegs. three hats, for now.', d: ICON.rack, secret: true },
  { id: 'dressup', group: 'room', name: 'Dress Up', hint: '', said: 'every hat, one at a time.', d: ICON.dress, secret: true },
  { id: 'light', group: 'room', name: 'Let There Be Light', hint: '', said: 'the lamp is lit.', d: ICON.light, secret: true },
  { id: 'charged', group: 'room', name: 'Charged', hint: '', said: 'a top that will not stop.', d: ICON.charged, secret: true },
  // Collector (playtest 2, e1112-38): every spot on the shelf, the two hooks under it included; Curator is its twin.
  { id: 'collector', group: 'room', name: 'Collector', hint: '', said: 'a full shelf. hooks and all.', d: ICON.collector, secret: true },
  { id: 'curator', group: 'room', name: 'Curator', hint: '', said: 'a full board.', d: ICON.curator, secret: true },

  { id: 'milk', group: 'kitchen', name: 'Got Milk', hint: '', said: 'one pail. thank you, cow.', d: ICON.milk, secret: true },
  { id: 'baker', group: 'kitchen', name: 'Baker', hint: '', said: 'flour, butter, milk, an egg, and a good shake.', d: ICON.baker, secret: true },
  { id: 'birthday', group: 'kitchen', name: 'Happy Birthday', hint: '', said: 'the page was delicious.', d: ICON.birthday, secret: true },
  // Gags lane, playtest 2: the sixth gold star from the recycling bin (src/gags/recycle.js). Counts toward Platinum.
  { id: 'recycle', group: 'kitchen', name: 'Clean Sweep', hint: '', said: 'six trips to the bin. wow, wow, wow.', d: ICON.recycle, secret: true },

  { id: 'birdwatch', group: 'bird', name: 'Bird Watcher', hint: '', said: 'a distant visitor, followed.', d: ICON.watcher, secret: true },
  { id: 'flappy', group: 'bird', name: 'Flappy', hint: '', said: 'one gate.', d: ICON.flappy, secret: true },
  { id: 'pipes', group: 'bird', name: 'Pipe Dream', hint: '', said: 'fifteen gates.', d: ICON.pipes, secret: true },
  { id: 'lostgame', group: 'bird', find: 'bird', name: 'You Just Lost the Game', hint: '', said: 'you remember now.', d: mark('bird'), secret: true },

  { id: 'complete', group: 'mastery', name: 'Completionist', hint: 'every page of the grimoire', said: 'nothing left unfound.', d: ICON.complete },
  { id: 'platinum', group: 'mastery', name: 'Platinum Cat', hint: 'everything else. all of it', said: 'every last one. even the bonks.', d: ICON.platinum },
];
export const SIGN_IDS = ACHIEVEMENTS.filter((a) => a.group === 'signs' && a.find).map((a) => a.id);
