// The floor grid (grid lane, playtest-4, 2026-11-14). Aaron: "Mock up what it would look like to put faint grid lines
// all along the 'ground'", then of the three mock-ups (branch sc/p5-gridmock): "A it is for the grid lines." (e1114-13).
// Always on; ?grid=0 leaves it out (debugging, before/after checks).
// The ground is the floor plane y = 0 the cat, the furniture and the keepsakes rest on (stage.onFloor). One static
// plane on it, drawn by one small shader: the lines are worked out per pixel from the floor position, so they recede in
// true perspective, stay about one pixel wide at any distance, zoom and pixel ratio (fwidth antialiasing) and fade out
// before they get dense enough to shimmer. It draws FIRST of everything in the main pass (the opaque list, renderOrder
// -20, no depth test or write), so every floor shadow, keepsake, piece of furniture and the cat paint over it, and
// every full-screen thing (the galaxy's dark, the loading doors, the cake's error page, flappy, the grimoire) covers it
// exactly as it covers the room.
// Cost: one draw a frame, no CPU work a frame and none on a resize or a zoom: every fade is worked out from the pixel's
// own floor and screen position, so a new window size, zoom or safe area needs nothing re-fitted.
// a, fine: one cell .25 units (about one keepsake wide), ~0.9 px lines at 8.5%, in the floor shadows' warm brown
// (#614b33, src/core/soft-floor-shadow.js), written as is (no tone mapping). Fainter or stronger is the alpha alone.
export const GRID = {cell: .25, alpha: .085, px: .9, color: [97 / 255, 75 / 255, 51 / 255]};
// Where it lives on the floor (world z: the cat's middle is 0, the room's front edge is toward +z), and its fades:
// fadeZ full in front of z = -.6, gone by -4.6 (well before the horizon, so no horizon line in the cream); edgeX from
// half way out to the screen's left and right edges; bottom: the bottom 14% of the screen, toward the chrome (NDC).
// The plane reaches past the screen at every zoom (85-130%) and window shape (checks/grid.js measures it).
const AREA = {x: [-12, 12], z: [-7, 12], fadeZ: [-.6, -4.6], edgeX: [.5, 1.02], bottom: [-1, -.72]};
export function floorGrid(site) {
  const {THREE: T, stage} = site;
  const geometry = new T.PlaneGeometry(AREA.x[1] - AREA.x[0], AREA.z[1] - AREA.z[0]);
  geometry.rotateX(-Math.PI / 2); geometry.translate((AREA.x[0] + AREA.x[1]) / 2, 0, (AREA.z[0] + AREA.z[1]) / 2);
  const material = new T.ShaderMaterial({
    // opaque list (drawn before every transparent thing) but still blended: premultiplied, like the picture batches
    transparent: false, depthTest: false, depthWrite: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor,
    uniforms: {color: {value: GRID.color}, cell: {value: GRID.cell}, alpha: {value: GRID.alpha}, px: {value: GRID.px},
      fadeZ: {value: AREA.fadeZ}, edgeX: {value: AREA.edgeX}, bottom: {value: AREA.bottom}},
    vertexShader: `varying vec3 vFloor;varying vec4 vClip;
      void main(){vFloor=(modelMatrix*vec4(position,1.)).xyz;vClip=projectionMatrix*viewMatrix*vec4(vFloor,1.);gl_Position=vClip;}`,
    // a line every cell: 1 on it, 0 off it, about px screen pixels wide; faded out before its cells get under ~5
    // pixels (so it never turns into moire), whatever the window
    fragmentShader: `varying vec3 vFloor;varying vec4 vClip;
      uniform vec3 color;uniform float cell,alpha,px;uniform vec2 fadeZ,edgeX,bottom;
      void main(){
        vec2 p=vFloor.xz,ndc=vClip.xy/vClip.w,c=p/cell,d=fwidth(c),g=abs(fract(c-.5)-.5)/max(d,1e-5);
        float on=(1.-clamp(min(g.x,g.y)-px*.5+.5,0.,1.))*(1.-smoothstep(.12,.22,max(d.x,d.y)));
        float a=alpha*on*smoothstep(fadeZ.y,fadeZ.x,p.y)*(1.-smoothstep(edgeX.x,edgeX.y,abs(ndc.x)))*smoothstep(bottom.x,bottom.y,ndc.y);
        if(a<.002)discard;
        gl_FragColor=vec4(color*a,a);
      }`,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'floor-grid'; mesh.renderOrder = -20; mesh.frustumCulled = false; mesh.raycast = () => {};
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  // its own child of the scene, beside the world presentation's root (not in it: checks/world-presentation.js draws
  // that root's pictures one by one with the root hidden, and compares). What hides the room for a whole frame hides it
  // too: the loading doors' he-alone pass hides every scene child but him.
  stage.scene.add(mesh);
  return {mesh, AREA,
    get visible() { return mesh.visible; }, set visible(v) { mesh.visible = !!v; },
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); }};
}
