// Parameterized planet color shader generator
// Replaces 12 hand-written GLSL functions with config objects + one template

type V3 = [number, number, number];
interface ShaderCfg {
  base: [V3, V3];         // two colors mixed by fbm
  freq?: [number, number]; // fbm frequencies [primary, secondary] (default [4, 10])
  ambient?: number;        // ambient light (default 0.28)
  spec?: [number, number]; // [power, strength] (default [8, 0.04])
  rim?: [V3, number, number]; // [color, power, strength]
  bands?: { freq: number; turbFreq: number; colors: [V3, V3] };
  ice?: { threshold: number; smooth: number };
  custom?: string;         // raw GLSL injected before return
  uniforms?: string;       // extra uniform declarations
}

// Ensure number is always a GLSL float literal (never bare integer)
const f = (n: number) => Number.isInteger(n) ? n + '.' : String(n);
const v3 = (c: V3) => `vec3(${c.map(f).join(',')})`;

export function buildColorFn(cfg: ShaderCfg): string {
  const [f1, f2] = cfg.freq || [4, 10];
  const amb = cfg.ambient || 0.28;
  const [sp, ss] = cfg.spec || [8, 0.04];
  const lines: string[] = [
    cfg.uniforms || '',
    'vec4 planetColorEx(vec3 p,vec3 N,float t,float diff,vec3 vdir){',
    `  float n=fbm(p*${f(f1)}),m=fbm(p*${f(f2)}+1.3);`,
  ];
  if (cfg.bands) {
    const b = cfg.bands;
    lines.push(`  float turb=fbm(p*${f(b.turbFreq)})*2.;`);
    lines.push(`  float band=sin(p.y*${f(b.freq)}+turb)*.5+.5;`);
    lines.push(`  vec3 col=mix(${v3(b.colors[1])},${v3(b.colors[0])},band);`);
    lines.push(`  col=mix(col,mix(${v3(cfg.base[0])},${v3(cfg.base[1])},n),0.3);`);
  } else {
    lines.push(`  vec3 col=mix(${v3(cfg.base[0])},${v3(cfg.base[1])},n+m*.2);`);
  }
  if (cfg.ice) {
    lines.push(`  float ice=smoothstep(${f(cfg.ice.threshold)},${f(cfg.ice.smooth)},abs(p.y));`);
    lines.push('  col=mix(col,vec3(.92,.92,.88),ice);');
  }
  if (cfg.custom) lines.push(cfg.custom);
  if (ss > 0) lines.push(`  float spec=pow(max(0.,dot(reflect(-normalize(-p*99.),N),vdir)),${f(sp)})*${f(ss)};`);
  else lines.push('  float spec=0.;');
  if (cfg.rim) {
    const [rc, rp, rs] = cfg.rim;
    lines.push(`  float rim=pow(1.-max(0.,dot(N,vdir)),${f(rp)})*${f(rs)};`);
    lines.push(`  vec3 atm=${v3(rc)}*rim;`);
  } else {
    lines.push('  vec3 atm=vec3(0.);');
  }
  lines.push(`  return vec4(col*(${f(amb)}+(1.-${f(amb)})*diff)+spec+atm,1.);}`);
  return lines.join('\n');
}

