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
void main(){
  vec3 N=normalize(vWorldN);
  float n=fbm(vLocal*2.+uTime*.04),m=fbm(vLocal*5.+uTime*.07);
  vec3 col=mix(vec3(1.,.35,0.),vec3(1.,.92,.15),n+m*.25);
  vec3 vdir=normalize(cameraPosition-vWorldPos);
  col*=(0.4+0.6*max(0.,dot(N,vdir)));
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
void main(){
  vec3 N=normalize(vWorldN);
  float cy=cos(-uRotY),sy=sin(-uRotY);
  vec3 p=vec3(vLocal.x*cy+vLocal.z*sy,vLocal.y,-vLocal.x*sy+vLocal.z*cy);
  float ct=cos(-uTilt),st=sin(-uTilt);
  p=vec3(p.x,p.y*ct-p.z*st,p.y*st+p.z*ct);
  // UV from rotated local position
  float lon=atan(-p.z,p.x);
  float lat=asin(clamp(p.y,-1.,1.));
  vec2 uv=vec2(lon/(2.*3.14159)+.5,lat/3.14159+.5);
  vec3 col=texture2D(uTexture,uv).rgb;
  vec3 ldir=normalize(-vWorldPos);
  float diff=max(0.,dot(N,ldir));
  vec3 vdir=normalize(cameraPosition-vWorldPos);
${opts.cloudLayer ? `
  float cloud=fbm(p*4.+vec3(uTime*.003,0.,0.));
  float cl=smoothstep(.52,.62,cloud);
  col=mix(col,vec3(.92,.94,.98),cl*.65);
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
