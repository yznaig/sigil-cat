// completionist.js (p8 achievements lane): Aaron, "I got the completionist achievement but hadnt gotten these 2
// achievements yet, is that intentional?" Completionist is every grimoire page (src/finds.js) and every other
// achievement but Platinum Cat (made of Completionist). Run with checks/lib.js, from the saves run-all builds:
//   ?ach=gap     every achievement, every page but the whisper, and the long-gone found.star (no stand-in): locked
//                until the last page is found the way the egg finds it (registry.find), then it and Platinum follow
//   ?ach=achgap  every page, every achievement but Buttaman! and Collector (Aaron's save): locked through the first,
//                unlocked the moment the second lands
//   ?ach=kept    a save that already holds Completionist and little else keeps it (never taken away)
const A = site.achievements, mode = new URLSearchParams(location.search).get('ach');
await sleep(600);                                                   // the boot's quiet evaluate has run
if (mode === 'kept') {
  check('completionist an earned Completionist is kept on load', A.has('complete') && store.get('achievements.complete') === 1762800000000,
    `${registry.count()} of ${registry.total} pages, ${A.count} of ${A.total} achievements`);
} else if (mode === 'achgap') {
  check('completionist the save has every page, two achievements short', registry.count() === registry.total && !A.has('buttaman') && !A.has('collector') && A.count === A.total - 4,
    `${registry.count()} of ${registry.total} pages, ${A.count} of ${A.total}`);
  check('completionist stays locked with every page but achievements left', !A.has('complete') && !A.has('platinum'));
  A.unlock('buttaman');                                             // as src/eggs/butterman.js does at the third yell
  await sleep(500);
  check('completionist still locked with one achievement left', A.has('buttaman') && !A.has('complete'), `${A.count} of ${A.total}`);
  A.unlock('collector');
  check('completionist unlocks the moment the last other achievement lands', await until(() => A.has('complete'), 3000), `${A.count} of ${A.total}`);
  check('completionist Platinum Cat follows it', await until(() => A.has('platinum'), 3000) && A.count === A.total);
  store.set('completionistCheck', store.get('achievements.complete'));
} else {
  check('completionist the save is one page short (found.star counts for nothing)', store.get('found.star') === 1 && registry.count() === registry.total - 1 && !registry.has('whisper'),
    `${registry.count()} of ${registry.total}`);
  check('completionist stays locked while a page is unfound', !A.has('complete'), `${A.count} of ${A.total} achievements`);
  registry.find('whisper');                                         // as src/eggs/butterman.js finds it
  check('completionist unlocks the moment the last page is found', await until(() => A.has('complete'), 3000) && registry.count() === registry.total && A.has('whisper'),
    `${registry.count()} of ${registry.total} pages`);
  check('completionist Platinum Cat follows it', await until(() => A.has('platinum'), 3000));
  store.set('completionistCheck', store.get('achievements.complete'));
}
