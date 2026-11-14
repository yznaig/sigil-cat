import {T,body} from './forms.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const physics=body(.040,[{type:'sphere',radius:.205,position:[-.26,.18,0]},{type:'sphere',radius:.235,position:[-.04,.235,0]},{type:'sphere',radius:.20,position:[.25,.17,0]}],{skyAnchor:[0,.25,0],eyes:[0,.20,.216]});
export async function create({variant}={}){
 const g=new T.Group();g.name='cloud';const model=await new GLTFLoader().loadAsync(new URL('./cloud-surface.glb',import.meta.url).href),u={storm:{value:0},glow:{value:0}},material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1});
 material.onBeforeCompile=s=>{s.uniforms.uStorm=u.storm;s.uniforms.uGlow=u.glow;
 s.vertexShader='varying vec3 vCloudPosition;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCloudPosition=position;');
 s.fragmentShader='varying vec3 vCloudPosition;uniform float uStorm;uniform float uGlow;\n'+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float base=1.0-smoothstep(.065,.32,vCloudPosition.y);
 float curls=.5+.5*sin(vCloudPosition.x*27.0+sin(vCloudPosition.z*24.0))*sin(vCloudPosition.y*31.0);
 vec3 quiet=mix(vec3(.80,.84,.90),vec3(.49,.55,.63),base*.43);
 vec3 storm=mix(vec3(.64,.69,.77),vec3(.065,.085,.135),base);
 diffuseColor.rgb*=mix(quiet,storm,uStorm)*(1.0-curls*.045);`);
 s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float under=1.0-smoothstep(.065,.17,vCloudPosition.y);
 float core=exp(-18.0*dot(vCloudPosition.xz-vec2(.07,.025),vCloudPosition.xz-vec2(.07,.025)));
 totalEmissiveRadiance+=vec3(.22,.36,.70)*uGlow*under*core;`);
 };material.customProgramCacheKey=()=> 'sigil-cloud-closed-v1';
 model.scene.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=o.receiveShadow=true;}});g.add(model.scene);g.userData.physics=physics;g.userData.cloudUniforms=u;
 if(variant==='storm'||variant==='under')setStorm(g,1,.8);return g;
}
// Caller owns the finite lightning envelope and stops rendering after it ends.
export function setStorm(g,darkness=0,glow=0){g.userData.cloudUniforms.storm.value=T.MathUtils.clamp(darkness,0,1);g.userData.cloudUniforms.glow.value=T.MathUtils.clamp(glow,0,1);}
