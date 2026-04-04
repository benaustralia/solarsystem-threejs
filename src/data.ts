// Constants
export const D = Math.PI / 180;
export const ER = 3.2;
export const AU = 70;
export const SUN_DR = 14;
export const SUN_TR = 109 * ER;
export const YEAR = 1200;
export const TOS = 14.9;
export const PR = Math.min(window.devicePixelRatio, 2);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clampR = (r: number) => Math.max(AU * 2, Math.min(AU * 80, r));
export const defRadius = () => innerHeight > innerWidth ? AU * 9 : AU * 7;

// Planet info
export const PINFO: Record<string, string> = {
  Mercury: '0.387 AU \u00b7 88-day orbit \u00b7 No atmosphere',
  Venus:   '0.723 AU \u00b7 225-day orbit \u00b7 462\u00b0C surface',
  Earth:   '1.000 AU \u00b7 365-day orbit \u00b7 1 moon',
  Mars:    '1.524 AU \u00b7 687-day orbit \u00b7 2 moons',
  Jupiter: '5.203 AU \u00b7 11.9-year orbit \u00b7 95 moons',
  Saturn:  '9.537 AU \u00b7 29.5-year orbit \u00b7 146 moons',
  Uranus:  '19.19 AU \u00b7 84-year orbit \u00b7 27 moons \u00b7 Tilted 98\u00b0',
  Neptune: '30.07 AU \u00b7 165-year orbit \u00b7 16 moons',
  Pluto:   '39.5 AU \u00b7 248-year orbit \u00b7 5 moons \u00b7 Dwarf planet',
  Ceres:   '2.77 AU \u00b7 4.6-year orbit \u00b7 Largest asteroid belt object \u00b7 Dwarf planet',
  Haumea:  '43.1 AU \u00b7 283-year orbit \u00b7 Egg-shaped \u00b7 Has a ring \u00b7 Dwarf planet',
  Makemake:'45.8 AU \u00b7 306-year orbit \u00b7 Reddish-brown \u00b7 Dwarf planet',
  Eris:    '67.8 AU \u00b7 559-year orbit \u00b7 Most massive dwarf planet \u00b7 Has moon Dysnomia',
  Moon:     "Earth's only natural satellite \u00b7 27-day orbit \u00b7 Keeps one face locked to Earth",
  Io:       'Most volcanically active body in solar system \u00b7 Over 400 active volcanoes',
  Europa:   'Ice shell over subsurface ocean \u00b7 Strong candidate for extraterrestrial life',
  Ganymede: 'Largest moon in solar system \u00b7 Larger than Mercury \u00b7 Has its own magnetic field',
  Callisto: 'Most heavily cratered object known \u00b7 Possible subsurface ocean',
  Titan:    'Only moon with a dense atmosphere \u00b7 Lakes of liquid methane \u00b7 Larger than Mercury',
  Phobos:   'Tiny potato-shaped moon \u00b7 Orbits Mars 3\u00d7 per day \u00b7 Slowly spiraling inward',
  Deimos:   'Smallest known moon in solar system \u00b7 Only 12 km across',
  Mimas:    'Huge crater gives it a Death Star appearance \u00b7 97% water ice',
  Enceladus:'Geysers of water ice erupt from south pole \u00b7 Subsurface ocean \u00b7 Key astrobiology target',
  Tethys:   'Enormous canyon Ithaca Chasma spans 75% of its circumference',
  Dione:    'Ice cliffs hundreds of metres high \u00b7 Wispy terrain of tectonic fractures',
  Rhea:     'Second-largest Saturn moon \u00b7 May have a faint ring system of its own',
  Iapetus:  'Two-tone moon \u00b7 One hemisphere bright, the other dark as coal',
  Hyperion: 'Sponge-like appearance \u00b7 Chaotic tumbling rotation \u00b7 No predictable spin',
  Phoebe:   'Captured centaur \u00b7 Orbits retrograde \u00b7 May be a Kuiper Belt object',
  Miranda:  'Frankenstein moon \u00b7 Patchwork terrain with 20 km high cliffs',
  Ariel:    'Brightest Uranian moon \u00b7 Complex network of fault canyons',
  Umbriel:  'Darkest Uranian moon \u00b7 Mysterious bright ring on crater floor',
  Titania:  'Largest Uranian moon \u00b7 Enormous canyon system rivals Valles Marineris',
  Oberon:   'Outermost major Uranian moon \u00b7 Mountain twice the height of Everest',
  Triton:   'Only large moon with retrograde orbit \u00b7 Geysers of nitrogen \u00b7 Captured from Kuiper Belt',
  Nereid:   'Most eccentric orbit of any moon \u00b7 Distance varies 7\u00d7 during orbit',
  Proteus:  'Largest irregular body in solar system \u00b7 Nearly as large as a sphere can be without collapsing round',
  Charon:   'Largest Pluto moon \u00b7 Half Pluto\u2019s size \u00b7 Tidally locked together',
  Nix:      'Tiny irregular Pluto moon \u00b7 Discovered 2005',
  Hydra:    'Outermost known Pluto moon \u00b7 Chaotic rotation',
  Dysnomia: 'Only known moon of Eris \u00b7 Named after goddess of lawlessness',
  "Hi\u02BBiaka": 'Larger moon of Haumea \u00b7 Named after Hawaiian goddess',
  Sun:      'G-type star \u00b7 4.6 billion years old \u00b7 109\u00d7 Earth diameter',
};

