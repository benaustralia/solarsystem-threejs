import { clampR, PINFO } from './data';
import { renderer, cam, scene, pObjs, planetMeshes } from './scene';
import { state } from './state';

declare const THREE: any;
declare const L: any;

const $ = (id: string) => document.getElementById(id)!;
const factsHTML = (name: string) => (PINFO[name] || '').split(' \u00b7 ').map(f => `\u2022 ${f}`).join('<br>');
const nameEl = $('name') as HTMLElement;

// Hit detection — project planet positions to screen and find nearest within radius
const _proj = new THREE.Vector3();
const HIT_RADIUS = 30; // pixels — generous hover target
function doRaycast(cx: number, cy: number) {
  const rect = el.getBoundingClientRect();
  let best: any = null, bestDist = HIT_RADIUS;
  for (const mesh of planetMeshes) {
    _proj.copy(mesh.position);
    _proj.project(cam);
    const sx = ((_proj.x + 1) / 2) * rect.width + rect.left;
    const sy = ((-_proj.y + 1) / 2) * rect.height + rect.top;
    const d = Math.hypot(cx - sx, cy - sy);
    if (d < bestDist) { bestDist = d; best = mesh; }
  }
  return best;
}
const raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

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
  const rect = el.getBoundingClientRect();
  _mouse.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(_mouse, cam);
  const moonMeshes = state.detailPObj.moons.map((m: any) => m.mesh);
  const hits = raycaster.intersectObjects(moonMeshes);
  return hits.length ? hits[0].object : null;
}

el.addEventListener('pointermove', (e: PointerEvent) => {
  if (!state.detailActive) {
    // Planet hover handled by buttons only — canvas hover conflicts with camera rotation
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

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (state.kikiOpen) closeKiki(); else closeDetail(); }
});

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
      state.hoveredObj = null;      nameEl.style.opacity = '0';
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
        state.hoveredObj = null;        nameEl.style.opacity = '0';
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
  ($('planet-btns') as HTMLElement).style.display = 'none';
  ($('dwarf-btns') as HTMLElement).style.display = 'none';
  ($('title') as HTMLElement).style.opacity = '0';
  nameEl.style.opacity = '0'; state.hoveredObj = null;  $('detail-moon-name').classList.remove('show');
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





// Kiki — Google Earth-style zoom from Australia to street level (largo tempo)
const KIKI_LAT = -37.8381275, KIKI_LNG = 145.1562756;
let kikiMap: any = null;
let kikiActive = false;

// Click outside the map panel closes the overlay
$('kiki-overlay').addEventListener('click', (e: Event) => {
  if ((e.target as HTMLElement).id === 'kiki-overlay') closeKiki();
});

export function openKiki() {
  kikiActive = true;
  const overlay = $('kiki-overlay') as HTMLElement;
  const label = $('kiki-label') as HTMLElement;
  const closeBtn = $('kiki-close') as HTMLElement;
  overlay.style.display = 'block';
  overlay.style.pointerEvents = 'all';
  ($('detail-info-wrap') as HTMLElement).style.opacity = '0';
  label.style.opacity = '0';
  closeBtn.style.opacity = '0';

  if (!kikiMap) {
    kikiMap = L.map('kiki-map', {
      zoomControl: false, attributionControl: false,
      keyboard: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false, boxZoom: false,
    });
    // Google satellite (high-res 512px tiles) + hybrid labels
    const tile = (lyrs: string, opts?: any) => L.tileLayer(
      `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}&scale=2`,
      { subdomains: '0123', maxZoom: 22, tileSize: 512, zoomOffset: -1, ...opts },
    );
    tile('s').addTo(kikiMap);
    tile('h', { opacity: .45 }).addTo(kikiMap);
  }

  // Pause the Moon orbiting Earth while overlay is up
  state.kikiOpen = true;

  // Start centered on Australia so its shape is clearly visible surrounded by ocean
  kikiMap.setView([-25.5, 134], 4);

  // Largo: ~44 BPM — each beat ~1.4s. Gentle, unhurried descent for a 4-year-old
  // Long fly durations with generous pauses to let each new view sink in
  const stages = [
    { lat: KIKI_LAT, lng: KIKI_LNG, zoom: 8,  dur: 5.0, pause: 2.5 },  // Australia → Victoria
    { lat: KIKI_LAT, lng: KIKI_LNG, zoom: 12, dur: 5.0, pause: 2.0 },  // state → Melbourne metro
    { lat: KIKI_LAT, lng: KIKI_LNG, zoom: 15, dur: 4.5, pause: 2.0 },  // metro → suburb
    { lat: KIKI_LAT, lng: KIKI_LNG, zoom: 18, dur: 4.0, pause: 1.5 },  // suburb → street
    { lat: KIKI_LAT, lng: KIKI_LNG, zoom: 20, dur: 3.5, pause: 0   },  // street → house
  ];

  let i = 0;
  const nextStage = () => {
    if (!kikiActive || i >= stages.length) {
      // Final: show marker, label, close button
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;background:#f55;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(0,0,0,.9)"></div>',
        iconAnchor: [7, 7],
      });
      L.marker([KIKI_LAT, KIKI_LNG], { icon }).addTo(kikiMap);
      label.style.opacity = '1';
      closeBtn.style.opacity = '1';
      return;
    }
    const s = stages[i++];
    kikiMap.flyTo([s.lat, s.lng], s.zoom, {
      duration: s.dur,
      easeLinearity: 0.1,  // very gentle easing — slow start, slow finish
    });
    // Fly duration + a pause to breathe and absorb each view
    setTimeout(nextStage, s.dur * 1000 + s.pause * 1000);
  };

  // Let Australia sit for a moment before we begin descending
  setTimeout(nextStage, 3000);
}

export function closeKiki() {
  kikiActive = false;
  state.kikiOpen = false;
  const overlay = $('kiki-overlay') as HTMLElement;
  overlay.style.display = 'none';
  overlay.style.pointerEvents = 'none';
  ($('detail-info-wrap') as HTMLElement).style.opacity = '1';
  ($('kiki-label') as HTMLElement).style.opacity = '0';
  ($('kiki-close') as HTMLElement).style.opacity = '0';
  // Destroy map so it reinitializes fresh next time
  if (kikiMap) { kikiMap.remove(); kikiMap = null; }
}
