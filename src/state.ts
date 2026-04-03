import { defRadius } from './data';

// Shared mutable state — all modules import and mutate this
export const state = {
  camT: 0,
  camP: 0.18,
  radius: defRadius(),
  targetRadius: defRadius(),
  drag: false,
  px: 0,
  py: 0,
  lastInteract: 0,
  fast: false,
  hoveredObj: null as any,
  lerpT: 0,
  targetT: 0,
  trueScale: false,
  detailActive: false,
  detailTarget: null as any,
  detailPObj: null as any,
  detailCamSnapped: false,
  savedCamT: 0,
  savedCamP: 0,
  savedRadius: 0,
  savedTrueScale: false,
};
