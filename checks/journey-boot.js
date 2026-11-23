// The Journey boots (design pass, docs/journey/design.md §7): site.journey exists on the real page, every part has
// loaded (stubs or built), the graph reads the live save, and an achievement earned live is seen as progress.
// Each build unit adds its own checks/journey-<unit>.js; this one stays as the integration smoke test.
const J=site.journey;
check('journey boot: site.journey is there',!!J&&typeof J.pickNudge==='function');
check('journey boot: every part loaded',await until(()=>["voice","tells","journal","lastpage","ending","snapshot"].every(p=>p in J.parts),10000),Object.keys(J.parts).join());
check('journey boot: a fresh save is chapter 1, a visitor, no pieces',J.chapter()===1&&J.title()==='a visitor'&&J.pieces().length===0,JSON.stringify([J.chapter(),J.title(),J.pieces()]));
const n=J.pickNudge({random:()=>0});
check('journey boot: the nudge picker answers on the live save',!!n&&!site.achievements.has(n.node.id),n?.node.id);
const seen=[];J.on('progress',d=>seen.push(d.id));
site.achievements.unlock('scribble');
check('journey boot: a live achievement is progress, and resets the stuck clock',await until(()=>seen.includes('scribble'),2000)&&J.sinceProgressMs()<1000,JSON.stringify(seen));
check('journey boot: the play clock runs',J.playMs()>0);
// the book hook (src/ui/books.js -> journey.bookSections / mountBook): a section a part registers shows in the grimoire
let mounted=0;J.addSection('grimoire',{id:'boot-probe',order:99,html:()=>'<p>probe</p>',mount:()=>{mounted++;}});
site.books.open('grimoire');
const sec=await until(()=>document.querySelector('.book-sheet [data-journey="boot-probe"]'),3000);
const beforeCredits=(()=>{const a=document.querySelector('.book-sheet [data-journey="boot-probe"]'),c=document.querySelector('.book-sheet .credits');return !!a&&(!c||!!(a.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING));})();
check('journey boot: a registered section shows in the grimoire, before the credits, and is mounted',sec&&beforeCredits&&mounted===1,JSON.stringify({sec:!!sec,beforeCredits,mounted}));
const closed=[];J.on('book-closed',d=>closed.push(d.name));site.books.close();
check('journey boot: closing the book is told',await until(()=>closed.includes('grimoire'),2000),JSON.stringify(closed));
