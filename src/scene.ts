import { SUN_DR, PR, PLANETS, BSC, D, lerp, YEAR, defRadius, type PlanetDef } from './data';
import { vertPlanet, fragPlanet, fragSun, fragTexPlanet, vertRing, fragRing, COL } from './shaders/index';
import { state } from './state';

declare const THREE: any;

// Radial gradient canvas texture helper
function radialTex(size: number, stops: [number, string][]): any {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d')!, h = size / 2;
  const g = x.createRadialGradient(h, h, 0, h, h, h);
  stops.forEach(([s, col]) => g.addColorStop(s, col));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// Renderer
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000008, 1);
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
export const cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 2e6);
cam.position.set(0, state.radius * .18, state.radius); cam.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight;
  cam.fov = innerHeight > innerWidth ? 75 : 55;
  cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  state.targetRadius = defRadius();
});

// Earth land mask
const W = 512, H = 256;
const earthCanvas = (() => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d')!.fillRect(0, 0, W, H); return c;
})();
export const earthLandTex = new THREE.CanvasTexture(earthCanvas);
earthLandTex.wrapS = THREE.RepeatWrapping;

fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
  .then(r => r.json()).then((topo: any) => {
    const { arcs, transform: { scale, translate: trans } } = topo;
    const ctx = earthCanvas.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    const decArc = (i: number) => {
      const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      let x = 0, y = 0;
      return a.map(([dx, dy]: number[]) => { x += dx; y += dy; return [x * scale[0] + trans[0], y * scale[1] + trans[1]]; });
    };
    topo.objects.land.geometries.forEach((g: any) => {
      const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
      polys.forEach((poly: any) => {
        const ring = poly[0].flatMap(decArc);
        ctx.beginPath();
        let prevLon = 0;
        ring.forEach(([lon, lat]: number[], i: number) => {
          const x = (lon + 180) / 360 * W, y = (90 - lat) / 180 * H;
          // Break path at antimeridian crossings to avoid stray lines
          if (i === 0 || Math.abs(lon - prevLon) > 90) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          prevLon = lon;
        });
        ctx.closePath(); ctx.fill();
      });
    });
    earthLandTex.needsUpdate = true;
  }).catch(() => {});

// Planet texture URLs (Wikimedia Commons, CORS-enabled)
const WM = 'https://upload.wikimedia.org/wikipedia/commons/';
const TEX_URLS: Record<string, string> = {
  mercury:  WM + '9/92/Solarsystemscope_texture_2k_mercury.jpg',
  venus:    WM + '6/63/Solarsystemscope_texture_2k_venus_atmosphere.jpg',
  earth:    WM + '0/04/Solarsystemscope_texture_8k_earth_daymap.jpg',
  mars:     WM + '4/46/Solarsystemscope_texture_2k_mars.jpg',
  jupiter:  WM + 'b/be/Solarsystemscope_texture_2k_jupiter.jpg',
  saturn:   WM + 'e/ea/Solarsystemscope_texture_2k_saturn.jpg',
  uranus:   WM + '9/95/Solarsystemscope_texture_2k_uranus.jpg',
  neptune:  WM + '1/1e/Solarsystemscope_texture_2k_neptune.jpg',
  moon:     WM + '2/26/Solarsystemscope_texture_2k_moon.jpg',
  europa:   WM + '2/26/Europa_Voyager_GalileoSSI_global_mosaic.jpg',
  titan:    WM + 'b/bc/PIA22770-SaturnMoon-Titan-Surface-20181206.jpg',
};

// Per-planet atmosphere/lighting config for texture shader
const TEX_OPTS: Record<string, Parameters<typeof fragTexPlanet>[0]> = {
  mercury:  { ambient: 0.45, specPower: 16, specStrength: 0.03 },
  venus:    { ambient: 0.50, rimColor: 'vec3(.98,.92,.62)', rimPower: 2, rimStrength: 0.6 },
  earth:    { ambient: 0.45, rimColor: 'vec3(.28,.55,.95)', rimPower: 2.5, rimStrength: 0.7,
              specPower: 28, specStrength: 0.15, cloudLayer: true, nightCities: true, hasLandMask: true },
  mars:     { ambient: 0.45, rimColor: 'vec3(.85,.55,.38)', rimPower: 3, rimStrength: 0.35 },
  jupiter:  { ambient: 0.45, rimColor: 'vec3(.8,.7,.5)', rimPower: 3, rimStrength: 0.15, specPower: 6, specStrength: 0.06 },
  saturn:   { ambient: 0.45, rimColor: 'vec3(.75,.80,.85)', rimPower: 2.5, rimStrength: 0.1, specPower: 5, specStrength: 0.06 },
  uranus:   { ambient: 0.45, rimColor: 'vec3(.55,.90,.95)', rimPower: 3, rimStrength: 0.35 },
  neptune:  { ambient: 0.45, rimColor: 'vec3(.35,.65,.98)', rimPower: 2, rimStrength: 0.5 },
  moon:     { ambient: 0.45, specPower: 3, specStrength: 0.03 },
  europa:   { ambient: 0.45, specPower: 32, specStrength: 0.3 },
  titan:    { ambient: 0.45, rimColor: 'vec3(.92,.52,.06)', rimPower: 1.8, rimStrength: 0.55 },
};

