/* Halina Travels — self-contained WebGL float-plane intro.
   No CDN or three.js dependency: the real floatplane.glb is parsed and
   rendered directly, so the intro works offline when served over HTTP. */

const MODEL = new URL('../../models/floatplane.glb', import.meta.url).href;
const CLOUD_A = new URL('../../img/cloud1.png', import.meta.url).href;
const CLOUD_B = new URL('../../img/cloud2.webp', import.meta.url).href;
const DURATION = 4.8;
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const ease = t => t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
const span = (t,a,b) => ease(clamp((t-a)/(b-a)));

function shader(gl,type,src){
  const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl,vs,fs){
  const p=gl.createProgram(); gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));
  gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs)); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
  return p;
}
function mul(a,b){
  const o=new Float32Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++)
    o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return o;
}
function perspective(fov,aspect,near,far){
  const f=1/Math.tan(fov/2),nf=1/(near-far),o=new Float32Array(16);
  o[0]=f/aspect;o[5]=f;o[10]=(far+near)*nf;o[11]=-1;o[14]=2*far*near*nf;return o;
}
function norm(v){const l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l]}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function lookAt(eye,target,up=[0,1,0]){
  const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x),o=new Float32Array(16);
  o[0]=x[0];o[1]=y[0];o[2]=z[0];o[4]=x[1];o[5]=y[1];o[6]=z[1];
  o[8]=x[2];o[9]=y[2];o[10]=z[2];o[12]=-x[0]*eye[0]-x[1]*eye[1]-x[2]*eye[2];
  o[13]=-y[0]*eye[0]-y[1]*eye[1]-y[2]*eye[2];o[14]=-z[0]*eye[0]-z[1]*eye[1]-z[2]*eye[2];o[15]=1;return o;
}
function modelMatrix(pos,dir,bank,scale){
  const x=norm(dir),baseZ=norm(cross(x,[0,1,0])),baseY=norm(cross(baseZ,x));
  const cb=Math.cos(bank),sb=Math.sin(bank);
  const y=[baseY[0]*cb+baseZ[0]*sb,baseY[1]*cb+baseZ[1]*sb,baseY[2]*cb+baseZ[2]*sb];
  const z=[baseZ[0]*cb-baseY[0]*sb,baseZ[1]*cb-baseY[1]*sb,baseZ[2]*cb-baseY[2]*sb];
  return new Float32Array([x[0]*scale,x[1]*scale,x[2]*scale,0,y[0]*scale,y[1]*scale,y[2]*scale,0,z[0]*scale,z[1]*scale,z[2]*scale,0,pos[0],pos[1],pos[2],1]);
}
const PATH=[[-46,-7,-30],[-24,-3.4,-14],[-8.5,-.6,-1.5],[1.5,1.2,5.2],[14,3.6,-3],[34,8.5,-22],[58,15,-46]];
function pathPoint(u){
  const n=PATH.length-1,x=clamp(u)*n,i=Math.min(n-1,Math.floor(x)),t=x-i;
  const p0=PATH[Math.max(0,i-1)],p1=PATH[i],p2=PATH[i+1],p3=PATH[Math.min(n,i+2)],t2=t*t,t3=t2*t;
  return [0,1,2].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3));
}
async function loadGLB(gl,url){
  const ab=await fetch(url).then(r=>{if(!r.ok)throw Error('Model '+r.status);return r.arrayBuffer()});
  const dv=new DataView(ab),jsonLen=dv.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(ab,20,jsonLen)));
  const binStart=20+jsonLen+8,prim=json.meshes[0].primitives[0],views=json.bufferViews,acc=json.accessors;
  const comps={5123:gl.UNSIGNED_SHORT,5126:gl.FLOAT},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  function attr(index){const a=acc[index],v=views[a.bufferView],b=gl.createBuffer();gl.bindBuffer(v.target===34963?gl.ELEMENT_ARRAY_BUFFER:gl.ARRAY_BUFFER,b);gl.bufferData(v.target===34963?gl.ELEMENT_ARRAY_BUFFER:gl.ARRAY_BUFFER,new Uint8Array(ab,binStart+(v.byteOffset||0),v.byteLength),gl.STATIC_DRAW);return{buffer:b,size:sizes[a.type],type:comps[a.componentType],normalized:!!a.normalized,count:a.count}}
  const attrs={position:attr(prim.attributes.POSITION),normal:attr(prim.attributes.NORMAL),uv:attr(prim.attributes.TEXCOORD_0),color:attr(prim.attributes.COLOR_0),indices:attr(prim.indices)};
  const mat=json.materials[prim.material].pbrMetallicRoughness,source=json.textures[mat.baseColorTexture.index].source,im=json.images[source],iv=views[im.bufferView];
  const bitmap=await createImageBitmap(new Blob([new Uint8Array(ab,binStart+(iv.byteOffset||0),iv.byteLength)],{type:im.mimeType}));
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  return{...attrs,texture:tex};
}
function bind(gl,p,loc,a){gl.bindBuffer(gl.ARRAY_BUFFER,a.buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,a.size,a.type,a.normalized,0,0)}

