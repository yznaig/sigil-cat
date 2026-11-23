// The next song (src/core/music.js). Aaron (p8): "when a song plays it doesnt play again for another 2 songs", so two
// songs can't flip-flop A B A B: never any of the last `window` (2) played. With fewer songs to choose from than that
// leaves (orbit-loaf still locked: three; or fewer), it keeps out as many of the most recent as it can while still
// leaving a choice: of three, the last two (so three go round in turn); of two, the last one; of one, it plays again.
// Uniform over what is left. `recent` is the songs played so far, oldest first (a single name or null also works).
// Its own module, free of the page, so node can test it (checks/music-pick.test.mjs).
export const NO_REPEAT = 2;

export function pickNext(pool, recent, rnd = Math.random, window = NO_REPEAT) {
  const played = recent == null ? [] : Array.isArray(recent) ? recent : [recent];
  for (let n = Math.min(window, played.length); n >= 0; n--) {
    const keepOut = new Set(played.slice(played.length - n));
    const options = pool.filter((t) => !keepOut.has(t));
    if (options.length) return options[Math.min(options.length - 1, Math.floor(rnd() * options.length))];
  }
  return null;   // an empty pool
}
