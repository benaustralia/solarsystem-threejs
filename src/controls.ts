import { clampR, lerp, PINFO, defRadius } from './data';
import { renderer, cam, scene, pObjs, planetMeshes } from './scene';
import { state } from './state';

declare const THREE: any;
declare const L: any;

const $ = (id: string) => document.getElementById(id)!;
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

el.addEventListener('pointerdown', (e: PointerEvent) => {
  tapPos = { x: e.clientX, y: e.clientY };
  state.lastInteract = Date.now();
});

el.addEventListener('pointermove', (e: PointerEvent) => {
  if (!state.detailActive) {
    const hit = doRaycast(e.clientX, e.clientY);
    state.hoveredObj = hit;
    nameEl.textContent = hit ? hit.userData.name : '';
    nameEl.style.opacity = (hit && !state.detailActive) ? '1' : '0';
    el.style.cursor = hit ? 'pointer' : 'default';
  }
});

el.addEventListener('pointerup', (e: PointerEvent) => {
  if (Math.hypot(e.clientX - tapPos.x, e.clientY - tapPos.y) < 12 && !state.detailActive) {
    const obj = doRaycast(e.clientX, e.clientY);
    if (obj && obj.userData.isPlanet) openDetail(obj.userData.name, obj);
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

// Detail view
export function openDetail(name: string, mesh: any) {
  if (state.detailActive) return;
  state.detailActive = true; state.detailTarget = mesh; state.detailCamSnapped = false;
  state.detailPObj = pObjs.find(p => p.mesh === mesh) || null;
  state.savedCamT = state.camT; state.savedCamP = state.camP; state.savedRadius = state.targetRadius;
  state.savedTrueScale = state.trueScale;
  $('detail-name').textContent = name;
  $('detail-info').textContent = PINFO[name] || '';
  ($('kiki-btn') as HTMLElement).style.display = name === 'Earth' ? 'block' : 'none';
  ($('back-btn') as HTMLElement).style.display = 'block';
  $('detail').classList.add('show');
  ($('btns') as HTMLElement).style.display = 'none';
  ($('hint') as HTMLElement).style.display = 'none';
  nameEl.style.opacity = '0'; state.hoveredObj = null;
  scene.traverse((obj: any) => {
    if (obj.isMesh || obj.isLine) {
      obj.userData._wasVis = obj.visible;
      obj.visible = !!(obj === mesh || state.detailPObj?.moons.find((m: any) => m.mesh === obj) || (state.detailPObj && obj === state.detailPObj.ringMesh));
    }
  });
  if (state.detailPObj?.ringPivot) state.detailPObj.ringPivot.visible = true;
}

export function closeDetail() {
  if (!state.detailActive) return;
  state.detailActive = false; state.detailTarget = null; state.detailPObj = null;
  $('detail').classList.remove('show');
  ($('kiki-btn') as HTMLElement).style.display = 'none';
  ($('back-btn') as HTMLElement).style.display = 'none';
  ($('btns') as HTMLElement).style.display = 'flex';
  ($('hint') as HTMLElement).style.display = 'block';
  scene.traverse((obj: any) => {
    if ((obj.isMesh || obj.isLine) && obj.userData._wasVis !== undefined) {
      obj.visible = obj.userData._wasVis; delete obj.userData._wasVis;
    }
  });
  pObjs.forEach(p => { if (p.ringPivot) p.ringPivot.visible = true; });
  state.camT = state.savedCamT; state.camP = state.savedCamP; state.targetRadius = state.savedRadius;
  if (!state.savedTrueScale) { state.trueScale = false; state.targetT = 0; $('bScl').classList.remove('on'); }
  nameEl.style.opacity = '0'; el.style.cursor = 'default';
}

// Toggles
export function toggleSpeed() {
  state.fast = !state.fast; $('bSpd').classList.toggle('on', state.fast);
}

export function toggleScale() {
  state.trueScale = !state.trueScale;
  state.targetT = state.trueScale ? 1 : 0;
  $('bScl').classList.toggle('on', state.trueScale);
  state.targetRadius = defRadius();
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
