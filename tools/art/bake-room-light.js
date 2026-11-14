// bake-room-light.js: the soft studio light the felt and the butter are lit by, baked to a tiny file.
// The light is three.js's own RoomEnvironment (a grey room with a bright ceiling panel and a few white boxes), which
// the page used to build in the browser every visit (about a third of a second of stopped page on a slow driver).
// This draws that room once, unwraps it to a 64 x 32 picture of the whole surrounding (equirectangular, linear light,
// 32-bit floats) and prints it; src/core/stage.js loads the file and hands it to three as the scene's environment.
// Run (a server must be up):
//   node checks/run.mjs http://localhost:8732/?eggs=none --lib checks/lib.js --js tools/art/bake-room-light.js --quiet \
//     | grep '^ROOMLIGHT ' | cut -d' ' -f2 | base64 -d > assets/textures/room-light.f32
const THREE = site.THREE, r = stage.renderer, W = 64, H = 32;
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
const cam = new THREE.CubeCamera(0.1, 100, cubeRT);
const tone = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
cam.update(r, new RoomEnvironment());
const out = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { cube: { value: cubeRT.texture } }, depthTest: false, toneMapped: false,
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  // each output pixel is the average of a small fan of directions around its own, so no bright box is missed
  fragmentShader: `uniform samplerCube cube; varying vec2 vUv; const float PI = 3.14159265;
    vec3 dirOf(vec2 uv) { float phi = (uv.x - 0.5) * 2.0 * PI, th = (0.5 - uv.y) * PI; return vec3(cos(th) * sin(phi), sin(th), -cos(th) * cos(phi)); }
    void main() { vec3 s = vec3(0.0); for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) s += textureCube(cube, dirOf(vUv + (vec2(float(i), float(j)) - 1.5) / vec2(${W * 4}.0, ${H * 4}.0))).rgb; gl_FragColor = vec4(s / 16.0, 1.0); }`,
}));
const scn = new THREE.Scene(); scn.add(quad);
r.setRenderTarget(out); r.render(scn, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)); r.setRenderTarget(null);
r.toneMapping = tone;
const px = new Float32Array(W * H * 4); r.readRenderTargetPixels(out, 0, 0, W, H, px);
const rgb = new Float32Array(W * H * 3); let max = 0, sum = 0;
for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) { const v = px[i * 4 + k]; rgb[i * 3 + k] = v; max = Math.max(max, v); sum += v; }
const bytes = new Uint8Array(rgb.buffer); let bin = '';
for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
__say(`CHECK room light: ${W}x${H}, brightest ${max.toFixed(2)}, mean ${(sum / (W * H * 3)).toFixed(3)}, ${bytes.length} bytes`);
__say('ROOMLIGHT ' + btoa(bin));
