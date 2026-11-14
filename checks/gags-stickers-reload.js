// After gags-stickers.js: the sticker is back where it was left, in the top layer.
cat.auto=false;await sleep(600);
const star=keepsakes.get('twinkle'),saved=store.get('stickerCheck'),r=star?.el.getBoundingClientRect();
check('the sticker comes back after a reload, where it was left',!!star&&star.el.closest('#stickers')&&Math.abs((r.x+r.width/2)/stage.width-saved.f[0])<.003&&Math.abs((r.y+r.height/2)/stage.height-saved.f[1])<.003,JSON.stringify({f:saved?.f,r}));
await __shot('gags-sticker-reload');
