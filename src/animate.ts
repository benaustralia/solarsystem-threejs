import { lerp, YEAR } from './data';
import { renderer, scene, cam, pObjs, kepPos, orbitPts, sunMat, glowMesh } from './scene';
import { state } from './state';

declare const THREE: any;

const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _vC = new THREE.Vector3(), _wp = new THREE.Vector3();

// Scale
function applyScale(t: number) {
  pObjs.forEach(p => {
    const r = lerp(p.dR, p.tR, t);
    p.mesh.scale.setScalar(r / p.dR);
    if (p.ringPivot && p.ringMesh) {
      const ir = lerp(p.dR * 1.24, p.tR * 1.24, t), or = lerp(p.dR * 2.08, p.tR * 2.08, t);
      p.ringMesh.material.uniforms.uInnerR.value = ir;
      p.ringMesh.material.uniforms.uOuterR.value = or;
      p.ringMesh.geometry.dispose();
      const rg = new THREE.RingGeometry(ir, or, 128); rg.rotateX(-Math.PI / 2);
      p.ringMesh.geometry = rg;
    }
    const d = lerp(p.dD, p.tD, t);
    p.ol.geometry.dispose(); p.ol.geometry = new THREE.BufferGeometry().setFromPoints(orbitPts(d, p.e, p.inc, p.O, p.w));
    p.moons.forEach(m => {
      m.mesh.scale.setScalar(lerp(m.dR, m.tR, t) / m.dR);
      m.dist = lerp(m.dD, m.tD, t);
    });
  });
}

// True-scale labels
const tsLabels = new Map<any, HTMLElement>();
const _proj = new THREE.Vector3();
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
let tsIdx = 0, tsLast = 0;

(() => {
  const c = document.getElementById('ts-labels')!;
  pObjs.forEach(p => {
    const d = document.createElement('div'); d.className = 'ts-label';
    d.textContent = p.name; c.appendChild(d); tsLabels.set(p.mesh, d);
  });
})();

function updateTSLabels(t: number) {
  const show = state.lerpT > .85 && !state.detailActive;
  tsLabels.forEach(d => d.style.opacity = show ? '1' : '0');
  if (!show) return;
  const sun2d = new THREE.Vector3(0, 0, 0).project(cam);
  const sx = (sun2d.x * .5 + .5) * innerWidth, sy = (-sun2d.y * .5 + .5) * innerHeight;
  if (t * 1000 - tsLast > 2800) { tsIdx = (tsIdx + 1) % pObjs.length; tsLast = t * 1000; }
  tsLabels.forEach((div, mesh) => {
    mesh.getWorldPosition(_proj); _proj.project(cam);
    if (_proj.z > 1) { div.style.opacity = '0'; return; }
    const px = (_proj.x * .5 + .5) * innerWidth, py = (-_proj.y * .5 + .5) * innerHeight;
    let dx = px - sx, dy = py - sy, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= dist; dy /= dist;
    const push = Math.max(dist + 20, clampN(innerWidth * .12, 60, 140));
    div.style.left = clampN(sx + dx * push, 8, innerWidth - 80) + 'px';
    div.style.top = clampN(sy + dy * push, 8, innerHeight - 24) + 'px';
  });
}

export function animate() {
  requestAnimationFrame(animate);
  const mul = state.fast ? 12 : 1, t = performance.now() * .001;
  const s = state;

  // Scale lerp
  if (Math.abs(s.lerpT - s.targetT) > .0004) { s.lerpT += (s.targetT - s.lerpT) * .045; applyScale(s.lerpT); }
  else if (s.lerpT !== s.targetT) { s.lerpT = s.targetT; applyScale(s.lerpT); }

  const paused = !!s.hoveredObj && !s.detailActive;

  pObjs.forEach(p => {
    const isTarget = s.detailActive && p === s.detailPObj;
    if (s.detailActive && !isTarget) {
      if (p.ringPivot) p.ringPivot.position.copy(p.mesh.position);
      if (p.ringMesh) p.ringMesh.material.uniforms.uCenter.value.copy(p.mesh.position);
      return;
    }
    if (!isTarget && !paused) {
      p.M += (2 * Math.PI / (p.period * YEAR)) * mul;
      p.mesh.position.copy(kepPos(lerp(p.dD, p.tD, s.lerpT), p.e, p.inc, p.O, p.w, p.M));
    }
    if (!paused) p.rotAng += p.rotSpd * (isTarget ? .15 : mul);
    p.mat.uniforms.uRotY.value = p.rotAng;
    p.mat.uniforms.uTime.value = t;
    if (p.ringPivot) {
      p.ringPivot.position.copy(p.mesh.position);
      p.ringMesh.material.uniforms.uCenter.value.copy(p.mesh.position);
    }
    p.moons.forEach(m => {
      if (!paused) m.angle += m.speed * (isTarget ? .08 : mul);
      m.mesh.position.set(
        p.mesh.position.x + Math.cos(m.angle) * m.dist,
        p.mesh.position.y,
        p.mesh.position.z + Math.sin(m.angle) * m.dist,
      );
      m.mesh.material.uniforms.uTime.value = t;
    });
  });

  sunMat.uniforms.uTime.value = t;
  glowMesh.position.set(0, 0, 0);

  // Camera
  if (s.detailActive && s.detailTarget) {
    s.detailTarget.getWorldPosition(_wp);
    const r = s.detailTarget.userData.radius * (s.detailTarget.scale?.x || 1);
    _vA.set(0, 0, 0).sub(_wp).normalize();
    _vB.set(0, 1, 0);
    _vC.crossVectors(_vA, _vB).normalize();
    _vA.addScaledVector(_vC, .4).add(new THREE.Vector3(0, .25, 0)).normalize();
    if (!s.detailCamSnapped) { cam.position.copy(_wp).addScaledVector(_vA, r * 5); s.detailCamSnapped = true; }
    cam.lookAt(_wp);
  } else {
    if (t * 1000 - s.lastInteract > 4000) s.camT += .00018;
    s.radius += (s.targetRadius - s.radius) * .08;
    cam.position.set(
      s.radius * Math.sin(s.camT) * Math.cos(s.camP),
      s.radius * Math.sin(s.camP),
      s.radius * Math.cos(s.camT) * Math.cos(s.camP),
    );
    cam.lookAt(0, 0, 0);
  }

  updateTSLabels(t);
  renderer.render(scene, cam);
}
