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
    base: [[.32,.28,.24],[.78,.70,.60]], freq: [4,12], ambient: .15,
    spec: [18,.06],
    custom: `  float craters=fbm(p*20.+3.);col*=mix(.8,1.2,craters);`,
  }),
  venus: buildColorFn({
    base: [[.85,.72,.38],[.98,.90,.55]], freq: [2,5], ambient: .25,
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
  return vec4(col*(.25+.75*diff)+spec+cities+vec3(.28,.55,.95)*rim*.7,1.);}`,

  mars: buildColorFn({
    base: [[.58,.18,.06],[.88,.44,.16]], freq: [4,10], ambient: .18,
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
  return vec4(col*(.28+.72*diff)+spec+rim*col*.5,1.);}`,

  saturn: buildColorFn({
    base: [[.82,.74,.50],[.98,.92,.68]], freq: [2,5], ambient: .20,
    bands: { freq: 8, turbFreq: 1.1, colors: [[.98,.92,.68],[.80,.72,.48]] },
    spec: [5,.08], rim: [[.75,.80,.85], 2.5, .1],
    custom: `  float haze=fbm(p*5.+1.3);col+=vec3(.04,.02,0.)*haze;
  col=mix(col,vec3(.72,.78,.85),smoothstep(.5,.9,abs(p.y))*.25);`,
  }),
  uranus: buildColorFn({
    base: [[.38,.80,.82],[.58,.92,.90]], freq: [1.8,5], ambient: .22,
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
  return vec4(col*(.25+.75*diff)+vec3(.35,.65,.98)*rim,1.);}`,

  moon: buildColorFn({
    base: [[.30,.28,.26],[.60,.56,.50]], freq: [5,14], ambient: .06,
    spec: [3,.04],
    custom: `  float coarse=fbm(p*2.5);float maria=smoothstep(.55,.4,coarse+n*.2);
  col=mix(col*1.3,col*.5,maria);
  float craters=fbm(p*25.+5.);col*=mix(.85,1.15,craters);`,
  }),
  io: buildColorFn({
    base: [[.95,.85,.15],[.82,.40,.04]], freq: [4,9], ambient: .15,
    spec: [0,0],
    custom: `  float dk=smoothstep(.62,.35,n+m*.3);col=mix(col,vec3(.10,.06,.02),dk*.85);
  col=mix(col,vec3(.98,.96,.92),step(.86,fbm(p*15.+4.))*.8);
  float hotspot=smoothstep(.15,.0,length(p.xy-vec2(.3,.1)));col=mix(col,vec3(1.,.6,.05),hotspot*.4);`,
  }),
  europa: buildColorFn({
    base: [[.88,.91,.94],[.97,.98,1.]], freq: [5,12], ambient: .15,
    spec: [32,.4],
    custom: `  float lineMask=smoothstep(.55,.68,m);
  col=mix(col,mix(vec3(.58,.25,.12),vec3(.68,.35,.16),n),lineMask*.75);
  float fine=fbm(p*30.);col+=vec3(.02,.03,.05)*fine;`,
  }),
  titan: buildColorFn({
    base: [[.75,.44,.10],[.88,.56,.16]], freq: [3,8], ambient: .20,
    rim: [[.92,.52,.06], 1.8, .65],
    custom: `  float haze=fbm(p*1.5+.5);col=mix(col,vec3(.58,.32,.08),haze*.25);`,
  }),
  generic: buildColorFn({
    base: [[.42,.38,.34],[.72,.64,.56]], freq: [3,12], ambient: .12,
    spec: [6,.05],
    custom: `  float craters=fbm(p*18.+2.);col*=mix(.8,1.2,craters);
  float dust=fbm(p*6.+1.);col=mix(col,col*vec3(1.05,.98,.92),dust*.3);`,
  }),
};