const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin('anonymous');

// Material factories
function mkPlanetMat(key: string) {
  const u: any = { uTime: { value: 0 }, uRotY: { value: 0 }, uTilt: { value: 0 } };

  // Sun — keep procedural
  if (key === 'sun') {
    return new THREE.ShaderMaterial({
      vertexShader: vertPlanet, fragmentShader: fragSun,
      uniforms: u, transparent: false, depthWrite: true, depthTest: true,
    });
  }

  // Texture-based planets
  const texUrl = TEX_URLS[key];
  const opts = TEX_OPTS[key] || {};

  if (texUrl) {
    const placeholderTex = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, THREE.RGBAFormat);
    placeholderTex.needsUpdate = true;
    u.uTexture = { value: placeholderTex };
    if (opts.hasLandMask) u.uLandMask = { value: earthLandTex };

    // Load real texture async
    texLoader.load(texUrl, (tex: any) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      u.uTexture.value = tex;
    });

    return new THREE.ShaderMaterial({
      vertexShader: vertPlanet, fragmentShader: fragTexPlanet(opts),
      uniforms: u, transparent: false, depthWrite: true, depthTest: true,
    });
  }

  // Fallback to procedural
  return new THREE.ShaderMaterial({
    vertexShader: vertPlanet, fragmentShader: fragPlanet(COL[key] || COL.generic),
    uniforms: u, transparent: false, depthWrite: true, depthTest: true,
  });
}

function mkRingMat(innerR: number, outerR: number) {
  return new THREE.ShaderMaterial({
    vertexShader: vertRing, fragmentShader: fragRing,
    uniforms: { uInnerR: { value: innerR }, uOuterR: { value: outerR }, uCenter: { value: new THREE.Vector3() } },
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
  });
}

// Keplerian orbit
export function kepPos(a: number, e: number, inc: number, O: number, w: number, M: number) {
  let E = M; for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const [cosO, sinO, cosI, sinI, cosW, sinW] = [Math.cos(O), Math.sin(O), Math.cos(inc), Math.sin(inc), Math.cos(w), Math.sin(w)];
  return new THREE.Vector3(
    (cosO * cosW - sinO * sinW * cosI) * x + (-cosO * sinW - sinO * cosW * cosI) * y,
    sinI * sinW * x + sinI * cosW * y,
    (sinO * cosW + cosO * sinW * cosI) * x + (-sinO * sinW + cosO * cosW * cosI) * y,
  );
}

export function orbitPts(a: number, e: number, inc: number, O: number, w: number) {
  const pts: any[] = [];
  for (let i = 0; i <= 128; i++) pts.push(kepPos(a, e, inc, O, w, i / 128 * Math.PI * 2));
  return pts;
}

// Stars
function buildStars() {
  const pos: number[] = [], cols: number[] = [];
  const sprite = radialTex(32, [[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.6)'], [1, 'rgba(0,0,0,0)']]);
  for (const [ra, dec, mag, ci] of BSC) {
    if (mag > 6.5) continue;
    const phi = (90 - dec) * D, theta = ra * D, dist = 8e4 * (1 + Math.random() * .2);
    pos.push(dist * Math.sin(phi) * Math.cos(theta), dist * Math.cos(phi), dist * Math.sin(phi) * Math.sin(theta));
    const v = Math.pow(10, -mag * .15) * 1.8, t = Math.max(0, Math.min(1, (ci + .4) / 2.2));
    cols.push(lerp(.8, 1, t) * v, lerp(.85, .75, t) * v, lerp(1, .6, t) * v);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 1.5 / PR, vertexColors: true, sizeAttenuation: false,
    map: sprite, alphaTest: .05, transparent: true, depthWrite: false,
  })));
}
setTimeout(buildStars, 100);

