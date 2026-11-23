// The Journey's hint graph (docs/journey/design.md §3). Pure data: no DOM, no site; Node can import it
// (checks/journey-graph.test.mjs proves its integrity).
//
// One NODE per secret. A node's id is the achievement it earns (src/achievements.js), so "done" is simply
// store 'achievements.<id>' (or `doneKey` for a node that has no achievement yet).
//   ch      chapter of the arc, 1..5 (design §2). Sets how gentle its hints are: 1 gentle, 2-3 pointed, 4-5 cryptic.
//   needs   node ids that must be done before this one can even happen (it is not nudged before then)
//   how     how it is unlocked today, for people (never shown to players)
//   luck    true: chance, not discovery (never nudged; its achievement hint is enough)
//   grind   true: repetition, not discovery (nudged at most with its achievement hint)
//   post    true: post-game (after the ending), never nudged before it
//   hints   ordered vague -> clearer. Each: { via, text, from?, tell? }
//     via   'cat'      the cat says it (src/journey/voice.js speaks it when stuck on this node)
//           'grimoire' already in the game: a find's riddle (src/finds.js). Listed so the graph is complete.
//           'book'     the achievement's own locked hint (src/achievements.js `hint`). Listed for completeness.
//           'journal'  printed in the grimoire's "what he said" page once he has said it (src/journey/journal.js)
//           'tell'     an environmental tell in the room; `tell` names it (src/journey/tells.js implements it)
//           'thing'    an existing object/scene already points there (a card's text, a song, a prop): described only
//     from  a node that must be done for this hint to exist (the postcard's text needs the postcard). Empty = always.
// Rules (checked): every node but luck/grind/post has a hint with no `from`, or whose `from` does not need the node.
// A node's 'cat' hints are spoken in order: the first time he is stuck on it, the first; later, the next.
export const NODES = [
  // ---- chapter 1: the empty room. Hints gentle and nearly plain. ----
  { id: 'bonk-1', ch: 1, needs: [], how: 'tap him', hints: [
    { via: 'thing', text: 'the corner hint: "turn him · tap him · draw on the air"' },
    { via: 'cat', text: 'you could say hello. a tap is hello.' }] },
  { id: 'spin', ch: 1, needs: [], how: 'release a drag at > 8 rad/s', hints: [
    { via: 'book', text: 'turn him faster than he would like' },
    { via: 'cat', text: 'i can turn faster than that. i am told.' }] },
  { id: 'scribble', ch: 1, needs: [], how: 'draw a stroke the recognizer does not know', hints: [
    { via: 'thing', text: 'the corner hint says "draw on the air"' },
    { via: 'cat', text: 'the air around me takes ink. try it.' }] },
  { id: 'circle', ch: 1, needs: [], how: 'circle sigil', hints: [
    { via: 'grimoire', text: 'come back to where you began. leave no corner to catch on' },
    { via: 'cat', text: 'round things please me. one stroke, no corners.' }] },
  { id: 'butter', ch: 1, needs: [], how: 'B sigil', hints: [
    { via: 'grimoire', text: 'the second sign in the alphabet. someone has spreading to do' },
    { via: 'cat', text: 'i keep thinking about butter. the letter, mostly.' },
    { via: 'cat', text: 'b. just b. one stroke. somebody is waiting for it.' }] },
  { id: 'loaf', ch: 1, needs: [], how: 'dome sigil (half circle, open at the bottom)', hints: [
    { via: 'grimoire', text: 'an oven roof, drawn from one end of the crust to the other' },
    { via: 'cat', text: 'when i lie down people say i look like bread. draw the roof of an oven.' }] },
  { id: 'cup', ch: 1, needs: [], how: 'cup sigil (half circle, open at the top)', hints: [
    { via: 'grimoire', text: 'trace a hollow that could keep a little rain' },
    { via: 'cat', text: 'the bread\'s roof, turned over, holds water. i would push it off a table.' }] },
  { id: 'bolt', ch: 1, needs: [], how: 'zigzag sigil', hints: [
    { via: 'grimoire', text: 'a broken path from cloud to earth. the sky remembers' },
    { via: 'cat', text: 'it is too quiet up there. draw some weather.' }] },
  { id: 'box', ch: 1, needs: [], how: 'square sigil', hints: [
    { via: 'grimoire', text: 'four equal walls. leave room for someone who insists he fits' },
    { via: 'cat', text: 'if i fits, i sits. draw me four walls.' }] },
  { id: 'hat', ch: 1, needs: [], how: 'triangle sigil (each cast brings the next hat; the rack comes with it)', hints: [
    { via: 'grimoire', text: 'three corners shelter a thought. the highest points up' },
    { via: 'cat', text: 'my head is cold. three corners would do it.' }] },
  { id: 'eyes', ch: 1, needs: [], how: 'figure-eight sigil (on its side)', hints: [
    { via: 'grimoire', text: 'a sleeping number, one more than seven, looks back' },
    { via: 'cat', text: 'i have no face. a sleeping eight could lend me two eyes.' }] },
  { id: 'fork', ch: 1, needs: [], how: 'fork sigil', hints: [
    { via: 'grimoire', text: 'one handle climbs to three uneven teeth. retrace their roots; the middle reaches furthest' },
    { via: 'cat', text: 'there is farm work to do and nothing to do it with. a handle, three teeth.' }] },
  { id: 'fluent', ch: 2, needs: ['butter', 'circle', 'bolt', 'loaf', 'cup', 'box', 'eyes', 'hat', 'fork'], how: 'all nine sigils', hints: [
    { via: 'book', text: 'every sign he knows' },
    { via: 'journal', text: 'the grimoire counts what is left; its riddles are the rest' }] },

  // ---- chapter 2: the room starts arriving. Hints pointed. ----
  { id: 'shelf', ch: 2, needs: [], how: 'own two solid keepsakes (top, rifle, pat, tin, box, controller...)', hints: [
    { via: 'cat', text: 'things keep landing on my floor. something should hold them.' },
    { via: 'tell', tell: 'scrape', text: 'the first solid keepsake: a far-off scrape, once, from the left wall' }] },
  { id: 'board', ch: 2, needs: [], how: 'own two flat keepsakes (paper, postcard, ticket, recipe)', hints: [
    { via: 'cat', text: 'paper wants a wall. one more flat thing and you will see.' },
    { via: 'tell', tell: 'scrape', text: 'the first flat keepsake: a far-off scrape from the right wall' }] },
  { id: 'rack', ch: 2, needs: ['hat'], how: 'the first hat brings the rack', hints: [
    { via: 'cat', text: 'a hat needs somewhere to wait.' }] },
  { id: 'birdwatch', ch: 2, needs: [], how: 'click the bird (it first comes 90 s in)', hints: [
    { via: 'grimoire', text: 'a distant visitor takes its time. some things are better forgotten' },
    { via: 'cat', text: 'there is a bird. i have been watching it. you could too. closer.' }] },
  { id: 'lostgame', ch: 2, needs: ['birdwatch'], how: 'the bird clicked: trailer, controller (the bird find)', hints: [
    { via: 'cat', text: 'the bird wants to play. it is not good at it.' }] },
  { id: 'flappy', ch: 2, needs: ['lostgame'], how: 'one gate in the bird game', hints: [
    { via: 'cat', text: 'that controller is not decoration.' }] },
  { id: 'pipes', ch: 3, needs: ['flappy'], how: 'fifteen gates', grind: true, hints: [
    { via: 'cat', text: 'fifteen. the bird says fifteen is a number people reach.' }] },
  { id: 'purr', ch: 2, needs: [], how: 'stroke him up and down (purr level 0.6)', hints: [
    { via: 'book', text: 'find the rhythm he likes' },
    { via: 'cat', text: 'up, down. up, down. i will not say it again.' }] },
  { id: 'bite', ch: 3, needs: ['purr'], how: 'keep petting a purring cat (seven strokes)', hints: [
    { via: 'grimoire', text: 'up, down. kindness has a limit, and he is counting' },
    { via: 'cat', text: 'i purr. i also count.' }] },
  { id: 'bonk-1', ch: 1, dup: true },
  { id: 'bonk-100', ch: 2, needs: ['bonk-1'], grind: true, how: '100 bonks', hints: [{ via: 'book', text: 'a hundred small hellos' }] },
  { id: 'bonk-500', ch: 3, needs: ['bonk-100'], grind: true, how: '500 bonks', hints: [{ via: 'book', text: 'five hundred. he has stopped counting' }] },
  { id: 'bonk-1000', ch: 4, needs: ['bonk-500'], grind: true, how: '1000 bonks', hints: [{ via: 'book', text: 'a thousand. he is counting again' }] },
  { id: 'bonk-10000', ch: 5, needs: ['bonk-1000'], grind: true, post: true, how: '10000 bonks', hints: [{ via: 'book', text: 'ten thousand. this is a way of life now' }] },
  { id: 'lucky', ch: 2, needs: ['bonk-1'], luck: true, how: '1 tap in 400', hints: [{ via: 'book', text: 'some bonks ring differently' }] },

  // ---- chapter 3: the kitchen. Hints pointed, through things. ----
  { id: 'milk', ch: 3, needs: ['fork', 'cup'], how: 'cup twice -> pail; fork thrown up -> hay -> cow; pail to the cow', hints: [
    { via: 'cat', text: 'the glass came twice and left a pail. a pail is for something.' },
    { via: 'cat', text: 'throw the fork at the sky. the sky pays in hay. hay pays in cow.' }] },
  { id: 'baker', ch: 3, needs: ['box', 'milk', 'loaf'], how: 'flour, butter, milk, egg in the box; close; shake', hints: [
    { via: 'thing', from: 'box', text: 'the box\'s own line: "something could be baked in there."' },
    { via: 'thing', text: 'the recipe card flutters down once two ingredients are held' },
    { via: 'cat', text: 'bread twice leaves flour. the bird leaves eggs. you know where butter comes from.' }] },
  { id: 'birthday', ch: 3, needs: ['baker'], how: 'eat the cake (open the box after the bake, tap the cake)', hints: [
    { via: 'cat', text: 'a cake you do not eat is just a hat for a plate.' }] },
  { id: 'dressup', ch: 3, needs: ['birthday', 'rack'], how: 'wear all four hats (the party hat comes from the cake)', hints: [
    { via: 'cat', text: 'four pegs. i have worn some of them.' },
    { via: 'tell', tell: 'empty-peg', text: 'the rack\'s empty peg wobbles a little when he looks at it' }] },
  { id: 'recycle', ch: 3, needs: ['loaf'], how: 'drag crumbs or shards into the bin, six times', hints: [
    { via: 'thing', text: 'the bin slides in by itself while crumbs or shards lie about' },
    { via: 'cat', text: 'the bin is very encouraging. feed it.' }] },

  // ---- chapter 4: deep secrets. Hints cryptic; things point to them. ----
  { id: 'whisper', ch: 4, needs: ['butter'], how: 'hold the pointer very close to the butter', hints: [
    { via: 'grimoire', text: 'the spread has something to say. bring your pointer close' },
    { via: 'tell', tell: 'butter-shimmer', text: 'the butter catches a little light when the pointer passes near it' },
    { via: 'cat', text: 'the butter talks. not to me.' }] },
  { id: 'buttaman', ch: 4, needs: ['butter'], how: 'B three times: the third scene yells', hints: [
    { via: 'grimoire', from: 'butter', text: 'B for Butter: "each visit turns another page."' },
    { via: 'cat', text: 'he has more to say. he says it louder each time.' }] },
  { id: 'harp', ch: 4, needs: ['butter'], how: 'whisker tune C C B C D C (S S A S D S)', hints: [
    { via: 'grimoire', text: 'six small strings beside his nose remember the spreader\'s tune' },
    { via: 'tell', tell: 'whisker-hum', text: 'during the butter song\'s first line, his whiskers glint in the tune\'s order, once' },
    { via: 'cat', text: 'my whiskers are in tune. that is not a normal thing for whiskers.' },
    { via: 'cat', text: 'the song goes: what\'s the butter man. my whiskers know it.' }] },
  { id: 'noscope', ch: 4, needs: [], how: 'one flick that turns him exactly once round, then let go', hints: [
    { via: 'grimoire', text: 'send him all the way round in one flick. leave the ending to him' },
    { via: 'cat', text: 'once round. one flick. no help. it is a very particular reply.' }] },
  { id: 'void', ch: 4, needs: ['spin'], how: 'hold a spin above 13 rad/s', hints: [
    { via: 'thing', from: 'circle', text: 'the circle spins him twenty times: it is there so people try it themselves' },
    { via: 'cat', text: 'faster. faster than that. there is something behind me.' }] },
  { id: 'blastoff', ch: 4, needs: ['loaf', 'spin'], how: 'spin the bread really fast', hints: [
    { via: 'grimoire', text: 'let him become something baked. then turn him faster than bread should go' },
    { via: 'cat', text: 'bread does not belong in orbit. nobody has proved it.' }] },
  { id: 'paradox', ch: 4, needs: ['loaf', 'butter'], how: 'the loaf sigil on a buttered cat (not every time)', hints: [
    { via: 'grimoire', text: 'four paws must land down. the spread must land down too. both cannot win' },
    { via: 'cat', text: 'cats land on their feet. toast lands butter down. i wear butter. make me toast.' }] },
  { id: 'fling', ch: 4, needs: ['butter'], how: 'spin a buttered cat fast (or the circle on him)', hints: [
    { via: 'grimoire', text: 'the spread has less grip than he thinks. turn him' },
    { via: 'cat', text: 'the butter is not glued on. i have tested this, a little.' }] },
  { id: 'light', ch: 4, needs: ['bolt', 'cup'], how: 'first sigil gives the bulb; click it down; bulb in the puddle + bolt; drag the bulb to the shade', hints: [
    { via: 'cat', text: 'the bulb went out when you clicked it. bulbs like a jolt.' },
    { via: 'cat', text: 'water carries lightning. i would not stand in it. a bulb would.' }] },
  { id: 'charged', ch: 4, needs: ['circle', 'bolt', 'cup'], how: 'bolt while the top stands in the puddle', hints: [
    { via: 'cat', text: 'the top stops. everything stops. unless it is struck while standing in water.' }] },
  { id: 'collector', ch: 4, needs: ['shelf', 'noscope', 'circle', 'bite', 'milk', 'loaf'], how: 'shelf bays: rifle, top, pat, tin; hooks: pail, flour', hints: [
    { via: 'tell', tell: 'shelf-gaps', text: 'the shelf\'s empty bays show a faint dust outline of what belongs there' },
    { via: 'cat', text: 'the shelf has a dusty outline where something used to be. or will be.' }] },
  { id: 'curator', ch: 4, needs: ['board', 'paradox', 'void', 'harp', 'baker'], how: 'board: paper, postcard, ticket, recipe', hints: [
    { via: 'tell', tell: 'board-pins', text: 'the board shows its four empty pins; an empty pin glints when a flat thing is held' },
    { via: 'cat', text: 'four pins. some of them are holding nothing, very carefully.' }] },

  // ---- chapter 5: the last page and the end ----
  // Completionist means everything now (Aaron, e1122-07): every grimoire page and every other seal, Goodnight included,
  // so like Platinum it is a post-game goal the nudges never point at.
  { id: 'complete', ch: 5, needs: ['ending'], post: true, how: 'every grimoire find and every other achievement', hints: [
    { via: 'book', text: 'every page, and every seal in this book' }] },
  { id: 'ending', ch: 5, doneKey: 'journey.ended', needs: ['collector', 'curator', 'light', 'dressup', 'birthday', 'recycle', 'fluent', 'lostgame'],
    how: 'NEW: all eight pieces of the last page, then draw his own sign (the cat-head outline)', hints: [
      { via: 'thing', text: 'the grimoire\'s last page is torn; each piece is one room trophy (design §5)' },
      { via: 'cat', text: 'the last page is whole. it is my sign. i have worn it on every seal.' },
      { via: 'tell', tell: 'seal-head', text: 'the bonk seals and the platinum badge carry his head mark: that outline is the sign' }] },
  { id: 'platinum', ch: 5, needs: ['ending', 'bonk-10000'], post: true, how: 'every other achievement', hints: [
    { via: 'book', text: 'everything else. all of it' }] },
].filter((n) => !n.dup);

// The last page (design §5): one torn piece per room trophy, in the order its strokes are drawn.
export const PIECES = ['fluent', 'lostgame', 'recycle', 'birthday', 'dressup', 'light', 'collector', 'curator'];

export const byId = new Map(NODES.map((n) => [n.id, n]));
