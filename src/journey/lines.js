// What the cat says on his own (docs/journey/design.md §4). The stuck nudges are the 'cat' hints in ./graph.js; these
// are everything else. House style: short, lowercase, dry, a little smug, never an instruction longer than a line.
// Each line has a stable id (saved in 'journey.said' so he never repeats himself too soon). `when` is a trigger name
// that src/journey/voice.js understands (design §4 trigger table); `if` an optional node id that must be done,
// `unless` one that must not be.
export const LINES = [
  // first visit: the hook (design §6). Spoken once ever, in order, by the first-30-seconds script.
  { id: 'hook-1', when: 'hook', text: 'oh. you can see me.' },
  { id: 'hook-2', when: 'hook', text: 'this room is very empty. i am working on it.' },
  { id: 'hook-3', when: 'hook-tap', text: 'hello to you too.' },

  // coming back (once per visit, a few seconds after the doors open)
  { id: 'back-1', when: 'return', text: 'you came back.' },
  { id: 'back-2', when: 'return', text: 'i kept your things where you left them. mostly.' },
  { id: 'back-3', when: 'return', if: 'butter', text: 'the butter is still here. i checked.' },
  { id: 'back-4', when: 'return', if: 'shelf', text: 'i dusted the shelf. not really.' },
  { id: 'back-5', when: 'return-long', text: 'it has been a while. the room missed you. i did not.' },
  { id: 'back-6', when: 'return', if: 'ending', text: 'the end was nice. this is the bit after.' },

  // idle (no input for a while; flavour, never a hint)
  { id: 'idle-1', when: 'idle', text: 'i am floating. it is fine.' },
  { id: 'idle-2', when: 'idle', text: 'still here.' },
  { id: 'idle-3', when: 'idle', text: 'if you are not doing anything, i will be. professionally.' },
  { id: 'idle-4', when: 'idle', text: 'i do not have a face. i have opinions.' },
  { id: 'idle-5', when: 'idle', text: 'somewhere, a sign i have not seen.' },
  { id: 'idle-6', when: 'idle', if: 'butter', text: 'the butter is getting comfortable.' },
  { id: 'idle-7', when: 'idle', if: 'shelf', text: 'that shelf could hold more.' },
  { id: 'idle-8', when: 'idle', if: 'bolt', text: 'the cloud is still up there. it follows me.' },
  { id: 'idle-9', when: 'idle', if: 'birdwatch', text: 'the bird will be back. it always is.' },
  { id: 'idle-10', when: 'idle', if: 'light', text: 'nice lamp. i did that. you helped.' },
  { id: 'idle-11', when: 'idle', text: 'felt is a lot to live up to.' },
  { id: 'idle-12', when: 'idle', unless: 'bonk-100', text: 'you have not bonked me much. noted.' },

  // reactions (on events; short, once each unless marked again)
  { id: 'react-scribble', when: 'fizzle', text: 'no idea what that was. bold, though.' },
  { id: 'react-first-sigil', when: 'first-sigil', text: 'oh. that one i know.' },
  { id: 'react-grimoire', when: 'grimoire-closed', text: 'the riddles are honest. mostly.' },
  { id: 'react-shelf', when: 'arrival-shelf', text: 'a shelf. for me? for things.' },
  { id: 'react-board', when: 'arrival-board', text: 'a board. pin things. not me.' },
  { id: 'react-spin', when: 'dizzy', text: 'the room is still turning. i am not.' },
  { id: 'react-bite', when: 'bitten', text: 'you were warned. i was very clear.' },
  { id: 'react-void', when: 'void', text: 'i contain multitudes. briefly.' },
  { id: 'react-bread', when: 'bread-back', text: 'i was bread. it was fine.' },
  { id: 'react-cake', when: 'cake-eaten', text: 'happy birthday to someone. probably me.' },
  { id: 'react-cow', when: 'cow-leaves', text: 'goodbye cow. thank you cow.' },

  // a piece of the last page arrives (design §5); {n} pieces of 8
  { id: 'piece-1', when: 'piece', text: 'something tore loose in the grimoire.' },
  { id: 'piece-2', when: 'piece', text: 'another scrap of the last page. it was in the {thing}.' },
  { id: 'piece-3', when: 'piece', text: '{n} of eight. the page is coming back.' },
  { id: 'piece-7', when: 'piece-7', text: 'one piece left. the room is nearly full.' },
  { id: 'piece-8', when: 'piece-8', text: 'the last page is whole. look.' },

  // stuck, but nothing left he can nudge (everything open is luck or grind)
  { id: 'stuck-none', when: 'stuck-none', text: 'you have found everything i can think of. bonk me, i suppose.' },
  // stuck and he has already said everything for that node: he points at the books instead
  { id: 'stuck-books', when: 'stuck-repeat', text: 'it is all written down. the grimoire remembers what i said.' },

  // the ending (design §5); spoken in order by src/journey/ending.js
  { id: 'end-1', when: 'ending', text: 'oh. that is my sign.' },
  { id: 'end-2', when: 'ending', text: 'the room is full.' },
  { id: 'end-3', when: 'ending', text: 'thank you for filling it.' },
  { id: 'end-4', when: 'ending', text: 'i am going to sleep now. you can stay.' },

  // post-game
  { id: 'post-1', when: 'idle-post', text: 'there are still bonks. there are always bonks.' },
  { id: 'post-2', when: 'idle-post', text: 'ten thousand is a lot of hellos. i would know.' },
  { id: 'post-3', when: 'idle-post', text: 'you could show someone the room. i would let you.' },
  { id: 'post-4', when: 'platinum', text: 'every last one. i have nothing left to hide. i lied, a little.' },
];

export const byWhen = (when) => LINES.filter((l) => l.when === when);
