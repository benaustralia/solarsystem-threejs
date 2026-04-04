import NOISE from './noise.glsl';
import VERT_PLANET from './planet.vert.glsl';
import VERT_RING from './ring.vert.glsl';
import FRAG_RING_BODY from './ring.frag.glsl';
export { COL } from './colors';

export const noise = NOISE;
export const vertPlanet = VERT_PLANET;
export const vertRing = VERT_RING;

export const fragPlanet = (colorFn: string) => `
${NOISE}
uniform float uTime;
uniform float uRotY;
uniform float uTilt;
varying vec3 vLocal;
varying vec3 vWorldN;
varying vec3 vWorldPos;
${colorFn}
void main(){
  vec3 N=normalize(vWorldN);
  float cy=cos(-uRotY),sy=sin(-uRotY);
  vec3 p=vec3(vLocal.x*cy+vLocal.z*sy,vLocal.y,-vLocal.x*sy+vLocal.z*cy);
  float ct=cos(-uTilt),st=sin(-uTilt);
  p=vec3(p.x,p.y*ct-p.z*st,p.y*st+p.z*ct);
  vec3 ldir=normalize(-vWorldPos);
  float diff=max(0.,dot(N,ldir));
  vec3 vdir=normalize(cameraPosition-vWorldPos);
  gl_FragColor=planetColorEx(p,N,uTime,diff,vdir);
}`;

export const fragSun = `
${NOISE}
uniform float uTime;
varying vec3 vLocal;
varying vec3 vWorldN;
varying vec3 vWorldPos;

// Higher-frequency noise for granulation
float granule(vec3 p){
  float v=0., a=.5;
  for(int i=0;i<3;i++){v+=a*abs(n3(p)*2.-1.); a*=.5; p*=2.5;}
  return v;
}

void main(){
  vec3 N=normalize(vWorldN);
  vec3 vdir=normalize(cameraPosition-vWorldPos);
  float NdV=max(0.,dot(N,vdir));

  // Limb darkening — edges appear darker and redder
  float limb=pow(NdV, .45);

  // Animated coordinate basis
  float t=uTime*.02;
  vec3 p=vLocal;

  // Large-scale convection patterns (supergranulation)
  float n1=fbm(p*1.8+t*.3);
  float n2=fbm(p*3.5+vec3(t*.5,-t*.3,t*.2));

  // Fine granulation — small bright cells with dark lanes
  float gran=granule(p*12.+t*.8);
  float cells=smoothstep(.25,.55,gran)*.15;

  // Sunspots — slow-moving dark regions
  float spot1=fbm(p*1.2+vec3(t*.05,0.,t*.03));
  float spot2=fbm(p*2.4+vec3(-t*.04,t*.06,0.));
  float spotMask=smoothstep(.62,.68,spot1)*smoothstep(.58,.65,spot2);
  float spotDark=spotMask*.55;

  // Penumbra around spots — slightly darker ring
  float penumbra=smoothstep(.55,.62,spot1)*smoothstep(.52,.58,spot2)*.2;

  // Active regions — bright plages near spots
  float plage=smoothstep(.48,.56,spot1)*(1.-spotMask)*.12;

  // Color: base ranges from deep orange through gold to near-white
  vec3 deepOrange=vec3(1.,.28,0.);
  vec3 brightOrange=vec3(1.,.55,.05);
  vec3 gold=vec3(1.,.82,.2);
  vec3 hotWhite=vec3(1.,.95,.75);

  // Mix based on noise layers
  vec3 col=mix(brightOrange,gold,n1*.8+n2*.3);
  col=mix(col,hotWhite,smoothstep(.55,.75,n1+n2*.3)*.5+plage);
  col+=cells*vec3(1.,.9,.6);

  // Apply sunspots (dark umbra + brown penumbra)
  col=mix(col,vec3(.3,.12,.02),spotDark);
  col=mix(col,vec3(.6,.25,.05),penumbra);

  // Pulsing bright regions — simulate solar flare activity
  float flare=fbm(p*6.+vec3(t*2.,0.,0.));
  col+=vec3(1.,.7,.2)*smoothstep(.7,.85,flare)*.15;

  // Apply limb darkening — edges go redder/darker
  col*=mix(vec3(.6,.15,.02),vec3(1.),limb);

  // Slight overall brightness variation (solar cycle-like)
  col*=.92+.08*sin(uTime*.005);

  gl_FragColor=vec4(col,1.);
}`;

