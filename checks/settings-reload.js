// Settings lane (p8): after a reload every setting is where checks/settings.js left it, in the screen and in the audio
// graph: master 0.5 and muted, music 0.6, sound effects 0.55, cat sounds 0.2, zoom at its most.
const { ZOOM } = await import(new URL('src/ui/zoom.js', document.baseURI).href);
const M = site.music, tag = `${innerWidth}x${innerHeight}`;
await until(() => !!M.control, 5000); await sleep(200);
const near = (a, b, e = 0.02) => Math.abs(a - b) < e;
const val = (id) => Number(document.getElementById(id).value);
const st = audio.state();
check(`settings ${tag} reload: the volumes, the switch and the zoom survive (state and sliders)`,
  st.muted && near(st.volume, 0.5) && near(st.levels.music, 0.6) && near(st.levels.sfx, 0.55) && near(st.levels.cat, 0.2)
  && val('set-volume') === 50 && val('vol-music') === 60 && val('vol-sfx') === 55 && val('vol-cat') === 20 && /off/i.test(document.getElementById('set-sound').textContent)
  && Math.abs(stage.zoom - ZOOM.max) < 1e-6 && val('zoom') === Math.round(ZOOM.max * 100),
  JSON.stringify({ st, zoom: stage.zoom, sliders: ['set-volume', 'vol-music', 'vol-sfx', 'vol-cat', 'zoom'].map(val) }));
audio.setMuted(false); await sleep(200);
const g = { master: audio.output().gain.value, sfx: audio.bus('sfx').gain.value, cat: audio.bus('cat').gain.value, music: M.control.gain.value };
check(`settings ${tag} reload: the audio graph has them (master 0.5, music 0.5 x 0.6, sfx 0.55, cat 0.2)`,
  near(g.master, 0.5) && near(g.music, 0.3) && near(g.sfx, 0.55) && near(g.cat, 0.2), JSON.stringify(g));