export async function runIntro(opts={}){
  const old = document.getElementById('intro');
  if (old) old.remove();
  const overlay=document.createElement('div');overlay.id='intro';overlay.setAttribute('role','presentation');
  if(opts.isFast) overlay.classList.add('fast');
  overlay.innerHTML=`<div class="intro-sky"></div><canvas class="intro-canvas"></canvas><div class="intro-fg"><img class="intro-cloud c1" src="${CLOUD_B}" alt=""><img class="intro-cloud c2" src="${CLOUD_A}" alt=""><img class="intro-cloud c3" src="${CLOUD_B}" alt=""></div><div class="intro-word"><div class="intro-name">Halina Travels</div><div class="intro-tag">Halina, tara na sa Pilipinas!</div></div><button class="intro-skip" type="button">Skip intro</button>`;
  document.body.appendChild(overlay);document.documentElement.classList.add('intro-lock');
  const canvas=overlay.querySelector('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)throw Error('WebGL unavailable');
  const p=program(gl,`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute vec4 aColor;uniform mat4 uMVP;uniform mat4 uModel;varying vec2 vUV;varying vec3 vN;varying vec4 vColor;void main(){vUV=aUV;vColor=aColor;vN=mat3(uModel)*aNormal;gl_Position=uMVP*vec4(aPosition,1.);}`,`precision mediump float;uniform sampler2D uTex;uniform float uAlpha;varying vec2 vUV;varying vec3 vN;varying vec4 vColor;void main(){vec3 n=normalize(vN);float d=.45+.55*max(dot(n,normalize(vec3(.45,.8,.5))),0.);vec4 c=texture2D(uTex,vUV)*vColor;gl_FragColor=vec4(c.rgb*(d+vec3(.22,.08,.13)),c.a*uAlpha);}`);
  const L={pos:gl.getAttribLocation(p,'aPosition'),normal:gl.getAttribLocation(p,'aNormal'),uv:gl.getAttribLocation(p,'aUV'),color:gl.getAttribLocation(p,'aColor'),mvp:gl.getUniformLocation(p,'uMVP'),model:gl.getUniformLocation(p,'uModel'),tex:gl.getUniformLocation(p,'uTex'),alpha:gl.getUniformLocation(p,'uAlpha')};
  let mesh,finished=false,raf=0,start=0;
  const rate=opts.rate||(opts.isFast?4.8:(window.__HALINA_INTRO_RATE||1));
  const finishTimeout=opts.isFast?250:850;
  const resize=()=>{const d=Math.min(devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;if(canvas.width!==w*d||canvas.height!==h*d){canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';gl.viewport(0,0,canvas.width,canvas.height)}};resize();addEventListener('resize',resize,{passive:true});
  const finish=()=>{if(finished)return;finished=true;overlay.classList.add('done');document.documentElement.classList.remove('intro-lock');setTimeout(()=>{cancelAnimationFrame(raf);overlay.remove()},finishTimeout)};
  overlay.querySelector('.intro-skip').onclick=finish;addEventListener('keydown',e=>{if(e.key==='Escape')finish()},{once:true});
  try{mesh=await loadGLB(gl,MODEL)}catch(e){overlay.remove();document.documentElement.classList.remove('intro-lock');throw e}
  document.body.setAttribute('data-intro-plane','ready');overlay.classList.add('live');start=performance.now();
  gl.useProgram(p);bind(gl,p,L.pos,mesh.position);bind(gl,p,L.normal,mesh.normal);bind(gl,p,L.uv,mesh.uv);bind(gl,p,L.color,mesh.color);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indices.buffer);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.uniform1i(L.tex,0);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const word=overlay.querySelector('.intro-word');let wordOn=false,lift=false;
  function frame(now){if(finished)return;raf=requestAnimationFrame(frame);resize();const t=Number.isFinite(window.__HALINA_INTRO_TIME)?window.__HALINA_INTRO_TIME:(now-start)/1000*rate,u=span(t,.15,4.15),pos=pathPoint(u),ahead=pathPoint(Math.min(1,u+.004)),dir=sub(ahead,pos),bank=-Math.sin(u*Math.PI)*.72;
    const pull=span(t,3.65,4.8),eye=[0,.6+pull*1.5,14+pull*8],proj=perspective(52*Math.PI/180,canvas.width/canvas.height,.1,400),view=lookAt(eye,[0,.4+pull*.7,0]),model=modelMatrix(pos,dir,bank,4.6/199.181),mvp=mul(proj,mul(view,model));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(L.model,false,model);gl.uniformMatrix4fv(L.mvp,false,mvp);gl.uniform1f(L.alpha,clamp(span(t,.05,.45))*(1-span(t,4.0,4.7)));gl.drawElements(gl.TRIANGLES,mesh.indices.count,mesh.indices.type,0);
    if(!wordOn&&t>2.05){wordOn=true;word.classList.add('in')}if(!lift&&t>3.7){lift=true;overlay.classList.add('lift')}if(t>DURATION)finish();
  }raf=requestAnimationFrame(frame);
  return new Promise(resolve=>{const poll=setInterval(()=>{if(finished){clearInterval(poll);resolve()}},100)});
}
