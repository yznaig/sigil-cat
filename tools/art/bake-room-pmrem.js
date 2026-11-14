// bake-room-pmrem.js: the room light (assets/textures/room-light.f32) prefiltered for every roughness, baked to a file,
// so the page never runs three's PMREM build (speed lane, playtest-2; e1112-59 cost 1: its two shaders and its passes
// stopped the page for 0.3-0.5 s while he was being warmed up). This runs exactly what src/core/stage.js used to run
// in the browser (PMREMGenerator.fromEquirectangular on the 64 x 32 picture) and reads the result back unchanged:
// a 336 x 64 half-float RGBA picture in three's "cube UV" layout. stage.ensureEnv loads it as the scene's environment.
// Run (a server must be up):
//   node checks/run.mjs http://localhost:18809/?eggs=none --lib checks/lib.js --js tools/art/bake-room-pmrem.js --quiet \
//     | grep '^ROOMPMREM ' | cut -d' ' -f2 | base64 -d > assets/textures/room-light.pmrem.f16
const THREE = site.THREE, r = stage.renderer, W = 64, H = 32;
const rgb = new Float32Array(await (await fetch('/assets/textures/room-light.f32')).arrayBuffer()), data = new Float32Array(W * H * 4);
for (let i = 0; i < W * H; i++) { data[i * 4] = rgb[i * 3]; data[i * 4 + 1] = rgb[i * 3 + 1]; data[i * 4 + 2] = rgb[i * 3 + 2]; data[i * 4 + 3] = 1; }
const eq = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
eq.mapping = THREE.EquirectangularReflectionMapping; eq.colorSpace = THREE.LinearSRGBColorSpace;
eq.magFilter = eq.minFilter = THREE.LinearFilter; eq.needsUpdate = true;
const pmrem = new THREE.PMREMGenerator(r);
const target = pmrem.fromEquirectangular(eq);
const w = target.width, h = target.height, px = new Uint16Array(w * h * 4);
r.readRenderTargetPixels(target, 0, 0, w, h, px);
let nonzero = 0; for (const v of px) if (v) nonzero++;
const bytes = new Uint8Array(px.buffer); let bin = '';
for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
__say(`CHECK room pmrem: ${w}x${h} half floats, ${nonzero} of ${px.length} non-zero, mapping ${target.texture.mapping}`);
__say('ROOMPMREM ' + btoa(bin));
__done();