// Moon: [name, color, shaderKey, speed, displayR, displayDist, trueR, trueDist]
export interface MoonDef {
  name: string; shader: string; speed: number;
  dR: number; dD: number; tR: number; tD: number;
}

export interface PlanetDef {
  name: string; tilt: number; shader: string;
  e: number; inc: number; O: number; w: number; period: number;
  dR: number; dD: number; tR: number; tD: number;
  rotSpd: number; moons: MoonDef[];
}

function moon(n: string, sh: string, spd: number, dR: number, dD: number, tR: number, tD: number): MoonDef {
  return { name: n, shader: sh, speed: spd, dR, dD, tR, tD };
}

function planet(
  name: string, tilt: number, shader: string,
  e: number, incD: number, OD: number, wD: number, period: number,
  dR: number, dD: number, tR: number, tD: number,
  rotSpd: number, moons: MoonDef[]
): PlanetDef {
  return { name, tilt, shader, e, inc: incD * D, O: OD * D, w: wD * D, period, dR, dD, tR, tD, rotSpd, moons };
}

export const PLANETS: PlanetDef[] = [
  planet('Mercury', 0.001, 'mercury', 0.206, 7.00, 48.3, 29.1, 0.241,
    1.6, 30, 0.383*ER, 0.387*AU*TOS, 0.004, []),
  planet('Venus', 3.096, 'venus', 0.007, 3.39, 76.7, 54.9, 0.615,
    3.0, 50, 0.949*ER, 0.723*AU*TOS, -0.002, []),
  planet('Earth', 0.409, 'earth', 0.017, 0.00, 0.0, 102.9, 1.000,
    3.2, 70, 1.000*ER, 1.000*AU*TOS, 0.015, [
      moon('Moon', 'moon', 0.080, 0.9, 8, 0.273*ER, 3.8),
    ]),
  planet('Mars', 0.440, 'mars', 0.093, 1.85, 49.6, 286.5, 1.881,
    2.2, 95, 0.532*ER, 1.524*AU*TOS, 0.014, [
      moon('Phobos', 'phobos', 0.220, 0.4, 5.0, 0.040*ER, 1.5),
      moon('Deimos', 'deimos', 0.090, 0.3, 7.5, 0.030*ER, 2.5),
    ]),
  planet('Jupiter', 0.054, 'jupiter', 0.049, 1.30, 100.5, 273.9, 11.860,
    10, 145, 11.210*ER, 5.203*AU*TOS, 0.036, [
      moon('Io', 'io', 0.180, 1.0, 16, 0.286*ER, 14),
      moon('Europa', 'europa', 0.090, 0.85, 21, 0.245*ER, 18),
      moon('Ganymede', 'ganymede', 0.045, 1.2, 27, 0.413*ER, 29),
      moon('Callisto', 'callisto', 0.020, 1.1, 34, 0.378*ER, 51),
    ]),
  planet('Saturn', 0.467, 'saturn', 0.057, 2.49, 113.6, 339.4, 29.460,
    8.5, 200, 9.449*ER, 9.537*AU*TOS, 0.034, [
      moon('Mimas', 'mimas', 0.130, 0.5, 14, 0.031*ER, 8),
      moon('Enceladus', 'enceladus', 0.090, 0.6, 16, 0.040*ER, 11),
      moon('Tethys', 'tethys', 0.060, 0.7, 18, 0.084*ER, 14),
      moon('Dione', 'dione', 0.043, 0.8, 20, 0.088*ER, 18),
      moon('Rhea', 'rhea', 0.029, 0.9, 22, 0.120*ER, 24),
      moon('Titan', 'titan', 0.012, 1.3, 24, 0.404*ER, 57),
      moon('Hyperion', 'hyperion', 0.014, 0.6, 26, 0.043*ER, 75),
      moon('Iapetus', 'iapetus', 0.005, 0.8, 28, 0.116*ER, 147),
      moon('Phoebe', 'phoebe', 0.003, 0.8, 29, 0.033*ER, 350),
    ]),
  planet('Uranus', 1.706, 'uranus', 0.046, 0.77, 74.0, 96.5, 84.010,
    7.0, 260, 4.007*ER, 19.19*AU*TOS, -0.021, [
      moon('Miranda', 'miranda', 0.100, 0.40, 9, 0.036*ER, 5),
      moon('Ariel', 'ariel', 0.060, 0.55, 11, 0.091*ER, 8),
      moon('Umbriel', 'umbriel', 0.040, 0.55, 13, 0.092*ER, 11),
      moon('Titania', 'titania', 0.025, 0.70, 16, 0.124*ER, 18),
      moon('Oberon', 'oberon', 0.018, 0.65, 19, 0.119*ER, 23),
    ]),
  planet('Neptune', 0.494, 'neptune', 0.010, 1.77, 131.8, 273.2, 164.800,
    6.0, 260, 3.883*ER, 30.07*AU*TOS, 0.022, [
      moon('Triton', 'triton', 0.050, 0.8, 10, 0.212*ER, 14),
      moon('Nereid', 'nereid', 0.009, 0.4, 17, 0.027*ER, 110),
      moon('Proteus', 'proteus', 0.080, 0.4, 8, 0.033*ER, 8),
    ]),
  // Dwarf planets
  planet('Ceres', 0.069, 'ceres', 0.076, 10.59, 80.3, 72.5, 4.600,
    2.5, 62, 0.074*ER, 2.77*AU*TOS, 0.010, []),
  planet('Pluto', 2.138, 'pluto', 0.05, 2.0, 110.3, 113.8, 247.920,
    3.5, 280, 0.186*ER, 39.48*AU*TOS, -0.011, [
      moon('Charon', 'charon', 0.060, 1.2, 6, 0.095*ER, 3),
      moon('Nix', 'nix', 0.030, 0.5, 9, 0.006*ER, 6),
      moon('Hydra', 'hydra', 0.025, 0.5, 12, 0.006*ER, 8),
    ]),
  planet('Haumea', 0.0, 'haumea', 0.05, 2.0, 122.2, 239.1, 283.280,
    3.0, 290, 0.130*ER, 43.13*AU*TOS, 0.070, [
      moon("Hi\u02BBiaka", 'hiiaka', 0.040, 0.5, 6, 0.025*ER, 5),
    ]),
  planet('Makemake', 0.0, 'makemake', 0.05, 2.0, 79.6, 297.8, 305.340,
    3.0, 295, 0.113*ER, 45.79*AU*TOS, 0.009, []),
  planet('Eris', 0.0, 'eris', 0.05, 2.0, 35.9, 151.4, 558.770,
    3.2, 265, 0.183*ER, 67.78*AU*TOS, -0.004, [
      moon('Dysnomia', 'dysnomia', 0.015, 0.5, 6, 0.025*ER, 5),
    ]),
];

