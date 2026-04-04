import { clampR, PINFO } from './data';
import { renderer, cam, scene, pObjs, planetMeshes } from './scene';
import { state } from './state';

declare const THREE: any;
declare const L: any;

const $ = (id: string) => document.getElementById(id)!;
const factsHTML = (name: string) => (PINFO[name] || '').split(' \u00b7 ').map(f => `\u2022 ${f}`).join('<br>');
const nameEl = $('name') as HTMLElement;

// Raycaster
const raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
function doRaycast(cx: number, cy: number) {
  _mouse.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(_mouse, cam);
  const hits = raycaster.intersectObjects(planetMeshes);
  return hits.length ? hits[0].object : null;
}

// Pointer events — hover + tap only, no drag-to-orbit
const el = renderer.domElement;
let lastPinchDist = 0;
let tapPos = { x: 0, y: 0 };
let lockedMoon: any = null;
let lockPos = { x: 0, y: 0 };

el.addEventListener('pointerdown', (e: PointerEvent) => {
  tapPos = { x: e.clientX, y: e.clientY };
  state.lastInteract = Date.now();
});

// Raycast against moon meshes of the current detail planet
function doMoonRaycast(cx: number, cy: number) {
  if (!state.detailPObj) return null;
  _mouse.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(_mouse, cam);
  const moonMeshes = state.detailPObj.moons.map((m: any) => m.mesh);
  const hits = raycaster.intersectObjects(moonMeshes);
  return hits.length ? hits[0].object : null;
}

el.addEventListener('pointermove', (e: PointerEvent) => {
  if (!state.detailActive) {
    const hit = doRaycast(e.clientX, e.clientY);
    state.hoveredObj = hit;
    nameEl.textContent = hit ? hit.userData.name : '';
    nameEl.style.opacity = hit ? '1' : '0';
    el.style.cursor = hit ? 'pointer' : 'default';
  } else if (!state.moonDetailActive) {
    // Moon hover in detail view — lock on to avoid flicker from tiny targets
    const hit = doMoonRaycast(e.clientX, e.clientY);
    if (hit) {
      state.hoveredObj = hit;
      lockedMoon = hit;
      lockPos = { x: e.clientX, y: e.clientY };
    } else if (lockedMoon) {
      // Stay locked until cursor moves far from lock point
      if (Math.hypot(e.clientX - lockPos.x, e.clientY - lockPos.y) > 40) {
        state.hoveredObj = null;
        lockedMoon = null;
      }
    }
    const moonNameEl = $('detail-moon-name'), moonInfoEl = $('detail-moon-info');
    if (state.hoveredObj && state.hoveredObj.userData) {
      moonNameEl.textContent = state.hoveredObj.userData.name;
      moonInfoEl.innerHTML = factsHTML(state.hoveredObj.userData.name);
      moonNameEl.classList.add('show');
      moonInfoEl.classList.add('show');
      el.style.cursor = 'pointer';
    } else {
      moonNameEl.classList.remove('show');
      moonInfoEl.classList.remove('show');
      el.style.cursor = 'default';
    }
  }
});

el.addEventListener('pointerup', (e: PointerEvent) => {
  if (Math.hypot(e.clientX - tapPos.x, e.clientY - tapPos.y) > 12) return;
  if (!state.detailActive) {
    const obj = doRaycast(e.clientX, e.clientY);
    if (obj && (obj.userData.isPlanet || obj.userData.name === 'Sun')) openDetail(obj.userData.name, obj);
  } else if (state.detailActive && !state.moonDetailActive) {
    // Click a moon in planet detail view → zoom to moon
    const hit = doMoonRaycast(e.clientX, e.clientY);
    if (hit) openMoonDetail(hit);
  }
  if (e.pointerType === 'touch') { state.hoveredObj = null; nameEl.style.opacity = '0'; }
});

// Pinch zoom (touch only)
el.addEventListener('touchstart', (e: TouchEvent) => {
  if (e.touches.length === 2 && !state.detailActive) {
    lastPinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
  }
}, { passive: true });

el.addEventListener('touchmove', (e: TouchEvent) => {
  if (e.touches.length === 2 && !state.detailActive) {
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    state.targetRadius = clampR(state.targetRadius - (d - lastPinchDist) * 2);
    lastPinchDist = d; state.lastInteract = Date.now();
  }
}, { passive: true });

el.addEventListener('wheel', (e: WheelEvent) => {
  if (!state.detailActive) state.targetRadius = clampR(state.targetRadius + e.deltaY * (state.targetRadius * .003));
  state.lastInteract = Date.now();
}, { passive: true });

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

