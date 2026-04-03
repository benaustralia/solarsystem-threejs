uniform float uInnerR;
uniform float uOuterR;
uniform vec3 uCenter;
varying vec3 vWorldPos;
void main(){
  vec2 d=vWorldPos.xz-uCenter.xz;
  float r=length(d);
  float rf=(r-uInnerR)/(uOuterR-uInnerR);
  if(rf<0.||rf>1.)discard;
  float cassini=smoothstep(.41,.44,rf)*smoothstep(.50,.47,rf);
  float band=fbm(vec3(rf*18.,0.,0.));
  float band2=sin(rf*60.)*.5+.5;
  vec3 col=mix(vec3(.82,.72,.48),vec3(.96,.88,.62),band*.6+band2*.3);
  col*=mix(1.,.08,cassini);
  float edgeFade=smoothstep(0.,.06,rf)*smoothstep(1.,.94,rf);
  float alpha=.75*edgeFade*(1.-cassini*.85);
  if(alpha<.01)discard;
  gl_FragColor=vec4(col,alpha);
}
