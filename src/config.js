// Site config: the cat's numbers, every sound, and the page's words. Each egg and gag keeps its own knobs in a config
// object at the top of its file (src/eggs/, src/gags/); Butterman's are in src/eggs/butterman-config.js.
// Sounds: our tabletop orchestra + three CC0 cat voices; provenance in assets/audio/SOURCES.md.
const S = 'assets/audio/designed/';
const IMPACTS = Object.fromEntries(['wood', 'metal', 'paper', 'butter', 'glass', 'tin'].map(material =>
  [material, Object.fromEntries(['small', 'medium'].map(size =>
    [size, [1, 2, 3].map(n => `impact-${material}-${size}-${String(n).padStart(2, '0')}`)]))]));

export const SITE = {
  cat: {
    // One .spz per pose (Idol output, faced and made solid by tools/splats/, about 68k Gaussians each).
    files: { sit: 'assets/splats/sit.spz', lie: 'assets/splats/loaf.spz', sleep: 'assets/splats/sleep.spz', stretch: 'assets/splats/stretch.spz' },
    height: 1.0,                 // his height sitting, in scene units (everything else is measured against it)
    // Where the butter sits on each pose's head (x, y, z in his own space; y up from his feet, z toward you): the
    // crown between the ears, printed by tools/splats/bake.py.
    crown: { sit: [0.0, 0.894, 0.135], lie: [-0.18, 0.678, 0.282], sleep: [-0.136, 0.605, 0.258], stretch: [-0.02, 0.571, 0.142] },
    // The middle of his face on each pose (the googly eyes, the shades) and his six whiskers (the harp): each whisker
    // is [root, middle, tip], his left three then his right three, top to bottom. Measured from the splats by
    // tools/splats/whiskers.mjs (run it again when a pose is rebaked).
    face: { sit: [0.006,0.62,0.434], lie: [-0.138,0.409,0.54], sleep: [-0.12,0.291,0.441], stretch: [-0.111,0.338,0.382] },
    whiskers: {
      sit: [[[-0.315,0.64,0.185],[-0.371,0.606,0.159],[-0.408,0.548,0.15]],[[-0.3,0.591,0.2],[-0.352,0.565,0.173],[-0.395,0.522,0.162]],[[-0.284,0.541,0.215],[-0.332,0.525,0.187],[-0.382,0.496,0.173]],[[0.305,0.641,0.199],[0.354,0.635,0.163],[0.406,0.609,0.14]],[[0.351,0.582,0.174],[0.383,0.564,0.162],[0.413,0.546,0.149]],[[0.277,0.544,0.221],[0.332,0.528,0.192],[0.385,0.495,0.172]]],
      lie: [[[-0.485,0.424,0.349],[-0.521,0.416,0.346],[-0.558,0.402,0.345]],[[-0.473,0.365,0.35],[-0.516,0.351,0.348],[-0.549,0.319,0.349]],[[-0.429,0.332,0.367],[-0.475,0.3,0.359],[-0.516,0.265,0.371]],[[0.189,0.443,0.367],[0.24,0.445,0.377],[0.289,0.424,0.389]],[[0.192,0.384,0.386],[0.243,0.377,0.392],[0.287,0.347,0.401]],[[0.177,0.328,0.385],[0.222,0.315,0.397],[0.255,0.284,0.404]]],
      sleep: [[[-0.445,0.306,0.317],[-0.493,0.299,0.306],[-0.537,0.279,0.298]],[[-0.438,0.24,0.315],[-0.48,0.224,0.306],[-0.522,0.202,0.301]],[[-0.392,0.188,0.326],[-0.437,0.167,0.325],[-0.471,0.132,0.323]],[[0.198,0.339,0.346],[0.247,0.344,0.339],[0.299,0.34,0.338]],[[0.196,0.278,0.347],[0.25,0.272,0.336],[0.296,0.252,0.332]],[[0.157,0.216,0.346],[0.204,0.214,0.33],[0.248,0.203,0.328]]],
      stretch: [[[-0.425,0.356,0.17],[-0.475,0.357,0.154],[-0.524,0.342,0.141]],[[-0.443,0.308,0.167],[-0.481,0.294,0.155],[-0.518,0.271,0.147]],[[-0.403,0.259,0.18],[-0.45,0.248,0.168],[-0.489,0.219,0.162]],[[0.217,0.352,0.226],[0.277,0.325,0.225],[0.288,0.262,0.229]],[[0.201,0.307,0.238],[0.251,0.285,0.235],[0.272,0.236,0.236]],[[0.185,0.262,0.25],[0.225,0.245,0.245],[0.256,0.211,0.244]]],
    },
    middle: 0.45,                // the height he rocks about
    // The idle float: he hangs `lift` above the floor and bobs `bob` up and down once every `period` seconds, with a
    // faint rock side to side (rollDeg) and a nod (nodPx, screen pixels per cat-height of 600).
    float: { lift: 0.08, bob: 0.035, period: 2.0 },
    buoy: { rollDeg: 1.6, nod: 0.004, periods: [3.0, 4.1] },
    // The pose change (e1108-31): seconds in all; he shakes until shakeEnd (fraction), the old pose pops out over
    // `out`, the new one springs in over `in`, to `overshoot` times its size, and wobbles back.
    pop: { seconds: 1.5, shakeEnd: 0.42, shakeDeg: 2.5, shakeHz: 9, out: [0.4, 0.55], in: [0.48, 0.62], overshoot: 1.18 },
    // Pairs so close in shape that the shake is left out (Aaron, 2026-11-09): the pop itself still plays.
    noShake: [['lie', 'sleep']],
    emotes: { hop: { seconds: 0.45, height: 0.14 }, startle: { seconds: 0.35, height: 0.05, shakeDeg: 4 },
      idea: { seconds: 0.6, height: 0.035, shakeDeg: 6 } },   // the first sigil's light bulb (src/world/lamp.js)
    // The pose cycle (docs/ideas/cat-poses.md). hold: seconds he stays (random in range); next: where he goes,
    // weighted; after: `next` replaced when the pose he held before this one was the key (just woke: loaf, then a
    // stretch, then up).
    cycle: {
      start: 'sit',
      poses: {
        sit: { hold: [6, 12], next: { lie: 3, stretch: 1 } },
        lie: { hold: [5, 10], next: { sleep: 3, sit: 2 }, after: { sleep: { stretch: 4, sit: 1 } } },
        sleep: { hold: [10, 18], next: { lie: 1 } },
        stretch: { hold: [3, 5], next: { sit: 1 } },
      },
      // which pose can pop straight to which (a request for anything else goes by way of these)
      moves: { sit: ['lie', 'stretch'], lie: ['stretch', 'sleep', 'sit'], sleep: ['lie'], stretch: ['sit'] },
      tap: { sleep: 'wake', default: { hop: 4, spin: 1 } },
      spinCooldown: 2,
    },
    rotate: {
      radiansPerPixel: 0.009, damping: 3.5, tapSlop: 8, tapMs: 450,
      homeYaw: -0.45,             // the angle he faces at rest (a slight three-quarter view)
      returnHome: true, returnDelay: 2.5, returnSpeed: 1.6,
      keyStep: 0.35,              // radians per arrow-key press
    },
    shadow: { opacity: 0.22, scale: 1.2 },
    // The picture of him that the page shows is redrawn only when he turns, pops or changes. `rest` and `moving` are
    // how many picture pixels per screen pixel it is drawn at (sharper at rest, lighter while he spins).
    picture: { rest: 2, moving: 1, maxDpr: 2, settleMs: 140 },
  },

  sounds: {
    volume: 0.5,                       // tap sounds' loudness (0-1)
    pitchJitter: 0.06,                 // each tap plays +-6% pitch, so a few clips feel like many
    tap: ['tap-boing', 'tap-squeak', 'tap-bonk', 'tap-mrrp', 'tap-pop', 'tap-blat'],
    rare: 'tap-rare', rareChance: 400, // the rare bonk: 1 tap in `rareChance` (e1111-39)
    // World contact sounds are off (Aaron, e1111-58: "I think we can just remove collision noises"): main.js hands
    // audio.js no impact groups, so every contact is silent and none of the 36 impact files is fetched.
    // true brings the material layer back exactly as it was (audio.loadImpacts(material), audio.impact(item, options)).
    collisions: false,
    impacts: IMPACTS,
    // every clip by name: audio.play('ding')
    files: Object.fromEntries([...['tap-boing', 'tap-squeak', 'tap-bonk', 'tap-mrrp', 'tap-pop', 'tap-blat', 'tap-rare', 'cast', 'fizzle',
      'thunder', 'whoosh', 'ding', 'airhorn', 'hit', 'slap', 'purr', 'bite', 'hiss', 'glass-slide', 'glass-smash', 'drip',
      'box-thud', 'choir', 'rattle', 'pluck', 'paper', 'splat', 'sponge-wipe', 'twinkle', 'click', 'paradox-hum', 'galaxy-hum', 'star-tink', 'achieve', 'chest-open', 'chest-close', 'bread-pop',
      // fx lane, playtest 3: Aaron's four clips (tools/audio/make-p3-sounds.py): the achievement, the sticker/badge bell,
      // the successful cast (e1113-09), the bolt (e1113-10)
      'achieve-space', 'bell', 'cast-wind', 'bolt-beam'].map((n) => [n, S + n + '.wav']),
      ['bread-riser', S + 'bread-riser.mp3'],   // sky lane, playtest 2: Aaron's riser for the blast-off (tools/audio/make-bread-sounds.py)
      ...Object.values(IMPACTS).flatMap(sizes => Object.values(sizes).flat()).map(n => [n, 'assets/audio/impacts/' + n + '.wav'])]),
  },

  counter: {
    milestones: { 10: 'bonk apprentice', 100: 'certified bonker', 500: 'bonk lord', 1000: 'one thousmeow' },
  },

  ui: {
    hint: 'turn him · tap him · draw on the air',
    // "ask the butter": it never does the trick for you
    hints: ['the air around him listens', 'draw on the empty space, in one stroke', 'a circle, perhaps', 'b is for…', 'a storm is a zig and a zag',
      'what is a loaf but half a circle', 'he does not like to be stroked for long', 'his whiskers are in tune', 'spin him once, all the way round, and let go'],
    links: [],                   // social links: [{ label: 'instagram', href: 'https://…' }] once Aaron names them
    // The cat's speech (ui.speak, src/ui/hush.js): the bonk at each sentence, the type size (desktop, phone or short
    // screen) and the smallest it may shrink to, the widest a line may be, how far above his crown it sits (cat
    // heights: clears his ears and a hat; a hop's peak may brush it), the settling (ms before, ms per sign) and how long each sentence stays.
    speech: { sound: 'tap-bonk', gain: 0.5, px: [16, 13], minPx: 10, maxWidth: 560, edge: 12, above: 0.2,
      settleDelay: 420, settleStep: 30, baseMs: 1100, perChar: 45, minMs: 1600, gapMs: 250 },
    // The first time an item is lifted and moved, he says how to move it nearer or further (once ever; store
    // 'tips.pickup'). The wheel: down brings it nearer (world-input.js WHEEL). Touch has the Nearer / Deeper buttons.
    pickupTip: { wheel: 'scroll down to bring it nearer, up to push it back.', touch: 'tap nearer or deeper to bring it closer or push it back.' },
  },
};
