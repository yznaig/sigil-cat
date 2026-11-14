// After world-rack-drop.js: a reload restores the rack where it stands, with no second arrival.
cat.auto = false; await site.rack.ready(); await sleep(600);
const R = site.rack, T = site.THREE, saved = store.get('rackDropCheck');
check('rack reload: no drop replays', !R.arrival && R.picture.card.position.distanceTo(new T.Vector3().setFromMatrixPosition(R.root.matrixWorld)) < 1e-9);
check('rack reload: the same place', Math.abs(R.root.position.x - saved.x) < 1e-9 && Math.abs(R.root.position.y - saved.y) < 1e-9);
