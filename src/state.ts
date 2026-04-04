import { defRadius } from './data';

// Shared mutable state — all modules import and mutate this
export const state = {
  camT: 0,
  camP: 0.32,
  radius: defRadius(),
  targetRadius: defRadius(),
  drag: false,
  px: 0,
  py: 0,
  lastInteract: 0,
  fast: false,
  hoveredObj: null as any,
  detailActive: false,
  detailTarget: null as any,
  detailPObj: null as any,
  detailCamSnapped: false,
  savedCamT: 0,
  savedCamP: 0,
  savedRadius: 0,
  moonDetailActive: false,
  moonDetailTarget: null as any,
  moonDetailMoonObj: null as any,
  moonCamSnapped: false,
  moonSavedPos: null as any,
};
