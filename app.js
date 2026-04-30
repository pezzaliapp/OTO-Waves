const canvas=document.getElementById("scene");
const gl=canvas.getContext("webgl",{antialias:true,alpha:false,preserveDrawingBuffer:false});
const tOut=document.getElementById("tOut"),eOut=document.getElementById("eOut"),bOut=document.getElementById("bOut"),sOut=document.getElementById("sOut");
const play=document.getElementById("play"),reset=document.getElementById("reset"),speed=document.getElementById("speed"),power=document.getElementById("power");
const info=document.getElementById("info");
document.getElementById("infoBtn").onclick=()=>info.classList.add("open");
document.getElementById("closeInfo").onclick=()=>info.classList.remove("open");
let t=0,last=performance.now(),running=true;

if(!gl){document.body.innerHTML="<div style='padding:24px;color:white;background:#000'>WebGL non disponibile su questo browser.</div>";throw new Error("WebGL unavailable");}

const vert=`attribute vec2 a;varying vec2 v;void main(){v=a;gl_Position=vec4(a,0.,1.);}`;
const frag=`precision highp float;
varying vec2 v;
uniform vec2 r;
uniform float time;
uniform float power;
uniform float mobile;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float line(float d,float w){return exp(-d*d/(w*w));}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

void main(){
  vec2 uv=v;
  uv.x*=r.x/r.y;
  vec3 col=vec3(0.0);
  float n=noise(uv*2.0+time*.03);
  col+=vec3(.006,.010,.016)*(1.0+n*.55);

  vec2 p=uv;
  float radius=length(p);
  float aura=exp(-radius*radius*3.8);
  col+=vec3(.05,.10,.16)*aura;

  float dip=exp(-(p.x*p.x*28.0+p.y*p.y*6.0));
  col+=vec3(.08,.035,.025)*dip*power;

  for(int side=-1; side<=1; side+=2){
    float sx=float(side);
    float x=p.x*sx;
    float fade=smoothstep(.02,.18,x)*smoothstep(1.85,.45,x);
    float k=12.0;
    float phase=k*x-time*2.25;
    float amp=(.13+.025*sin(time+x*4.0))*power*fade/(.62+x*.5);

    float yE=sin(phase)*amp;
    float dE=abs(p.y-yE);
    float eCore=line(dE,.014+mobile*.012)*fade;
    float eGlow=line(dE,.055+mobile*.025)*fade*.34;
    col+=vec3(.18,.85,1.0)*(eCore+eGlow);

    float yB=cos(phase)*amp*.34;
    float dB=abs(p.y-yB);
    float bCore=line(dB,.010+mobile*.010)*fade;
    float bGlow=line(dB,.044+mobile*.022)*fade*.30;
    col+=vec3(1.0,.72,.18)*(bCore+bGlow);

    float pulse=fract(x*1.8-time*.42);
    float beam=exp(-p.y*p.y/0.0035)*smoothstep(.0,.18,x)*smoothstep(1.75,.65,x);
    float packet=exp(-pow(pulse-.18,2.0)/.010);
    col+=vec3(.72,.86,1.0)*beam*packet*.26*power;
  }

  float ring=abs(length(p*vec2(1.0,2.7))-.42);
  col+=vec3(.12,.45,.72)*line(ring,.01)*.22;
  float ring2=abs(length(p*vec2(1.0,2.7))-.72);
  col+=vec3(.70,.70,.84)*line(ring2,.008)*.12;

  float axis=exp(-p.x*p.x/.000035)*smoothstep(.62,.05,abs(p.y));
  col+=vec3(.72,.78,.84)*axis*.45;

  float red=exp(-(pow(p.x,2.0)/.004+pow(p.y-.075-sin(time*2.8)*.018,2.0)/.004));
  float blue=exp(-(pow(p.x,2.0)/.004+pow(p.y+.075+sin(time*2.8)*.018,2.0)/.004));
  col+=vec3(1.0,.22,.14)*red*1.25;
  col+=vec3(.10,.42,1.0)*blue*1.35;

  float vign=smoothstep(1.55,.28,length(uv));
  col*=vign;
  col=pow(col,vec3(.82));
  gl_FragColor=vec4(col,1.0);
}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
const prg=gl.createProgram();
gl.attachShader(prg,compile(gl.VERTEX_SHADER,vert));
gl.attachShader(prg,compile(gl.FRAGMENT_SHADER,frag));
gl.linkProgram(prg);
if(!gl.getProgramParameter(prg,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prg));
gl.useProgram(prg);
const buf=gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const loc=gl.getAttribLocation(prg,"a");
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
const uR=gl.getUniformLocation(prg,"r"),uTime=gl.getUniformLocation(prg,"time"),uPower=gl.getUniformLocation(prg,"power"),uMobile=gl.getUniformLocation(prg,"mobile");

function resize(){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);
  gl.viewport(0,0,canvas.width,canvas.height);
}
addEventListener("resize",resize,{passive:true});resize();

function frame(now){
  const dt=Math.min(.045,(now-last)/1000);last=now;
  if(running)t+=dt*Number(speed.value);
  gl.uniform2f(uR,canvas.width,canvas.height);
  gl.uniform1f(uTime,t);
  gl.uniform1f(uPower,Number(power.value));
  gl.uniform1f(uMobile,innerWidth<760?1:0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

  const field=Math.cos(3-t);
  const e=field*.78, b=field*.78, s=Math.abs(e*b)*Number(power.value);
  tOut.textContent=t.toFixed(2);
  eOut.textContent=(e>=0?"+":"")+e.toFixed(2);
  bOut.textContent=(b>=0?"+":"")+b.toFixed(2);
  sOut.textContent=s.toFixed(3);
  requestAnimationFrame(frame);
}
play.onclick=()=>{running=!running;play.textContent=running?"Pausa":"Riprendi"};
reset.onclick=()=>{t=0};
if("serviceWorker"in navigator){addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"))}
requestAnimationFrame(frame);
