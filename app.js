const canvas=document.getElementById("labCanvas");
const ctx=canvas.getContext("2d");
const freq=document.getElementById("freq");
const amp=document.getElementById("amp");
const samples=document.getElementById("samples");
const timeOut=document.getElementById("timeOut");
const lambdaOut=document.getElementById("lambdaOut");
const omegaOut=document.getElementById("omegaOut");
const sOut=document.getElementById("sOut");
const playBtn=document.getElementById("playBtn");
const resetBtn=document.getElementById("resetBtn");
const aboutBtn=document.getElementById("aboutBtn");
const aboutModal=document.getElementById("aboutModal");
const closeModal=document.getElementById("closeModal");
const startBtn=document.getElementById("startBtn");

let W=0,H=0,DPR=1,t=0,last=performance.now(),running=true;

function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  const r=canvas.getBoundingClientRect();
  W=Math.floor(r.width); H=Math.floor(r.height);
  canvas.width=Math.floor(W*DPR); canvas.height=Math.floor(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize,{passive:true}); resize();

function project(x,y,z){
  const cam=780;
  const sc=cam/(cam+z);
  return {x:W/2+x*sc, y:H/2-y*sc, sc};
}

function drawGrid(){
  ctx.save();
  ctx.strokeStyle="#17212c";
  ctx.lineWidth=1;
  const step=50;
  for(let x=W/2%step;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=H/2%step;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.strokeStyle="#344252";
  ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();
  ctx.restore();
}

function line3(points,color,width=1.6,alpha=1){
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.stroke();
  ctx.restore();
}

function arrow(x1,y1,x2,y2,color){
  ctx.save();
  ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=1.3;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const a=Math.atan2(y2-y1,x2-x1),l=7;
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-l*Math.cos(a-.55), y2-l*Math.sin(a-.55));
  ctx.lineTo(x2-l*Math.cos(a+.55), y2-l*Math.sin(a+.55));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawDipole(A){
  const osc=Math.sin(t*3)*18*A;
  const top=project(0,38+osc,0), bot=project(0,-38-osc,0);
  ctx.save();
  ctx.strokeStyle="#d7e0ea"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(W/2,H/2-96); ctx.lineTo(W/2,H/2+96); ctx.stroke();
  ctx.fillStyle="#e84a3c"; ctx.beginPath(); ctx.arc(top.x,top.y,12,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#2d7df6"; ctx.beginPath(); ctx.arc(bot.x,bot.y,12,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#94a3b8"; ctx.font="12px ui-monospace"; ctx.fillText("+q",top.x+16,top.y+4); ctx.fillText("-q",bot.x+16,bot.y+4);
  ctx.restore();
}

function drawRadiation(){
  const f=Number(freq.value);
  const A=Number(amp.value);
  const N=Number(samples.value);
  const lambda=1/f;
  const k=0.055*f;
  const omega=1.8*f;
  const maxR=Math.min(W,H)*0.46;
  let maxS=0;

  // polar radiation lobes
  ctx.save();
  ctx.strokeStyle="rgba(148,163,184,.36)"; ctx.lineWidth=1.2;
  for(let side of [-1,1]){
    ctx.beginPath();
    for(let i=0;i<=260;i++){
      const theta=-Math.PI/2 + i/260*Math.PI;
      const pattern=Math.pow(Math.sin(theta),2);
      const r=maxR*pattern;
      const x=side*r*Math.cos(theta);
      const y=r*Math.sin(theta);
      const p=project(x,y,0);
      i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // radial samples with E vectors, B circles, S arrows
  for(let side of [-1,1]){
    for(let j=0;j<N;j++){
      const theta=-Math.PI*0.42 + j/(N-1)*Math.PI*0.84;
      const sinT=Math.abs(Math.sin(theta));
      const pattern=sinT;
      if(pattern<0.18) continue;

      const ptsE=[];
      const ptsB=[];
      for(let i=0;i<=180;i++){
        const u=i/180;
        const r=44+u*maxR;
        const phase=k*r-omega*t;
        const e=A*pattern*Math.cos(phase)/(0.45+u*1.2);
        const baseX=side*r*Math.cos(theta);
        const baseY=r*Math.sin(theta);
        const tx=-Math.sin(theta);
        const ty=Math.cos(theta);
        const bx=0, by=0, bz=e*44; // B shown in pseudo depth
        ptsE.push(project(baseX+tx*e*46, baseY+ty*e*46, 0));
        ptsB.push(project(baseX+bx, baseY+by, bz));
        maxS=Math.max(maxS,Math.abs(e*e));
      }
      line3(ptsE,"rgba(76,201,240,.88)",1.7,.92);
      line3(ptsB,"rgba(255,209,102,.82)",1.4,.86);

      // S arrows on selected radii
      if(j%2===0){
        for(let q=0;q<3;q++){
          const rr=maxR*(0.32+q*0.22);
          const x1=side*rr*Math.cos(theta), y1=rr*Math.sin(theta);
          const x2=side*(rr+28)*Math.cos(theta), y2=(rr+28)*Math.sin(theta);
          const a=project(x1,y1,0), b=project(x2,y2,0);
          arrow(a.x,a.y,b.x,b.y,"rgba(216,226,238,.58)");
        }
      }
    }
  }

  timeOut.textContent=t.toFixed(2);
  lambdaOut.textContent=lambda.toFixed(2);
  omegaOut.textContent=(omega).toFixed(2);
  sOut.textContent=(maxS*0.08).toFixed(3);
}

function drawLabels(){
  ctx.save();
  ctx.fillStyle="#7f8fa3";
  ctx.font="12px ui-monospace";
  ctx.fillText("z axis / dipole moment p(t)", W/2+12, 28);
  ctx.fillText("radiation null", W/2+18, H/2-112);
  ctx.fillText("max radiation plane", W/2+78, H/2+22);
  ctx.restore();
}

function frame(now){
  const dt=Math.min(0.045,(now-last)/1000); last=now;
  if(running) t+=dt;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#05070a"; ctx.fillRect(0,0,W,H);
  drawGrid();
  drawRadiation();
  drawDipole(Number(amp.value));
  drawLabels();
  requestAnimationFrame(frame);
}

playBtn.onclick=()=>{running=!running;playBtn.textContent=running?"Pause":"Run"};
resetBtn.onclick=()=>{t=0};
if("serviceWorker"in navigator){addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"))}
requestAnimationFrame(frame);

aboutBtn.onclick=()=>aboutModal.classList.add("open");
closeModal.onclick=()=>aboutModal.classList.remove("open");
startBtn.onclick=()=>aboutModal.classList.remove("open");
aboutModal.addEventListener("click",(e)=>{if(e.target===aboutModal)aboutModal.classList.remove("open")});
