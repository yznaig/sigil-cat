// Gags lane, playtest 2: a save from before the 2D stickers (the star and GOOD JOB were physical, stuck by state.sky;
// the bin had left after its one star). Both come back as stickers in the same places; GOOD JOB counts as the first of
// the six, so the bin will come back for the rest. Run with --storage (see run-all.sh).
cat.auto=false;await sleep(800);
const T=keepsakes.get('twinkle'),G=keepsakes.get('goodjob'),R=E.recycle,top=stage.insets.top,h=stage.height-top-stage.insets.bottom;
const at=i=>{const r=i.el.getBoundingClientRect();return [(r.x+r.width/2)/stage.width,(r.y+r.height/2)/stage.height];};
check('the old star comes back as a sticker where it was stuck',!!T&&T.el.closest('#stickers')&&Math.abs(at(T)[0]-.3)<.01&&Math.abs(at(T)[1]-(top+.2*h)/stage.height)<.01&&!store.get('worldBodies.twinkle'),JSON.stringify(T&&at(T)));
check('the old GOOD JOB comes back as a sticker too',!!G&&G.el.closest('#stickers')&&Math.abs(at(G)[0]-.84)<.01);
check('it counts as the first of six; the bin is not gone for good',R.count===1&&!R.state.gone&&!R.done);
keepsakes.give('crumbs');check('so the crumbs bring the bin back',await until(()=>R.bin,8000));
