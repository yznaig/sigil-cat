// Felt: the matte black flocked look of the brothers' sheet, for anything built as a mesh in the cat's material
// (Butterman). The cat himself is splats with the look baked in; this is the same felt as a material: near-black,
// soft, a velvet sheen at grazing angles, and the brothers' own fibre texture (assets/textures/fiber-tile.png, cut
// from their loaf sheet) projected from three sides so it needs no UVs and never shimmers.
// grain: scales the fibres (a body modelled in other units passes its own size here so its fibres match the cat's).
import * as THREE from 'three';

export const FELT = {
  black: '#121212', roughness: 0.93, sheen: 0.8, sheenColor: '#4a4744', sheenRoughness: 0.75,
  image: { tone: 0.6, scale: 10, shade: 0.006 },   // the fibre tile: contrast, tiles per unit, how much shows in shadow
  tile: 'assets/textures/fiber-tile.png',
};
let tile = null;
function fibreTile(renderer) {
  if (tile) return tile;
  tile = new THREE.TextureLoader().load(new URL('../../' + FELT.tile, import.meta.url).href);
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.colorSpace = THREE.NoColorSpace;          // detail data, not colour
  tile.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tile;
}

export function makeFeltMaterial(renderer, { grain = { value: 1 } } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: FELT.black, roughness: FELT.roughness, metalness: 0,
    sheen: FELT.sheen, sheenRoughness: FELT.sheenRoughness, sheenColor: new THREE.Color(FELT.sheenColor),
  });
  const uniforms = { uFiberTex: { value: fibreTile(renderer) }, uImage: { value: new THREE.Vector3(FELT.image.tone, FELT.image.scale, FELT.image.shade) }, uGrain: grain };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uGrain; varying vec3 vGrainPos; varying vec3 vGrainNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrainPos = position * uGrain; vGrainNrm = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrainPos; varying vec3 vGrainNrm; uniform sampler2D uFiberTex; uniform vec3 uImage; float imageDetail;')
      .replace('#include <color_fragment>', `#include <color_fragment>
// Triplanar: sample the tile from three directions and blend by the surface normal (no UVs needed).
vec3 tp = vGrainPos * uImage.y;
vec3 tw = pow(abs(normalize(vGrainNrm)), vec3(4.0)); tw /= (tw.x + tw.y + tw.z);
imageDetail = (texture2D(uFiberTex, tp.yz).r * tw.x + texture2D(uFiberTex, tp.zx + 0.37).r * tw.y + texture2D(uFiberTex, tp.xy + 0.71).r * tw.z) - 0.5;`)
      .replace('#include <opaque_fragment>', `outgoingLight = outgoingLight * (1.0 + imageDetail * uImage.x * 2.0) + vec3(max(imageDetail, 0.0) * uImage.z);
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'felt';
  return m;
}