// Planet buttons in overview
(() => {
  const container = $('planet-btns');
  // Sun + all planets
  const sunMesh = planetMeshes[0];
  const sunBtn = document.createElement('button');
  sunBtn.className = 'planet-btn';
  sunBtn.textContent = 'Sun';
  sunBtn.addEventListener('click', () => openDetail('Sun', sunMesh));
  sunBtn.addEventListener('mouseenter', () => {
    if (!state.detailActive) {
      state.hoveredObj = sunMesh;
      nameEl.textContent = 'Sun';
      nameEl.style.opacity = '1';
    }
  });
  sunBtn.addEventListener('mouseleave', () => {
    if (state.hoveredObj === sunMesh) {
      state.hoveredObj = null;
      nameEl.style.opacity = '0';
    }
  });
  container.appendChild(sunBtn);
  const dwarfs = new Set(['Ceres', 'Pluto', 'Haumea', 'Makemake', 'Eris']);
  const dwarfContainer = $('dwarf-btns');
  pObjs.forEach(p => {
    const isDwarf = dwarfs.has(p.name);
    const btn = document.createElement('button');
    btn.className = isDwarf ? 'dwarf-btn' : 'planet-btn';
    btn.textContent = p.name;
    btn.addEventListener('click', () => openDetail(p.name, p.mesh));
    btn.addEventListener('mouseenter', () => {
      if (!state.detailActive) {
        state.hoveredObj = p.mesh;
        nameEl.textContent = p.name;
        nameEl.style.opacity = '1';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (state.hoveredObj === p.mesh) {
        state.hoveredObj = null;
        nameEl.style.opacity = '0';
      }
    });
    (isDwarf ? dwarfContainer : container).appendChild(btn);
  });
})();

// Detail view
export function openDetail(name: string, mesh: any) {
  if (state.detailActive) return;
  state.detailActive = true; state.detailTarget = mesh; state.detailCamSnapped = false;
  state.detailPObj = pObjs.find(p => p.mesh === mesh) || null;
  state.savedCamT = state.camT; state.savedCamP = state.camP; state.savedRadius = state.targetRadius;
  $('detail-name').textContent = name;
  $('detail-info').innerHTML = factsHTML(name);
  ($('kiki-btn') as HTMLElement).style.display = name === 'Earth' ? 'block' : 'none';
  // Populate moon buttons
  const moonBtns = $('moon-btns');
  moonBtns.innerHTML = '';
  if (state.detailPObj) {
    state.detailPObj.moons.forEach((m: any) => {
      const btn = document.createElement('button');
      btn.className = 'moon-btn';
      btn.textContent = m.mesh.userData.name;
      btn.addEventListener('click', () => openMoonDetail(m.mesh));
      moonBtns.appendChild(btn);
    });
  }
  ($('back-btn') as HTMLElement).style.display = 'block';
  $('detail').classList.add('show');
  ($('btns') as HTMLElement).style.display = 'none';
  ($('planet-btns') as HTMLElement).style.display = 'none';
  ($('dwarf-btns') as HTMLElement).style.display = 'none';
  ($('title') as HTMLElement).style.opacity = '0';
  nameEl.style.opacity = '0'; state.hoveredObj = null;
  $('detail-moon-name').classList.remove('show');
  $('detail-moon-info').classList.remove('show');
  scene.traverse((obj: any) => {
    if (obj.isMesh || obj.isLine) {
      obj.userData._wasVis = obj.visible;
      obj.visible = !!(obj === mesh || state.detailPObj?.moons.find((m: any) => m.mesh === obj) || (state.detailPObj && obj === state.detailPObj.ringMesh));
    }
  });
  if (state.detailPObj?.ringPivot) state.detailPObj.ringPivot.visible = true;
}

function openMoonDetail(moonMesh: any) {
  const moonObj = state.detailPObj?.moons.find((m: any) => m.mesh === moonMesh);
  if (!moonObj) return;
  state.moonDetailActive = true;
  state.moonDetailTarget = moonMesh;
  state.moonDetailMoonObj = moonObj;
  state.moonCamSnapped = false;
  state.moonSavedPos = moonMesh.position.clone();
  state.hoveredObj = null;
  lockedMoon = null;
  // Hide planet + other moons, show only this moon
  if (state.detailPObj) {
    state.detailPObj.mesh.visible = false;
    if (state.detailPObj.ringMesh) state.detailPObj.ringMesh.visible = false;
    state.detailPObj.moons.forEach((m: any) => { m.mesh.visible = m.mesh === moonMesh; });
  }
  // Hide planet info + moon buttons, show moon detail box
  ($('detail-name') as HTMLElement).style.opacity = '0';
  ($('detail-info') as HTMLElement).style.opacity = '0';
  ($('kiki-btn') as HTMLElement).style.display = 'none';
  ($('moon-btns') as HTMLElement).style.display = 'none';
  $('detail-moon-name').classList.remove('show');
  $('detail-moon-info').classList.remove('show');
  // Populate and trigger animated border
  $('moon-detail-name').textContent = moonMesh.userData.name;
  $('moon-detail-info').innerHTML = factsHTML(moonMesh.userData.name);
  const box = $('moon-detail-box');
  box.classList.remove('show');
  // Force reflow to restart animation
  void (box as HTMLElement).offsetWidth;
  box.classList.add('show');
  nameEl.style.opacity = '0';
  el.style.cursor = 'default';
}

function closeMoonDetail() {
  if (state.moonDetailTarget && state.moonSavedPos) {
    state.moonDetailTarget.position.copy(state.moonSavedPos);
  }
  state.moonDetailActive = false;
  state.moonDetailTarget = null;
  state.moonDetailMoonObj = null;
  state.moonSavedPos = null;
  state.moonCamSnapped = false;
  state.detailCamSnapped = false;
  const box = $('moon-detail-box') as HTMLElement;
  box.style.transition = 'none';
  box.classList.remove('show');
  box.style.opacity = '0';
  // Restore transition after instant hide
  requestAnimationFrame(() => { box.style.transition = ''; box.style.removeProperty('opacity'); });
  ($('detail-name') as HTMLElement).style.opacity = '1';
  ($('detail-info') as HTMLElement).style.opacity = '1';
  // Restore planet + all moons + buttons
  ($('moon-btns') as HTMLElement).style.display = 'flex';
  if (state.detailPObj) {
    state.detailPObj.mesh.visible = true;
    if (state.detailPObj.ringMesh) state.detailPObj.ringMesh.visible = true;
    state.detailPObj.moons.forEach((m: any) => { m.mesh.visible = true; });
    const name = state.detailPObj.name;
    ($('kiki-btn') as HTMLElement).style.display = name === 'Earth' ? 'block' : 'none';
  }
}

export function closeDetail() {
  // If in moon detail, go back to planet detail first
  if (state.moonDetailActive) { closeMoonDetail(); return; }
  if (!state.detailActive) return;
  state.detailActive = false; state.detailTarget = null; state.detailPObj = null;
  $('detail').classList.remove('show');
  ($('kiki-btn') as HTMLElement).style.display = 'none';
  ($('back-btn') as HTMLElement).style.display = 'none';
  ($('btns') as HTMLElement).style.display = 'flex';
  ($('planet-btns') as HTMLElement).style.display = 'flex';
  ($('dwarf-btns') as HTMLElement).style.display = 'flex';
  ($('title') as HTMLElement).style.opacity = '1';
  $('detail-moon-name').classList.remove('show');
  $('detail-moon-info').classList.remove('show');
  $('moon-detail-box').classList.remove('show');
  scene.traverse((obj: any) => {
    if ((obj.isMesh || obj.isLine) && obj.userData._wasVis !== undefined) {
      obj.visible = obj.userData._wasVis; delete obj.userData._wasVis;
    }
  });
  pObjs.forEach(p => { if (p.ringPivot) p.ringPivot.visible = true; });
  state.camT = state.savedCamT; state.camP = state.savedCamP; state.targetRadius = state.savedRadius;
  nameEl.style.opacity = '0'; el.style.cursor = 'default';
  lockedMoon = null;
}

// Toggles
export function toggleSpeed() {
  state.fast = !state.fast; $('bSpd').classList.toggle('on', state.fast);
}

// Kiki
let kikiMap: any = null;
export function openKiki() {
  $('kiki-overlay').style.display = 'block';
  ($('kiki-overlay') as HTMLElement).style.pointerEvents = 'all';
  ($('detail-info-wrap') as HTMLElement).style.opacity = '0';
  if (!kikiMap) {
    kikiMap = L.map('kiki-map', { zoomControl: false, attributionControl: false });
    const tile = (lyrs: string, opts?: any) => L.tileLayer(`https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`, { subdomains: '0123', maxZoom: 20, ...opts });
    tile('s').addTo(kikiMap); tile('h', { opacity: .6 }).addTo(kikiMap);
    const icon = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:#f55;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.8)"></div>', iconAnchor: [6, 6] });
    L.marker([-37.8472, 145.1548], { icon }).addTo(kikiMap);
    kikiMap.setView([-37.8472, 145.1548], 2);
    setTimeout(() => kikiMap.flyTo([-37.8472, 145.1548], 18, { duration: 5 }), 300);
  }
}

export function closeKiki() {
  $('kiki-overlay').style.display = 'none';
  ($('kiki-overlay') as HTMLElement).style.pointerEvents = 'none';
  ($('detail-info-wrap') as HTMLElement).style.opacity = '1';
}