// Bright Star Catalogue subset [ra°, dec°, magnitude, colorIndex]
export const BSC: number[][] = [
  [101.29,-16.72,-1.46,0.00],[95.99,-52.70,-0.74,0.15],[219.90,-60.83,-0.27,0.71],
  [213.92,19.18,-0.05,1.23],[279.23,38.78,0.03,-0.02],[79.17,45.99,0.08,0.80],
  [78.63,-8.20,0.12,-0.03],[114.83,5.22,0.38,0.42],[24.43,-57.24,0.46,-0.16],
  [88.79,7.41,0.42,1.85],[210.96,-60.37,0.61,-0.23],[297.70,8.87,0.77,0.22],
  [186.65,-63.10,0.77,-0.24],[68.98,16.51,0.85,1.54],[247.35,-26.43,0.96,1.83],
  [201.30,-11.16,0.97,-0.24],[116.33,28.03,1.14,1.00],[344.41,-29.62,1.16,0.09],
  [310.36,45.28,1.25,0.09],[191.93,-59.69,1.25,-0.24],[152.09,11.97,1.35,-0.11],
  [104.66,-28.97,1.50,-0.21],[113.65,31.89,1.58,0.04],[263.40,-37.10,1.63,-0.22],
  [187.79,-57.11,1.63,1.60],[81.28,6.35,1.64,-0.22],[81.57,28.61,1.65,-0.13],
  [138.30,-69.72,1.67,0.07],[84.05,-1.20,1.70,-0.19],[332.06,-46.96,1.74,-0.13],
  [85.19,-1.94,1.77,-0.21],[193.51,55.96,1.77,-0.02],[165.93,61.75,1.79,1.07],
  [51.08,49.86,1.79,0.48],[107.10,-26.39,1.84,0.68],[276.04,-34.38,1.85,-0.03],
  [122.38,-47.34,1.83,-0.27],[125.63,-59.51,1.86,1.28],[206.89,49.31,1.86,-0.19],
  [264.33,-42.00,1.87,0.41],[306.41,-56.73,1.94,-0.19],[253.53,-69.03,1.91,1.44],
  [99.43,16.40,1.93,0.00],[131.18,-54.71,1.96,-0.11],[37.95,89.26,1.97,0.60],
  [95.67,-17.96,1.98,-0.24],[141.90,-8.66,1.99,1.44],[31.79,23.46,2.01,1.15],
  [154.99,19.84,2.01,1.13],[10.90,-17.99,2.04,1.02],[283.82,-26.30,2.05,-0.20],
  [86.94,-9.67,2.07,-0.18],[17.43,35.62,2.07,1.58],[2.10,29.09,2.07,-0.11],
  [263.73,12.56,2.08,0.15],[222.68,74.16,2.08,1.46],[30.97,42.33,2.10,1.37],
  [340.67,-46.88,2.11,1.61],[211.67,-36.37,2.06,1.02],[83.00,-0.30,2.23,-0.22],
  [233.67,26.71,2.23,0.04],[10.00,56.54,2.24,1.17],[305.56,40.26,2.23,0.67],
  [120.90,-40.00,2.25,-0.28],[139.27,-59.28,2.25,0.18],[200.98,54.93,2.27,0.11],
  [14.18,60.72,2.27,-0.15],[177.26,14.57,2.14,0.09],[46.99,40.96,2.09,-0.05],
  [6.57,-42.31,2.40,1.09],[326.05,9.87,2.38,1.52],[165.46,56.38,2.37,0.17],
  [252.97,-34.29,2.29,1.16],[240.08,-22.62,2.29,-0.12],[178.46,53.69,2.44,0.04],
  [311.55,33.97,2.48,1.03],[345.94,28.08,2.44,1.67],[346.19,15.21,2.49,-0.03],
  [30.85,59.15,2.28,0.34],[183.79,-58.75,2.79,-0.12],[241.36,-19.81,2.62,-0.08],
  [28.66,20.81,2.64,0.27],[248.97,-28.22,2.82,-0.25],[285.65,-29.88,2.60,0.09],
  [274.41,-29.83,2.70,0.06],[271.45,-25.42,2.81,1.05],[286.35,10.61,2.72,1.51],
  [249.29,-10.57,2.54,0.02],[190.42,-1.45,2.74,0.36],[221.25,27.07,2.70,0.97],
  [208.67,18.40,2.68,0.57],[257.59,-15.72,2.43,0.06],[140.53,-55.01,2.50,-0.18],
  [44.57,-40.30,2.88,0.13],[45.57,4.09,2.54,1.64],[296.24,45.13,2.87,0.12],
  [56.87,24.11,2.87,-0.09],[3.31,15.18,2.83,-0.20],[269.15,51.49,2.23,0.92],
  [247.56,21.49,2.77,0.94],[76.24,-5.09,2.80,0.13],[220.48,-47.39,2.30,-0.20],
  [354.84,77.63,2.44,1.28],[194.01,38.32,2.89,0.60],[222.72,-16.04,2.75,-0.10],
  [229.27,-9.38,2.61,-0.11],[111.02,-29.30,2.45,-0.07],[21.45,60.24,2.66,0.13],
  [262.69,52.30,3.09,0.91],[231.23,71.84,3.05,0.96],[109.29,-37.10,2.70,1.24],
  [187.47,-16.52,2.94,-0.09],[183.86,57.03,3.32,0.10],[322.89,-5.57,2.91,0.83],
  [331.45,-0.32,2.96,1.09],[83.78,9.93,3.33,-0.18],[74.25,33.17,2.69,0.18],
  [55.90,31.88,2.85,-0.15],[193.90,-17.54,3.11,1.44],[28.60,63.67,3.38,-0.15],
  [100.98,25.13,3.06,0.93],[317.15,30.23,3.20,0.98],
];