// Sun
const sunMat = mkPlanetMat('sun');
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_DR, 64, 32), sunMat);
sunMesh.userData = { name: 'Sun', isPlanet: false, radius: SUN_DR };
scene.add(sunMesh);
// Inner corona — bright, tight halo
const glowInner = new THREE.Sprite(new THREE.SpriteMaterial({
  map: radialTex(256, [
    [0, 'rgba(255,240,200,.7)'],
    [.15, 'rgba(255,200,80,.45)'],
    [.35, 'rgba(255,140,30,.12)'],
    [.6, 'rgba(255,80,0,.03)'],
    [1, 'rgba(0,0,0,0)'],
  ]),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
glowInner.scale.set(SUN_DR * 3.5, SUN_DR * 3.5, 1);
scene.add(glowInner);

// Outer corona — diffuse, wider glow
const glowOuter = new THREE.Sprite(new THREE.SpriteMaterial({
  map: radialTex(256, [
    [0, 'rgba(255,180,60,.18)'],
    [.2, 'rgba(255,120,20,.08)'],
    [.5, 'rgba(255,60,0,.02)'],
    [1, 'rgba(0,0,0,0)'],
  ]),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
glowOuter.scale.set(SUN_DR * 8, SUN_DR * 8, 1);
scene.add(glowOuter);

// Subtle warm ambient glow — very large, barely visible
const glowAmbient = new THREE.Sprite(new THREE.SpriteMaterial({
  map: radialTex(128, [
    [0, 'rgba(255,100,20,.06)'],
    [.3, 'rgba(255,60,0,.02)'],
    [1, 'rgba(0,0,0,0)'],
  ]),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
glowAmbient.scale.set(SUN_DR * 14, SUN_DR * 14, 1);
scene.add(glowAmbient);

// Keep glowMesh alias for compatibility
const glowMesh = glowInner;

// Planet runtime object
export interface PlanetObj {
  mesh: any; mat: any; ol: any; moons: MoonObj[];
  ringMesh: any; ringPivot: any;
  M: number; e: number; inc: number; O: number; w: number; period: number;
  dR: number; tR: number; dD: number; tD: number; rotSpd: number;
  rotAng: number; tilt: number; name: string;
}
export interface MoonObj {
  mesh: any; speed: number; dist: number; angle: number;
  dR: number; tR: number; dD: number; tD: number;
}

export const pObjs: PlanetObj[] = [];
export const planetMeshes: any[] = [sunMesh];

PLANETS.forEach(p => {
  const ol = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(orbitPts(p.dD, p.e, p.inc, p.O, p.w)),
    new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: .5, depthWrite: false }),
  );
  scene.add(ol);

  const mat = mkPlanetMat(p.shader); mat.uniforms.uTilt.value = p.tilt;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.dR, 48, 24), mat);
  mesh.userData = { name: p.name, isPlanet: true, shKey: p.shader, radius: p.dR };
  scene.add(mesh); planetMeshes.push(mesh);

  let ringMesh: any = null, ringPivot: any = null;
  if (p.name === 'Saturn') {
    const ir = p.dR * 1.24, or = p.dR * 2.08;
    const rg = new THREE.RingGeometry(ir, or, 128); rg.rotateX(-Math.PI / 2);
    ringMesh = new THREE.Mesh(rg, mkRingMat(ir, or));
    ringPivot = new THREE.Object3D(); ringPivot.rotation.z = p.tilt;
    ringPivot.add(ringMesh); ringMesh.renderOrder = 2;
    // Put planet inside pivot so sphere + ring tilt together
    ringPivot.add(mesh);
    mat.uniforms.uTilt.value = 0; // tilt handled by pivot, not shader
    scene.add(ringPivot);
  }

  const moonObjs: MoonObj[] = p.moons.map(m => {
    const mm = new THREE.Mesh(new THREE.SphereGeometry(m.dR, 48, 24), mkPlanetMat(m.shader));
    mm.userData = { name: m.name, isMoon: true, radius: m.dR };
    scene.add(mm);
    return { mesh: mm, speed: m.speed, dist: m.dD, angle: Math.random() * Math.PI * 2, dR: m.dR, tR: m.tR, dD: m.dD, tD: m.tD };
  });

  pObjs.push({
    mesh, mat, ol, moons: moonObjs, ringMesh, ringPivot,
    M: Math.random() * Math.PI * 2, e: p.e, inc: p.inc, O: p.O, w: p.w,
    period: p.period, dR: p.dR, tR: p.tR, dD: p.dD, tD: p.tD,
    rotSpd: p.rotSpd, rotAng: Math.random() * Math.PI * 2, tilt: p.tilt, name: p.name,
  });
});

// 'Oumuamua — interstellar object on a hyperbolic flyby
const oumuamuaMat = mkPlanetMat('generic');
// Elongated shape — stretched sphere
const oumuamuaMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 8), oumuamuaMat);
oumuamuaMesh.scale.set(1, 0.3, 0.3); // ~10:1 elongation
oumuamuaMesh.userData = { name: "'Oumuamua", isOumuamua: true, radius: 0.4 };
scene.add(oumuamuaMesh);

// Trail for 'Oumuamua
const oumuamuaTrailPts = new Array(80).fill(null).map(() => new THREE.Vector3());
const oumuamuaTrailGeo = new THREE.BufferGeometry().setFromPoints(oumuamuaTrailPts);
const oumuamuaTrail = new THREE.Line(oumuamuaTrailGeo, new THREE.LineBasicMaterial({
  color: 0x886644, transparent: true, opacity: 0.4, depthWrite: false,
}));
scene.add(oumuamuaTrail);

// Highlight ring — shown around hovered planet (camera-facing)
const highlightRingGeo = new THREE.RingGeometry(0.85, 1.0, 64);
const highlightRing = new THREE.Mesh(highlightRingGeo, new THREE.MeshBasicMaterial({
  color: 0xffffff, side: THREE.DoubleSide,
  depthTest: false, depthWrite: false,
}));
highlightRing.visible = false;
highlightRing.renderOrder = 999;
scene.add(highlightRing);

export { sunMat, sunMesh, glowMesh, glowOuter, glowAmbient, oumuamuaMesh, oumuamuaMat, oumuamuaTrailPts, oumuamuaTrailGeo, highlightRing };
