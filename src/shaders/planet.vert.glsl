varying vec3 vLocal;
varying vec3 vWorldN;
varying vec3 vWorldPos;
void main(){
  vLocal=normal;
  vWorldN=normalize(mat3(modelMatrix)*normal);
  vWorldPos=(modelMatrix*vec4(position,1.)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}
