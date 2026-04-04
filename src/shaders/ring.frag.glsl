uniform float uInnerR;
uniform float uOuterR;
uniform vec3 uCenter;
varying vec3 vWorldPos;

// Attempt realistic Saturn ring structure based on Cassini imagery
// Radial profile: C ring → B ring → Cassini Div → A ring → F ring

float ringDensity(float rf){
  // C ring (0.0–0.27): dim, semi-transparent, fine structure
  float c=smoothstep(0.,.02,rf)*smoothstep(.27,.25,rf)*.35;
  c+=smoothstep(.04,.06,rf)*smoothstep(.12,.10,rf)*.1; // Colombo gap
  c*=1.+sin(rf*180.)*.08; // fine ringlets

  // B ring (0.27–0.55): brightest, densest, varied structure
  float b=smoothstep(.25,.28,rf)*smoothstep(.55,.53,rf);
  float bStruct=sin(rf*320.)*.04+sin(rf*90.)*.06;
  b*=.85+bStruct;
  // B ring inner edge is slightly less dense
  b*=smoothstep(.27,.32,rf)*.25+.75;

  // Cassini Division (0.55–0.62): mostly empty with faint ringlets
  float cassini=smoothstep(.53,.56,rf)*smoothstep(.63,.60,rf);
  float cassiniRinglets=smoothstep(.57,.58,rf)*smoothstep(.60,.59,rf)*.12;
  cassini=max(0.,cassini-.95)*.2+cassiniRinglets;

  // A ring (0.62–0.88): moderate density with gaps
  float a=smoothstep(.60,.63,rf)*smoothstep(.88,.86,rf)*.7;
  // Encke Gap (~0.79)
  a*=1.-smoothstep(.785,.79,rf)*smoothstep(.80,.795,rf)*.9;
  // Keeler Gap (~0.86)
  a*=1.-smoothstep(.855,.86,rf)*smoothstep(.87,.865,rf)*.85;
  a*=1.+sin(rf*240.)*.05; // fine structure

  // F ring (0.92–0.96): very thin, faint
  float fRing=smoothstep(.91,.93,rf)*smoothstep(.97,.95,rf)*.2;

  return c+b-cassini+a+fRing;
}

void main(){
  vec2 d=vWorldPos.xz-uCenter.xz;
  float r=length(d);
  float rf=(r-uInnerR)/(uOuterR-uInnerR);
  if(rf<0.||rf>1.)discard;

  float density=ringDensity(rf);
  if(density<.01)discard;

  // Color varies radially — inner rings warmer, outer slightly bluer
  float n=fbm(vec3(rf*40.,d.x*.1,d.y*.1)); // subtle azimuthal variation
  vec3 cInner=vec3(.72,.62,.42); // warm brown-gold (C ring)
  vec3 cBright=vec3(.92,.86,.72); // pale gold (B ring)
  vec3 cOuter=vec3(.84,.80,.70); // slightly cooler (A ring)

  vec3 col;
  if(rf<.27) col=mix(cInner,cBright,smoothstep(.1,.25,rf));
  else if(rf<.55) col=cBright+vec3(.02,.01,0.)*sin(rf*60.);
  else if(rf<.62) col=mix(cInner*.6,cOuter*.5,.5); // Cassini div - darker
  else col=mix(cOuter,cBright*.9,sin(rf*80.)*.15+.5);

  // Subtle noise variation in color
  col+=vec3(.03,.02,.01)*(n-.5);
  // Darken with density for depth
  col*=mix(.7,1.,density);

  float edgeFade=smoothstep(0.,.03,rf)*smoothstep(1.,.97,rf);
  float alpha=density*edgeFade;

  gl_FragColor=vec4(col,alpha);
}