// Texture-based planet shader — samples a map, applies lighting + atmosphere
const gf = (n: number) => Number.isInteger(n) ? n + '.' : String(n);

export const fragTexPlanet = (opts: {
  rimColor?: string; rimPower?: number; rimStrength?: number;
  specPower?: number; specStrength?: number;
  ambient?: number;
  cloudLayer?: boolean; // Earth only
  nightCities?: boolean; // Earth only
  hasLandMask?: boolean; // Earth only
} = {}) => {
  const amb = gf(opts.ambient ?? 0.2);
  const sp = gf(opts.specPower ?? 8);
  const ss = gf(opts.specStrength ?? 0.04);
  const rp = gf(opts.rimPower ?? 3);
  const rs = gf(opts.rimStrength ?? 0);
  const rc = opts.rimColor ?? 'vec3(0.)';
  return `
${NOISE}
uniform sampler2D uTexture;
uniform float uTime;
uniform float uRotY;
uniform float uTilt;
${opts.hasLandMask ? 'uniform sampler2D uLandMask;' : ''}
varying vec3 vLocal;
varying vec3 vWorldN;
varying vec3 vWorldPos;
varying vec2 vUV;
void main(){
  vec3 N=normalize(vWorldN);
  float cy=cos(-uRotY),sy=sin(-uRotY);
  vec3 p=vec3(vLocal.x*cy+vLocal.z*sy,vLocal.y,-vLocal.x*sy+vLocal.z*cy);
  float ct=cos(-uTilt),st=sin(-uTilt);
  p=vec3(p.x,p.y*ct-p.z*st,p.y*st+p.z*ct);
  // UV from geometry with rotation offset — RepeatWrapping handles the wrap
  vec2 uv=vec2(vUV.x+uRotY/(2.*3.14159),vUV.y);
  vec3 col=texture2D(uTexture,uv).rgb;
  vec3 ldir=normalize(-vWorldPos);
  float diff=max(0.,dot(N,ldir));
  vec3 vdir=normalize(cameraPosition-vWorldPos);
${opts.cloudLayer ? `
  float t2=uTime*.0006;
  // Multiple cloud layers that evolve independently
  float c1=fbm(p*3.5+vec3(t2,t2*.7,0.));
  float c2=fbm(p*7.+vec3(-t2*1.3,t2*.4,t2*.8));
  float c3=fbm(p*14.+vec3(t2*.5,-t2*1.1,t2*.6));
  // Combine: large weather systems + medium formations + wispy detail
  float cloud=c1*.55+c2*.3+c3*.15;
  // Latitude-based density: more clouds at mid-latitudes, fewer at poles/equator
  float latBias=smoothstep(0.,.35,abs(p.y))*smoothstep(.95,.6,abs(p.y));
  cloud=cloud*(.6+latBias*.5);
  float cl=smoothstep(.42,.58,cloud);
  // Thin wispy edges, denser cores
  float density=smoothstep(.42,.52,cloud)*.4+smoothstep(.52,.58,cloud)*.35;
  col=mix(col,vec3(.94,.95,.98),density);
` : ''}
${opts.nightCities && opts.hasLandMask ? `
  float isLand=texture2D(uLandMask,uv).r;
  float night=max(0.,-diff*2.);
  vec3 cities=vec3(.98,.88,.52)*smoothstep(.38,.68,isLand)*night*fbm(p*22.+3.)*.8;
  col+=cities;
` : ''}
  float spec=pow(max(0.,dot(reflect(-normalize(-p*99.),N),vdir)),${sp})*${ss};
  float rim=pow(1.-max(0.,dot(N,vdir)),${rp})*${rs};
  vec3 atm=${rc}*rim;
  gl_FragColor=vec4(col*(${amb}+(1.0-${amb})*diff)+spec+atm,1.);
}`;
};

export const fragRing = `${NOISE}\n${FRAG_RING_BODY}`;
