import { YEAR, SUN_DR } from './data';
import { renderer, scene, cam, pObjs, kepPos, sunMat, sunMesh, glowMesh, glowOuter, glowAmbient, oumuamuaMesh, oumuamuaMat, oumuamuaTrailPts, oumuamuaTrailGeo, highlightRing } from './scene';
import { state } from './state';

declare const THREE: any;

const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _vC = new THREE.Vector3(), _wp = new THREE.Vector3();

export function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * .001;
  const s = state;

  const paused = !!s.hoveredObj;

  pObjs.forEach(p => {
    const isTarget = s.detailActive && p === s.detailPObj;
    if (s.detailActive && !isTarget) {
      if (p.ringPivot && p.ringMesh) {
        p.mesh.getWorldPosition(_wp);
        p.ringMesh.material.uniforms.uCenter.value.copy(_wp);
      }
      return;
    }
    if (!isTarget && !paused) {
      p.M += (2 * Math.PI / (p.period * YEAR));
      const orbPos = kepPos(p.dD, p.e, p.inc, p.O, p.w, p.M);
      if (p.ringPivot) {
        p.ringPivot.position.copy(orbPos);
        p.mesh.position.set(0, 0, 0);
      } else {
        p.mesh.position.copy(orbPos);
      }
    }
    if (!paused && !s.kikiOpen) p.rotAng += p.rotSpd * (isTarget ? .15 : 1);
    p.mat.uniforms.uRotY.value = p.rotAng;
    p.mat.uniforms.uTime.value = t;
    if (p.ringPivot) {
      p.mesh.getWorldPosition(_wp);
      p.ringMesh.material.uniforms.uCenter.value.copy(_wp);
    }
    // Get planet world position for moon orbits
    p.mesh.getWorldPosition(_wp);
    p.moons.forEach(m => {
      if (!paused && !s.kikiOpen) m.angle += m.speed * (isTarget ? .08 : 1);
      m.mesh.position.set(
        _wp.x + Math.cos(m.angle) * m.dist,
        _wp.y,
        _wp.z + Math.sin(m.angle) * m.dist,
      );
      m.mesh.material.uniforms.uTime.value = t;
    });
  });

  sunMat.uniforms.uTime.value = t;
  // Enlarge sun in detail view so it looms large in the background
  const sunScale = s.detailActive && !s.moonDetailActive ? 8 : 1;
  sunMesh.scale.setScalar(sunScale);
  const gi = SUN_DR * 3.5 * sunScale;
  glowMesh.scale.set(gi, gi, 1);
  const go = SUN_DR * 8 * sunScale;
  glowOuter.scale.set(go, go, 1);
  const ga = SUN_DR * 14 * sunScale;
  glowAmbient.scale.set(ga, ga, 1);
  sunMesh.position.set(0, 0, 0);
  glowMesh.position.set(0, 0, 0);
  glowOuter.position.set(0, 0, 0);
  glowAmbient.position.set(0, 0, 0);

  // 'Oumuamua — hyperbolic flyby on a ~120s loop
  // Real trajectory: came from above ecliptic, perihelion ~0.25 AU, departed below
  {
    const CYCLE = 120; // seconds per flyby cycle
    const phase = (t % CYCLE) / CYCLE; // 0→1
    // Parametric hyperbolic path: enters from far away, swoops near sun, exits
    const u = (phase - 0.5) * 8; // -4 to +4, center is perihelion
    const periDist = 20; // closest approach in display units
    // Hyperbolic coords: x = periDist * cosh(u), y = periDist * sinh(u) * sin(inc), z = periDist * sinh(u) * cos(inc)
    const coshU = (Math.exp(u) + Math.exp(-u)) / 2;
    const sinhU = (Math.exp(u) - Math.exp(-u)) / 2;
    const inc = 1.22; // ~70° inclination (real: 122° from ecliptic → retrograde)
    const rotAngle = 0.8; // rotate trajectory in ecliptic
    const rawX = periDist * coshU;
    const rawY = periDist * sinhU;
    const px = rawX * Math.cos(rotAngle) - rawY * Math.cos(inc) * Math.sin(rotAngle);
    const py = rawY * Math.sin(inc);
    const pz = rawX * Math.sin(rotAngle) + rawY * Math.cos(inc) * Math.cos(rotAngle);
    oumuamuaMesh.position.set(px, py, pz);
    // Tumbling rotation
    oumuamuaMesh.rotation.set(t * 1.3, t * 0.7, t * 0.4);
    oumuamuaMat.uniforms.uTime.value = t;
    // Fade: visible only during the close approach portion
    const dist = Math.sqrt(px * px + py * py + pz * pz);
    const fade = Math.max(0, 1 - dist / 600);
    oumuamuaMesh.visible = fade > 0.01;
    // Update trail
    if (oumuamuaMesh.visible) {
      for (let i = oumuamuaTrailPts.length - 1; i > 0; i--) oumuamuaTrailPts[i].copy(oumuamuaTrailPts[i - 1]);
      oumuamuaTrailPts[0].set(px, py, pz);
      oumuamuaTrailGeo.setFromPoints(oumuamuaTrailPts);
    }
  }

  // Camera
  if (s.moonDetailActive && s.moonDetailTarget) {
    // Moon close-up: camera between sun and moon so moon is front-lit
    const mr = s.moonDetailTarget.userData.radius * (s.moonDetailTarget.scale?.x || 1);
    const moonDist = mr * 3.2;
    // Moon far from origin; camera between sun (origin) and moon
    const viewPos = new THREE.Vector3(moonDist * 12, moonDist * 1.5, 0);
    s.moonDetailTarget.position.copy(viewPos);
    // Keep moon rotating
    if (s.moonDetailMoonObj) {
      s.moonDetailTarget.material.uniforms.uRotY.value += 0.008;
      s.moonDetailTarget.material.uniforms.uTime.value = t;
    }
    if (!s.moonCamSnapped) {
      cam.position.set(
        viewPos.x - moonDist * 0.9,
        viewPos.y + moonDist * 0.3,
        viewPos.z + moonDist * 0.2,
      );
      s.moonCamSnapped = true;
    }
    cam.lookAt(viewPos);
  } else if (s.detailActive && s.detailTarget) {
    s.detailTarget.getWorldPosition(_wp);
    const r = s.detailTarget.userData.radius * (s.detailTarget.scale?.x || 1);
    // Camera distance: consistent planet size on screen, always r * 5
    const camDist = r * 5;
    // Consistent elevated view — ~30° above equatorial plane
    const elev = 0.52; // radians (~30°)
    if (!s.detailCamSnapped) {
      // Position camera on the far side of the planet from the sun,
      // elevated so the enlarged sun is visible above/behind the planet
      const awayFromSun = Math.atan2(_wp.x, _wp.z); // planet angle = away from sun
      cam.position.set(
        _wp.x + Math.sin(awayFromSun) * camDist * Math.cos(elev),
        _wp.y + camDist * Math.sin(elev),
        _wp.z + Math.cos(awayFromSun) * camDist * Math.cos(elev),
      );
      s.detailCamSnapped = true;
    }
    cam.lookAt(_wp);
  } else {
    if (t * 1000 - s.lastInteract > 4000 && !paused) s.camT += .00018;
    s.radius += (s.targetRadius - s.radius) * .08;

    // When hovering a planet, rotate camera to show it clearly
    if (s.hoveredObj && !s.detailActive) {
      s.hoveredObj.getWorldPosition(_wp);
      const planetAngle = Math.atan2(_wp.x, _wp.z);
      const targetDist = Math.sqrt(_wp.x * _wp.x + _wp.z * _wp.z);

      // Offset camera angle so the planet doesn't sit directly between
      // camera and sun — that pushes foreground planets low on screen
      // due to camera elevation. Quadratic scaling: inner planets barely
      // change, outer planets get large offset to project above buttons.
      const ratio = Math.min(targetDist / s.radius, 1);
      let targetT = planetAngle + ratio * ratio * 3.0;

      // Angular overlap avoidance: nudge away from nearby planets
      for (let i = 0; i < pObjs.length; i++) {
        if (pObjs[i].mesh === s.hoveredObj) continue;
        pObjs[i].mesh.getWorldPosition(_vA);
        const otherT = Math.atan2(_vA.x, _vA.z);
        const otherDist = Math.sqrt(_vA.x * _vA.x + _vA.z * _vA.z);
        let angleDiff = otherT - targetT;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) < 0.15 && otherDist > targetDist * 0.3 && otherDist < targetDist * 2) {
          targetT += angleDiff > 0 ? -0.18 : 0.18;
          break;
        }
      }

      let diff = targetT - s.camT;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.camT += diff * 0.06;
    }

    cam.position.set(
      s.radius * Math.sin(s.camT) * Math.cos(s.camP),
      s.radius * Math.sin(s.camP),
      s.radius * Math.cos(s.camT) * Math.cos(s.camP),
    );
    cam.lookAt(0, 0, 0);
  }

  // Highlight ring around hovered planet — consistent screen size via distance scaling
  if (s.hoveredObj && !s.detailActive) {
    s.hoveredObj.getWorldPosition(_wp);
    highlightRing.position.copy(_wp);
    const distToCam = cam.position.distanceTo(_wp);
    const pr = s.hoveredObj.userData.radius * (s.hoveredObj.scale?.x || 1);
    // Ring must be larger than the planet — at least 1.5x planet radius, or 4% of camera distance
    highlightRing.scale.setScalar(Math.max(pr * 1.5, distToCam * 0.025));
    highlightRing.quaternion.copy(cam.quaternion);
    highlightRing.visible = true;
  } else {
    highlightRing.visible = false;
  }

  renderer.render(scene, cam);
}
