// Settings lane (p8): a save from before the settings screen (sound.volume, sound.muted, view.zoom, no sound.levels;
// run with --storage) keeps what it had: the same master volume, mute and zoom, and every new volume at full.
const M = site.music, tag = `${innerWidth}x${innerHeight}`;
await until(() => !!M.control, 5000); await sleep(200);
const near = (a, b, e = 0.02) => Math.abs(a - b) < e;
const val = (id) => Number(document.getElementById(id).value);
const st = audio.state();
check(`settings ${tag} an old save migrates: master 0.37 muted, zoom 0.9, music / effects / cat at full`,
  st.muted && near(st.volume, 0.37) && st.levels.music === 1 && st.levels.sfx === 1 && st.levels.cat === 1 && Math.abs(stage.zoom - 0.9) < 1e-6
  && val('set-volume') === 37 && val('vol-music') === 100 && val('vol-sfx') === 100 && val('vol-cat') === 100 && val('zoom') === 90 && /off/i.test(document.getElementById('set-sound').textContent),
  JSON.stringify({ st, zoom: stage.zoom, bonks: store.get('bonks') }));
audio.setMuted(false); await sleep(200);
const g = { master: audio.output().gain.value, sfx: audio.bus('sfx').gain.value, cat: audio.bus('cat').gain.value, music: M.control.gain.value };
check(`settings ${tag} an old save migrates: the graph is the old one (everything at the master's 0.37)`, near(g.master, 0.37) && near(g.music, 0.37) && near(g.sfx, 1) && near(g.cat, 1) && store.get('bonks') === 42, JSON.stringify(g));