// Planet configs — each replaces a hand-written GLSL function
export const COL: Record<string, string> = {
  mercury: buildColorFn({
    base: [[.32,.28,.24],[.78,.70,.60]], freq: [4,12], ambient: .45,
    spec: [18,.06],
    custom: `  float craters=fbm(p*20.+3.);col*=mix(.8,1.2,craters);`,
  }),
  venus: buildColorFn({
    base: [[.85,.72,.38],[.98,.90,.55]], freq: [2,5], ambient: .40,
    rim: [[.98,.92,.62], 2, .7],
    custom: `  float swirl=fbm(p*9.+2.7);col=mix(col,vec3(.96,.88,.62),swirl*.2);`,
  }),
  earth: `uniform sampler2D uLandMask;
vec4 planetColorEx(vec3 p,vec3 N,float t,float diff,vec3 vdir){
  float lon=atan(-p.z,p.x),lat=asin(clamp(p.y,-1.,1.));
  vec2 uv=vec2(lon/(2.*3.14159)+.5,lat/3.14159+.5);
  float isLand=texture2D(uLandMask,uv).r;
  float detail=fbm(p*8.),mountain=fbm(p*16.+1.3),cloud=fbm(p*4.+vec3(t*.003,0.,0.));
  float ice=smoothstep(.86,.98,abs(p.y));
  vec3 ocean=mix(vec3(.01,.06,.36),vec3(.04,.18,.52),detail*.5);
  vec3 lowland=mix(vec3(.08,.28,.05),vec3(.16,.38,.09),detail);
  vec3 highland=mix(vec3(.28,.20,.10),vec3(.38,.28,.14),mountain);
  float desertM=smoothstep(.15,.35,abs(lat/1.5707))*smoothstep(.72,.5,detail);
  vec3 landCol=mix(mix(lowland,highland,smoothstep(.45,.65,mountain)),vec3(.70,.56,.26),desertM*.6);
  vec3 col=mix(ocean,landCol,smoothstep(.28,.68,isLand));
  col=mix(col,vec3(.92,.95,.98),ice);
  float cl=smoothstep(.52,.62,cloud);col=mix(col,vec3(.90,.92,.96),cl*.72);
  float oceanMask=(1.-smoothstep(.3,.7,isLand))*(1.-cl);
  float spec=pow(max(0.,dot(reflect(-normalize(-p*99.),N),vdir)),28.)*.55*oceanMask;
  float night=max(0.,-diff*2.);
  vec3 cities=vec3(.98,.88,.52)*smoothstep(.38,.68,isLand)*night*fbm(p*22.+3.)*.8;
  float rim=pow(1.-max(0.,dot(N,vdir)),2.5);
  return vec4(col*(.45+.55*diff)+spec+cities+vec3(.28,.55,.95)*rim*.7,1.);}`,

  mars: buildColorFn({
    base: [[.58,.18,.06],[.88,.44,.16]], freq: [4,10], ambient: .45,
    ice: { threshold: .78, smooth: .94 },
    rim: [[.85,.55,.38], 3, .4],
    custom: `  float fine=fbm(p*22.+1.7);col+=vec3(.08,.02,0.)*fine;
  float canyon=smoothstep(.06,.0,abs(p.y+.05))*smoothstep(.0,.4,fbm(p*6.+4.))*.5;
  col=mix(col,vec3(.25,.10,.04),canyon);`,
  }),
  jupiter: `vec4 planetColorEx(vec3 p,vec3 N,float t,float diff,vec3 vdir){
  float turb=fbm(p*2.2)*3.2,band=sin(p.y*22.+turb)*.5+.5,fine=fbm(p*8.+1.7);
  vec3 zone=mix(vec3(.90,.78,.55),vec3(.96,.88,.66),fine*.4);
  vec3 belt=mix(vec3(.48,.30,.16),vec3(.60,.38,.20),fine*.5);
  float eqBelt=smoothstep(.12,.0,abs(p.y))*.6;
  vec3 col=mix(belt,zone,band);col=mix(col,vec3(.32,.18,.08),eqBelt);
  vec2 grsPos=vec2(p.x+.05,p.y+.374);
  float grs=smoothstep(.16,.0,length(grsPos*vec2(1.,.55)));
  col=mix(col,mix(vec3(.72,.28,.12),vec3(.60,.22,.10),fine),grs*.9);
  vec2 obaPos=vec2(p.x-.18,p.y+.44);
  col=mix(col,vec3(.88,.84,.72),smoothstep(.07,.0,length(obaPos*vec2(1.,.6)))*.7);
  float spec=pow(max(0.,dot(reflect(-normalize(-p*99.),N),vdir)),6.)*.06;
  float rim=pow(1.-max(0.,dot(N,vdir)),3.)*.2;
  return vec4(col*(.45+.55*diff)+spec+rim*col*.5,1.);}`,

  saturn: buildColorFn({
    base: [[.82,.74,.50],[.98,.92,.68]], freq: [2,5], ambient: .45,
    bands: { freq: 8, turbFreq: 1.1, colors: [[.98,.92,.68],[.80,.72,.48]] },
    spec: [5,.08], rim: [[.75,.80,.85], 2.5, .1],
    custom: `  float haze=fbm(p*5.+1.3);col+=vec3(.04,.02,0.)*haze;
  col=mix(col,vec3(.72,.78,.85),smoothstep(.5,.9,abs(p.y))*.25);`,
  }),
  uranus: buildColorFn({
    base: [[.38,.80,.82],[.58,.92,.90]], freq: [1.8,5], ambient: .45,
    spec: [8,.05], rim: [[.55,.90,.95], 3, .35],
    custom: `  float limb=1.-pow(max(0.,dot(N,vdir)),0.5);col*=mix(1.,.72,limb);`,
  }),
  neptune: `vec4 planetColorEx(vec3 p,vec3 N,float t,float diff,vec3 vdir){
  float n=fbm(p*3.2),turb=fbm(p*6.+1.7);
  vec3 col=mix(vec3(.02,.08,.55),vec3(.05,.18,.72),n);
  float streak=smoothstep(.72,.88,fbm(p*12.+t*.001));
  col=mix(col,vec3(.75,.82,.96),streak*.65);
  vec2 gdsPos=vec2(p.x,p.y+.34);
  col=mix(col,vec3(.01,.04,.28),smoothstep(.18,.0,length(gdsPos*vec2(1.,.55)))*.7);
  float rim=pow(1.-max(0.,dot(N,vdir)),2.)*0.6;
  return vec4(col*(.45+.55*diff)+vec3(.35,.65,.98)*rim,1.);}`,

  moon: buildColorFn({
    base: [[.30,.28,.26],[.60,.56,.50]], freq: [5,14], ambient: .40,
    spec: [3,.04],
    custom: `  float coarse=fbm(p*2.5);float maria=smoothstep(.55,.4,coarse+n*.2);
  col=mix(col*1.3,col*.5,maria);
  float craters=fbm(p*25.+5.);col*=mix(.85,1.15,craters);`,
  }),
  // Mars's moons
  phobos: buildColorFn({
    base: [[.28,.24,.20],[.48,.42,.36]], freq: [3,8], ambient: .40,
    spec: [4,.03],
    custom: `  // Potato-shaped, dark carbonaceous surface
  // Stickney crater — dominant feature
  float stickney=smoothstep(.25,.0,length(p.xz-vec2(.4,.1)));
  float sRim=smoothstep(.20,.25,length(p.xz-vec2(.4,.1)))*smoothstep(.30,.25,length(p.xz-vec2(.4,.1)));
  col=mix(col,vec3(.22,.18,.14),stickney*.5);
  col=mix(col,vec3(.42,.36,.30),sRim*.4);
  // Grooves radiating from Stickney
  float grooves=smoothstep(.025,.0,abs(sin((atan(p.z-.1,p.x-.4))*8.+fbm(p*4.)*2.)))*stickney;
  col=mix(col,vec3(.20,.16,.12),grooves*.5);
  float craters=fbm(p*18.+2.);col*=mix(.82,1.18,craters);`,
  }),
  deimos: buildColorFn({
    base: [[.35,.30,.26],[.52,.46,.40]], freq: [4,12], ambient: .40,
    spec: [4,.03],
    custom: `  // Smoother than Phobos — thick regolith fills craters
  float regolith=fbm(p*3.+1.);
  col=mix(col,vec3(.42,.38,.32),regolith*.3);
  // Few subtle craters — surface is blanketed
  float craters=fbm(p*14.+3.);col*=mix(.92,1.08,craters);
  // Slight colour variation
  float tint=fbm(p*6.+2.);col+=vec3(.02,.01,0.)*tint;`,
  }),
  // Jupiter's moons
  ganymede: buildColorFn({
    base: [[.42,.38,.34],[.68,.64,.58]], freq: [4,10], ambient: .40,
    spec: [6,.05],
    custom: `  // Largest moon — two-tone terrain: dark ancient regions + bright grooved terrain
  float regions=fbm(p*1.8+1.);
  float dark=smoothstep(.45,.55,regions);
  col=mix(vec3(.25,.22,.20),vec3(.70,.66,.60),dark);
  // Sulci — parallel grooved terrain in bright regions
  float grooves=abs(sin(p.x*35.+p.z*20.+fbm(p*6.)*5.))*.5+.5;
  col=mix(col,col*1.15,grooves*dark*.4);
  // Impact craters with bright ray systems
  float craters=fbm(p*18.+4.);col*=mix(.85,1.15,craters);
  float rays=smoothstep(.88,.92,fbm(p*12.+7.));
  col=mix(col,vec3(.78,.75,.70),rays*.5);`,
  }),
  callisto: buildColorFn({
    base: [[.22,.20,.18],[.42,.38,.34]], freq: [3,8], ambient: .40,
    spec: [4,.03],
    custom: `  // Most heavily cratered — ancient battered surface
  col*=.8;
  // Dense overlapping craters at multiple scales
  float c1=fbm(p*8.+1.),c2=fbm(p*16.+3.),c3=fbm(p*28.+5.);
  col*=mix(.75,1.2,c1)*mix(.85,1.15,c2)*mix(.9,1.1,c3);
  // Valhalla multi-ring impact basin
  float valhalla=length(p.xz-vec2(.2,.3));
  float rings=sin(valhalla*25.)*.5+.5;
  float basin=smoothstep(.5,.0,valhalla);
  col=mix(col,vec3(.52,.48,.42),basin*rings*.4);
  // Bright frost on crater rims
  float frost=smoothstep(.82,.9,c2);
  col=mix(col,vec3(.62,.58,.52),frost*.5);`,
  }),
  io: buildColorFn({
    base: [[.95,.85,.15],[.82,.40,.04]], freq: [4,9], ambient: .40,
    spec: [0,0],
    custom: `  float dk=smoothstep(.62,.35,n+m*.3);col=mix(col,vec3(.10,.06,.02),dk*.85);
  col=mix(col,vec3(.98,.96,.92),step(.86,fbm(p*15.+4.))*.8);
  float hotspot=smoothstep(.15,.0,length(p.xy-vec2(.3,.1)));col=mix(col,vec3(1.,.6,.05),hotspot*.4);`,
  }),
  europa: buildColorFn({
    base: [[.88,.91,.94],[.97,.98,1.]], freq: [5,12], ambient: .40,
    spec: [32,.4],
    custom: `  float lineMask=smoothstep(.55,.68,m);
  col=mix(col,mix(vec3(.58,.25,.12),vec3(.68,.35,.16),n),lineMask*.75);
  float fine=fbm(p*30.);col+=vec3(.02,.03,.05)*fine;`,
  }),
  titan: buildColorFn({
    base: [[.82,.58,.18],[.92,.68,.28]], freq: [3,8], ambient: .40,
    rim: [[.95,.65,.15], 1.8, .65],
    custom: `  // Thick hazy atmosphere — golden-orange, featureless
  float haze=fbm(p*1.5+.5);col=mix(col,vec3(.78,.55,.15),haze*.3);
  // Subtle banding from atmospheric circulation
  float band=sin(p.y*8.)*.04;col+=vec3(band,band*.7,0.);`,
  }),
  // Saturn's inner moons
  mimas: buildColorFn({
    base: [[.72,.70,.66],[.88,.86,.82]], freq: [4,10], ambient: .40,
    spec: [8,.05],
    custom: `  // Bright icy surface — 97% water ice
  col*=1.1;
  // Herschel crater — huge impact gives Death Star appearance
  vec2 hPos=vec2(p.x-.3,p.y+.1);
  float herschel=smoothstep(.22,.0,length(hPos));
  float hRim=smoothstep(.18,.22,length(hPos))*smoothstep(.26,.22,length(hPos));
  float centralPeak=smoothstep(.06,.0,length(hPos));
  col=mix(col,vec3(.50,.48,.45),herschel*.5);
  col=mix(col,vec3(.82,.80,.76),hRim*.6);
  col=mix(col,vec3(.68,.66,.62),centralPeak*.5);
  float craters=fbm(p*20.+3.);col*=mix(.9,1.1,craters);`,
  }),
  enceladus: buildColorFn({
    base: [[.88,.90,.92],[.96,.97,.98]], freq: [5,14], ambient: .40,
    spec: [20,.12],
    custom: `  // Brightest body in solar system — highly reflective ice
  col*=1.15;
  // Tiger stripes — parallel fractures at south pole (geyser sources)
  float southPole=smoothstep(-.4,-.8,p.y);
  float stripe1=smoothstep(.02,.0,abs(p.x*.6+p.z*.3+.05))*southPole;
  float stripe2=smoothstep(.02,.0,abs(p.x*.5+p.z*.4-.08))*southPole;
  float stripe3=smoothstep(.02,.0,abs(p.x*.7+p.z*.2+.12))*southPole;
  float stripe4=smoothstep(.02,.0,abs(p.x*.55+p.z*.35-.15))*southPole;
  float stripes=max(max(stripe1,stripe2),max(stripe3,stripe4));
  col=mix(col,vec3(.35,.55,.65),stripes*.8);
  // Smooth resurfaced plains
  float plains=smoothstep(.5,.7,fbm(p*3.));
  col=mix(col,vec3(.92,.94,.96),plains*.2);
  float fine=fbm(p*22.+4.);col*=mix(.95,1.05,fine);`,
  }),
  tethys: buildColorFn({
    base: [[.78,.76,.72],[.90,.88,.84]], freq: [4,10], ambient: .40,
    spec: [8,.06],
    custom: `  // Icy surface with enormous canyon
  // Ithaca Chasma — canyon spanning 75% of circumference
  float chasma=smoothstep(.04,.0,abs(p.z*.3+p.y*.7+fbm(p*3.)*.2));
  col=mix(col,vec3(.48,.46,.42),chasma*.7);
  // Odysseus crater — large flat-floored impact
  float odysseus=smoothstep(.2,.0,length(p.xy-vec2(.5,.3)));
  col=mix(col,vec3(.82,.80,.76),odysseus*.3);
  float craters=fbm(p*18.+2.);col*=mix(.88,1.12,craters);`,
  }),
  dione: buildColorFn({
    base: [[.62,.60,.56],[.80,.78,.74]], freq: [4,11], ambient: .40,
    spec: [7,.05],
    custom: `  // Two-faced: bright leading hemisphere, wispy trailing
  float trailing=smoothstep(0.,.4,p.z);
  // Ice cliffs — wispy terrain on trailing hemisphere
  float wisps=fbm(p*8.+2.)*trailing;
  float cliffs=smoothstep(.45,.65,wisps);
  col=mix(col,vec3(.88,.86,.82),cliffs*.5);
  // Fine fracture network
  float frac=smoothstep(.03,.0,abs(sin(p.x*20.+fbm(p*7.)*4.)))*trailing;
  col=mix(col,vec3(.72,.70,.66),frac*.3);
  float craters=fbm(p*16.+4.);col*=mix(.88,1.12,craters);`,
  }),
  rhea: buildColorFn({
    base: [[.55,.52,.48],[.72,.70,.66]], freq: [4,10], ambient: .40,
    spec: [6,.05],
    custom: `  // Second-largest Saturn moon — heavily cratered icy surface
  // Two-tone hemispheres (subtle)
  float hemi=smoothstep(-.2,.2,p.z);
  col=mix(col*.9,col*1.05,hemi);
  // Dense cratering
  float c1=fbm(p*12.+1.),c2=fbm(p*22.+3.);
  col*=mix(.82,1.18,c1)*mix(.9,1.1,c2);
  // Bright ray craters
  float rays=smoothstep(.85,.92,fbm(p*15.+6.));
  col=mix(col,vec3(.78,.76,.72),rays*.4);
  // Possible faint ring — subtle bright equatorial band
  float eqBand=smoothstep(.08,.0,abs(p.y))*.1;
  col+=vec3(eqBand);`,
  }),
  // Saturn's outer moons
  iapetus: buildColorFn({
    base: [[.60,.58,.54],[.82,.80,.76]], freq: [3,8], ambient: .40,
    spec: [6,.05],
    custom: `  // Two-tone moon — one hemisphere dark, the other bright ice
  float leading=smoothstep(-.15,.15,p.z);
  vec3 darkSide=vec3(.25,.20,.16);
  vec3 brightSide=vec3(.82,.80,.76);
  // Blend two-tone onto base texture rather than replacing it
  vec3 twoTone=mix(darkSide,brightSide,leading);
  col=col*.3+twoTone*.7;
  // Transition zone — patchy, not a clean line
  float edge=smoothstep(-.3,-.1,p.z)*smoothstep(.3,.1,p.z);
  float patches=fbm(p*8.+2.);
  col=mix(col,mix(darkSide,brightSide,patches),edge*.5);
  // Equatorial ridge — unique walnut shape
  float ridge=smoothstep(.03,.0,abs(p.y))*mix(.4,1.,1.-leading);
  col=mix(col,vec3(.45,.40,.35),ridge*.6);
  float craters=fbm(p*14.+3.);col*=mix(.85,1.15,craters);`,
  }),
  hyperion: buildColorFn({
    base: [[.48,.42,.34],[.65,.58,.48]], freq: [5,12], ambient: .40,
    spec: [4,.03],
    custom: `  // Sponge-like appearance — deep-walled craters
  float sponge=fbm(p*10.+1.);
  float holes=smoothstep(.35,.55,sponge);
  col=mix(col,vec3(.22,.18,.14),holes*.7);
  // Reddish tint from dust
  col+=vec3(.05,.01,0.)*fbm(p*4.);
  // Sharp crater rims
  float rims=smoothstep(.50,.55,sponge)*smoothstep(.60,.55,sponge);
  col=mix(col,vec3(.58,.52,.44),rims*.5);
  float fine=fbm(p*22.+4.);col*=mix(.88,1.12,fine);`,
  }),
  phoebe: buildColorFn({
    base: [[.42,.38,.32],[.58,.52,.44]], freq: [4,10], ambient: .40,
    spec: [4,.03],
    custom: `  // Very dark captured object — possibly from Kuiper Belt
  // Heavily cratered ancient surface
  float c1=fbm(p*10.+2.),c2=fbm(p*20.+5.);
  col*=mix(.78,1.2,c1)*mix(.88,1.12,c2);
  // Bright streaks — exposed ice beneath dark surface
  float ice=smoothstep(.82,.9,fbm(p*15.+3.));
  col=mix(col,vec3(.55,.52,.48),ice*.6);`,
  }),
  // Uranian moons — each with distinct appearance from Voyager 2 observations
  miranda: buildColorFn({
    base: [[.52,.50,.48],[.72,.70,.66]], freq: [3,8], ambient: .40,
    spec: [6,.05],
    custom: `  // Patchwork terrain — sharp boundaries between light/dark regions
  float ptch=smoothstep(.45,.55,fbm(p*2.+3.));
  vec3 light=vec3(.75,.72,.68),dark=vec3(.30,.28,.26);
  col=mix(dark,light,ptch);
  // Chevron/coronae features — large angular ridged regions
  float corona=smoothstep(.2,.0,length(p.xz-vec2(.4,-.2)))*smoothstep(.38,.5,fbm(p*6.+1.));
  col=mix(col,vec3(.62,.60,.56),corona*.7);
  // Deep grooves and ridges
  float ridges=abs(sin(p.x*30.+fbm(p*8.)*4.))*smoothstep(.3,.6,fbm(p*4.));
  col*=mix(.8,1.,ridges);
  float craters=fbm(p*22.+7.);col*=mix(.88,1.12,craters);`,
  }),
  ariel: buildColorFn({
    base: [[.58,.56,.52],[.78,.76,.72]], freq: [4,10], ambient: .40,
    spec: [8,.06],
    custom: `  // Brightest Uranian moon — relatively fresh surface
  col*=1.15;
  // Network of fault canyons (chasmata)
  float canyon1=smoothstep(.04,.0,abs(p.x*.8+p.y*.3+fbm(p*5.)*.3));
  float canyon2=smoothstep(.04,.0,abs(p.z*.7-p.y*.4+fbm(p*4.+2.)*.3));
  col=mix(col,vec3(.38,.36,.34),max(canyon1,canyon2)*.8);
  // Smooth plains between canyons
  float plains=smoothstep(.5,.7,fbm(p*3.+1.));
  col=mix(col,vec3(.72,.70,.66),plains*.3);
  float craters=fbm(p*20.+4.);col*=mix(.9,1.1,craters);`,
  }),
  umbriel: buildColorFn({
    base: [[.18,.17,.16],[.32,.30,.28]], freq: [4,12], ambient: .40,
    spec: [4,.03],
    custom: `  // Very dark surface — darkest Uranian moon
  col*=.7;
  // Wunda crater — bright ring on floor (distinctive feature)
  float wunda=smoothstep(.12,.0,length(p.xy-vec2(-.1,.85)));
  col=mix(col,vec3(.72,.70,.66),wunda*.9);
  // Subtle ancient cratering
  float craters=fbm(p*16.+3.);col*=mix(.85,1.1,craters);
  float coarse=fbm(p*3.);col*=mix(.9,1.05,coarse);`,
  }),
  titania: buildColorFn({
    base: [[.42,.38,.36],[.62,.56,.52]], freq: [4,10], ambient: .40,
    spec: [6,.05],
    custom: `  // Slightly reddish-grey tint
  col+=vec3(.04,.01,0.)*fbm(p*5.);
  // Large fault scarps and grabens
  float scarp1=smoothstep(.035,.0,abs(p.y*.6+p.x*.3+fbm(p*4.+1.)*.25));
  float scarp2=smoothstep(.03,.0,abs(p.z*.5+p.y*.2+fbm(p*5.+3.)*.2));
  col=mix(col,vec3(.32,.28,.26),max(scarp1,scarp2)*.7);
  // Messina Chasma — large canyon system
  float messina=smoothstep(.06,.0,abs(p.x+p.z*.5+fbm(p*3.)*.4))*smoothstep(.0,.4,p.y);
  col=mix(col,vec3(.28,.25,.24),messina*.6);
  float craters=fbm(p*18.+5.);col*=mix(.88,1.12,craters);`,
  }),
  oberon: buildColorFn({
    base: [[.28,.26,.24],[.48,.44,.40]], freq: [4,11], ambient: .40,
    spec: [5,.04],
    custom: `  // Dark, heavily cratered
  float craters=fbm(p*14.+2.);col*=mix(.8,1.2,craters);
  float fine=fbm(p*24.+6.);col*=mix(.9,1.1,fine);
  // Dark crater floor deposits
  float darkFloor=smoothstep(.7,.5,craters)*smoothstep(.4,.6,fbm(p*8.+1.));
  col=mix(col,vec3(.12,.11,.10),darkFloor*.5);
  // Prominent mountain (6 km high limb feature)
  float mtn=smoothstep(.15,.0,length(p.xz-vec2(-.3,.6)));
  col=mix(col,vec3(.55,.52,.48),mtn*.6);`,
  }),
  // Neptune's moons
  triton: buildColorFn({
    base: [[.72,.68,.62],[.85,.80,.75]], freq: [3,8], ambient: .40,
    spec: [10,.06],
    custom: `  // Pink-tinged southern hemisphere (nitrogen ice)
  float pinkZone=smoothstep(-.1,-.6,p.y);
  col=mix(col,vec3(.82,.68,.65),pinkZone*.5);
  // Cantaloupe terrain — distinctive dimpled texture
  float dimple=fbm(p*12.+2.);
  float cantaloupe=smoothstep(.4,.6,dimple)*smoothstep(.7,.55,dimple);
  col=mix(col,vec3(.55,.52,.48),cantaloupe*.6*(1.-pinkZone*.5));
  // Dark streaks from geyser deposits
  float streak1=smoothstep(.03,.0,abs(p.x*.4+p.z*.2+fbm(p*6.)*.3))*smoothstep(-.2,-.5,p.y);
  float streak2=smoothstep(.025,.0,abs(p.x*.3-p.z*.3+fbm(p*5.+1.)*.25))*smoothstep(-.1,-.4,p.y);
  col=mix(col,vec3(.18,.16,.15),max(streak1,streak2)*.7);
  // Polar cap
  float polar=smoothstep(.75,.9,abs(p.y));
  col=mix(col,vec3(.90,.88,.85),polar*.6);
  float craters=fbm(p*20.+5.);col*=mix(.9,1.1,craters);`,
  }),
  nereid: buildColorFn({
    base: [[.38,.36,.34],[.56,.52,.48]], freq: [4,10], ambient: .40,
    spec: [5,.04],
    custom: `  // Irregular captured body — grey with slight variations
  float coarse=fbm(p*6.+1.);col*=mix(.85,1.1,coarse);
  float craters=fbm(p*16.+3.);col*=mix(.88,1.12,craters);
  // Subtle brightness variation across surface
  float ptch=fbm(p*2.+4.);col=mix(col,col*1.2,ptch*.3);`,
  }),
  proteus: buildColorFn({
    base: [[.22,.20,.18],[.40,.36,.32]], freq: [3,9], ambient: .40,
    spec: [4,.03],
    custom: `  // Dark irregular body — nearly as large as can be without becoming round
  // Pharos crater — large impact
  float pharos=smoothstep(.22,.0,length(p.xy-vec2(-.2,.3)));
  col=mix(col,vec3(.16,.14,.12),pharos*.4);
  float craters=fbm(p*14.+2.);col*=mix(.82,1.18,craters);
  float fine=fbm(p*22.+5.);col*=mix(.9,1.1,fine);`,
  }),
  // Dwarf planets
  ceres: buildColorFn({
    base: [[.38,.36,.32],[.55,.52,.46]], freq: [4,10], ambient: .40,
    spec: [6,.04],
    custom: `  // Dark rocky surface with bright salt deposits
  float craters=fbm(p*16.+2.);col*=mix(.82,1.18,craters);
  // Occator crater bright spots (sodium carbonate)
  float occator=smoothstep(.12,.0,length(p.xy-vec2(.3,.15)));
  col=mix(col,vec3(.92,.90,.85),occator*.8);
  float spots=smoothstep(.05,.0,length(p.xy-vec2(.32,.18)));
  col=mix(col,vec3(.96,.95,.92),spots*.9);`,
  }),
  pluto: buildColorFn({
    base: [[.62,.48,.38],[.82,.72,.62]], freq: [3,8], ambient: .40,
    spec: [6,.05],
    custom: `  // Heart-shaped nitrogen ice plain (Tombaugh Regio)
  vec2 heartC=vec2(p.x+.15,p.y-.1);
  float heart=smoothstep(.35,.25,length(heartC));
  col=mix(col,vec3(.92,.88,.82),heart*.7);
  // Dark equatorial band
  float darkBand=smoothstep(.15,.0,abs(p.y+.05))*(1.-heart);
  col=mix(col,vec3(.28,.22,.18),darkBand*.4);
  // Reddish tholins
  col+=vec3(.06,.02,0.)*fbm(p*5.);
  float craters=fbm(p*14.+3.);col*=mix(.9,1.1,craters);`,
  }),
  charon: buildColorFn({
    base: [[.42,.40,.38],[.62,.58,.54]], freq: [4,10], ambient: .40,
    spec: [5,.04],
    custom: `  // Grey surface with reddish north pole cap
  float polar=smoothstep(.6,.85,p.y);
  col=mix(col,vec3(.45,.28,.22),polar*.6);
  // Serenity Chasma — large canyon
  float canyon=smoothstep(.04,.0,abs(p.z*.5+p.x*.3+fbm(p*4.)*.2));
  col=mix(col,vec3(.32,.30,.28),canyon*.5);
  float craters=fbm(p*16.+4.);col*=mix(.88,1.12,craters);`,
  }),
  nix: buildColorFn({
    base: [[.55,.52,.48],[.72,.68,.62]], freq: [4,12], ambient: .40,
    spec: [4,.03],
    custom: `  float craters=fbm(p*18.+2.);col*=mix(.85,1.15,craters);`,
  }),
  hydra: buildColorFn({
    base: [[.52,.50,.46],[.70,.66,.60]], freq: [4,12], ambient: .40,
    spec: [4,.03],
    custom: `  float craters=fbm(p*18.+3.);col*=mix(.85,1.15,craters);`,
  }),
  haumea: buildColorFn({
    base: [[.72,.70,.68],[.90,.88,.86]], freq: [3,8], ambient: .40,
    spec: [12,.08],
    custom: `  // Bright icy surface — crystalline water ice
  col*=1.1;
  // Dark reddish spot
  float spot=smoothstep(.2,.0,length(p.xz-vec2(.3,.1)));
  col=mix(col,vec3(.55,.32,.28),spot*.5);
  float fine=fbm(p*14.+2.);col*=mix(.92,1.08,fine);`,
  }),
  hiiaka: buildColorFn({
    base: [[.65,.62,.58],[.80,.78,.74]], freq: [4,10], ambient: .40,
    spec: [6,.04],
    custom: `  float craters=fbm(p*16.+3.);col*=mix(.88,1.12,craters);`,
  }),
  makemake: buildColorFn({
    base: [[.62,.42,.30],[.78,.58,.42]], freq: [3,8], ambient: .40,
    spec: [6,.04],
    custom: `  // Reddish-brown methane ice surface
  float patches=fbm(p*4.+1.);
  col=mix(col,vec3(.72,.50,.35),patches*.2);
  col+=vec3(.04,.01,0.)*fbm(p*8.);
  float fine=fbm(p*14.+3.);col*=mix(.92,1.08,fine);`,
  }),
  eris: buildColorFn({
    base: [[.78,.76,.74],[.92,.90,.88]], freq: [3,8], ambient: .40,
    spec: [10,.06],
    custom: `  // Very bright surface — almost white, nitrogen/methane ice
  col*=1.1;
  // Slight yellowish tint in places
  col+=vec3(.02,.01,0.)*fbm(p*6.);
  float fine=fbm(p*12.+2.);col*=mix(.92,1.08,fine);`,
  }),
  dysnomia: buildColorFn({
    base: [[.30,.28,.26],[.45,.42,.38]], freq: [4,10], ambient: .40,
    spec: [4,.03],
    custom: `  float craters=fbm(p*16.+4.);col*=mix(.85,1.15,craters);`,
  }),
  generic: buildColorFn({
    base: [[.42,.38,.34],[.72,.64,.56]], freq: [3,12], ambient: .40,
    spec: [6,.05],
    custom: `  float craters=fbm(p*18.+2.);col*=mix(.8,1.2,craters);
  float dust=fbm(p*6.+1.);col=mix(col,col*vec3(1.05,.98,.92),dust*.3);`,
  }),
};
