(()=>{
 'use strict';
 const canvas=document.querySelector('#glass-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const stage=document.querySelector('#glass-stage'),status=document.querySelector('#glass-status');
 const throwButton=document.querySelector('#glass-throw'),resetButton=document.querySelector('#glass-reset'),shuffleButton=document.querySelector('#glass-shuffle'),soundButton=document.querySelector('#glass-sound');
 const W=900,H=650,pane={x:130,y:58,w:640,h:340},floor=604;
 let pieces=[],stone=null,broken=false,drag=null,selected=null,raf=0,last=0,visible=true,muted=false,audio=null,master=null,noise=null,lastClink=0,lastScrape=0,disposed=false;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const rand=(a,b)=>a+Math.random()*(b-a),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function unlock(){
  if(muted)return;
  try{
   if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio=new Audio();master=audio.createGain();master.gain.value=.22;master.connect(audio.destination);noise=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
   if(audio.state==='suspended')audio.resume().catch(()=>{});
  }catch{audio=null;}
 }
 function noiseBurst(duration,frequency,level){
  if(muted||!audio||audio.state!=='running')return;
  const t=audio.currentTime,source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=noise;filter.type='highpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(level,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(master);source.start(t,rand(0,.5));source.stop(t+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 function ping(frequency,duration,level){
  if(muted||!audio||audio.state!=='running')return;
  const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*.72,t+duration);gain.gain.setValueAtTime(level,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 function shatterSound(){noiseBurst(.48,750,.85);for(let i=0;i<7;i++)ping(rand(1400,4800),rand(.07,.28),.1);}
 function clink(speed){const now=performance.now();if(speed<70||now-lastClink<75)return;lastClink=now;ping(rand(1600,4400),.09,Math.min(.2,speed/3500));noiseBurst(.035,2400,.05);}
 function scrape(speed){const now=performance.now();if(speed<12||now-lastScrape<75)return;lastScrape=now;noiseBurst(.1,1700,Math.min(.25,speed/1800));if(Math.random()<.3)clink(speed);}
 function vertices(p){const c=Math.cos(p.angle),s=Math.sin(p.angle);return p.local.map(v=>({x:p.x+v.x*c-v.y*s,y:p.y+v.x*s+v.y*c}));}
 function path(points){ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();}
 function draw(){
  ctx.clearRect(0,0,W,H);
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#191c16');bg.addColorStop(1,'#0a0b0a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#ffffff05';ctx.lineWidth=1;for(let x=0;x<W;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  ctx.fillStyle='#050605';ctx.fillRect(0,floor,W,H-floor);ctx.strokeStyle='#c9fc3970';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,floor);ctx.lineTo(W,floor);ctx.stroke();
  ctx.strokeStyle='#535b4a';ctx.lineWidth=9;ctx.strokeRect(pane.x-7,pane.y-7,pane.w+14,pane.h+14);
  if(!broken){
   const g=ctx.createLinearGradient(pane.x,pane.y,pane.x+pane.w,pane.y+pane.h);g.addColorStop(0,'#a1d8b62b');g.addColorStop(.45,'#b8ebed13');g.addColorStop(1,'#c9fc3925');ctx.fillStyle=g;ctx.fillRect(pane.x,pane.y,pane.w,pane.h);
   ctx.save();ctx.beginPath();ctx.rect(pane.x,pane.y,pane.w,pane.h);ctx.clip();ctx.fillStyle='#edfffa14';path([{x:90,y:58},{x:230,y:58},{x:600,y:398},{x:460,y:398}]);ctx.fill();ctx.fillStyle='#edfffa09';path([{x:470,y:58},{x:540,y:58},{x:910,y:398},{x:840,y:398}]);ctx.fill();ctx.restore();
   ctx.strokeStyle='#c5eeeb70';ctx.lineWidth=2;ctx.strokeRect(pane.x,pane.y,pane.w,pane.h);
   ctx.textAlign='center';ctx.fillStyle='#edf7ed';ctx.font='900 43px Arial, sans-serif';ctx.fillText('ПОХУЛИГАНИМ?',W/2,210);ctx.fillStyle='#c9fc39';ctx.font='19px Arial, sans-serif';ctx.fillText('Нажми на стекло',W/2,250);
  }else{
   ctx.fillStyle='#627051';ctx.textAlign='center';ctx.font='900 26px Arial, sans-serif';ctx.fillText('БЫЛО СЛИШКОМ ТИХО.',W/2,230);
  }
  for(const p of pieces){const v=vertices(p);path(v);ctx.fillStyle=p===selected?'#c9fc3970':`rgba(155,218,209,${p.tint})`;ctx.fill();ctx.strokeStyle=p===selected?'#d8ff69':'#c4f8ec99';ctx.lineWidth=p===selected?2.5:1.4;ctx.stroke();ctx.beginPath();ctx.moveTo(v[0].x,v[0].y);ctx.lineTo(v[1].x,v[1].y);ctx.strokeStyle='#f3fff9b0';ctx.lineWidth=1;ctx.stroke();}
  if(stone){const t=clamp(stone.time/.26,0,1),x=stone.startX+(stone.x-stone.startX)*t,y=stone.startY+(stone.y-stone.startY)*t-90*Math.sin(t*Math.PI);ctx.fillStyle='#343731';ctx.strokeStyle='#a1a596';ctx.lineWidth=2;path([{x:x-16,y:y-8},{x:x-7,y:y-17},{x:x+12,y:y-13},{x:x+19,y:y+2},{x:x+5,y:y+14},{x:x-13,y:y+12}]);ctx.fill();ctx.stroke();}
 }
 function fragment(a,b,c,hit){
  const x=(a.x+b.x+c.x)/3,y=(a.y+b.y+c.y)/3,local=[a,b,c].map(v=>({x:v.x-x,y:v.y-y})),area=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/2;
  const dx=x-hit.x,dy=y-hit.y,len=Math.hypot(dx,dy)||1;
  return {x,y,local,radius:Math.max(...local.map(v=>Math.hypot(v.x,v.y))),mass:Math.max(.4,area/6500),angle:0,vx:dx/len*rand(100,230)+rand(-40,40),vy:dy/len*rand(80,160)-120,spin:rand(-2.8,2.8),tint:rand(.16,.34),sleep:0};
 }
 function fracture(hit){
  const cols=5,rows=3,grid=[];for(let j=0;j<=rows;j++){grid[j]=[];for(let i=0;i<=cols;i++)grid[j][i]={x:pane.x+i*pane.w/cols+(i>0&&i<cols?rand(-23,23):0),y:pane.y+j*pane.h/rows+(j>0&&j<rows?rand(-19,19):0)};}
  pieces=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=grid[j][i],b=grid[j][i+1],c=grid[j+1][i+1],d=grid[j+1][i];if((i+j)%2)pieces.push(fragment(a,b,d,hit),fragment(b,c,d,hit));else pieces.push(fragment(a,b,c,hit),fragment(a,c,d,hit));}
  broken=true;stone=null;throwButton.disabled=true;shuffleButton.disabled=false;canvas.setAttribute('aria-label','Осколки стекла: перетаскивай пальцем или мышью. Стрелки двигают выбранный осколок.');status.textContent='Разбили. Теперь потаскай осколки внизу.';shatterSound();
 }
 function separation(a,b){
  if(Math.abs(a.x-b.x)>a.radius+b.radius||Math.abs(a.y-b.y)>a.radius+b.radius)return null;
  const av=vertices(a),bv=vertices(b);let depth=Infinity,nx=0,ny=0;
  for(const points of [av,bv])for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<.01)continue;const ax=-dy/len,ay=dx/len;const ap=av.map(v=>v.x*ax+v.y*ay),bp=bv.map(v=>v.x*ax+v.y*ay),overlap=Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp));if(overlap<=0)return null;if(overlap<depth){depth=overlap;nx=ax;ny=ay;}}
  if((b.x-a.x)*nx+(b.y-a.y)*ny<0){nx=-nx;ny=-ny;}return {depth,nx,ny};
 }
 function physics(dt){
  for(const p of pieces){if(drag?.piece===p)continue;if(p.sleep>65)continue;p.vy+=1400*dt;p.vx*=Math.exp(-.25*dt);p.spin*=Math.exp(-.65*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
   const v=vertices(p),bottom=Math.max(...v.map(q=>q.y)),left=Math.min(...v.map(q=>q.x)),right=Math.max(...v.map(q=>q.x));
   if(bottom>floor){p.y-=bottom-floor;if(p.vy>0){clink(p.vy);p.vy=p.vy>70?-p.vy*.22:0;}p.vx*=.9;p.spin*=.72;}
   if(left<6){p.x+=6-left;p.vx=Math.abs(p.vx)*.3;}if(right>W-6){p.x-=right-(W-6);p.vx=-Math.abs(p.vx)*.3;}
   if(Math.abs(p.vx)+Math.abs(p.vy)+Math.abs(p.spin)*12<7&&bottom>=floor-2)p.sleep++;else p.sleep=0;
  }
  for(let pass=0;pass<2;pass++)for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
   const a=pieces[i],b=pieces[j];if(a.sleep>65&&b.sleep>65)continue;const c=separation(a,b);if(!c)continue;const ia=drag?.piece===a?0:1/a.mass,ib=drag?.piece===b?0:1/b.mass,total=ia+ib;if(!total)continue;const correction=Math.max(0,c.depth-.2)*.7/total;
   a.x-=c.nx*correction*ia;a.y-=c.ny*correction*ia;b.x+=c.nx*correction*ib;b.y+=c.ny*correction*ib;
   const relative=(b.vx-a.vx)*c.nx+(b.vy-a.vy)*c.ny;if(relative<0){const impulse=-(1.08)*relative/total;a.vx-=impulse*c.nx*ia;a.vy-=impulse*c.ny*ia;b.vx+=impulse*c.nx*ib;b.vy+=impulse*c.ny*ib;clink(-relative);}
   if(c.depth>1){a.sleep=0;b.sleep=0;}
  }
 }
 let runningFor=0;
 function tick(now){raf=0;if(!visible||disposed)return;const dt=Math.min((now-last)/1000||1/60,.04);last=now;
  if(stone){stone.time+=dt;if(stone.time>=.26)fracture(stone);}
  if(broken){physics(dt/2);physics(dt/2);runningFor+=dt;}
  draw();
  if(stone||drag||broken&&runningFor<7&&pieces.some(p=>p.sleep<=65))raf=requestAnimationFrame(tick);
 }
 function wake(){if(disposed||!visible||raf)return;last=performance.now();raf=requestAnimationFrame(tick);}
 function throwAt(x,y){if(broken||stone)return;unlock();selected=null;stone={x:clamp(x,pane.x+20,pane.x+pane.w-20),y:clamp(y,pane.y+20,pane.y+pane.h-20),time:0,startX:W*.62,startY:floor-20};status.textContent='Лови!';if(reduced.matches)fracture(stone);wake();}
 function reset(){if(drag)try{canvas.releasePointerCapture(drag.id);}catch{}pieces=[];stone=null;broken=false;drag=null;selected=null;runningFor=0;throwButton.disabled=false;shuffleButton.disabled=true;status.textContent='Кинь камень нажатием на стекло.';canvas.setAttribute('aria-label','Интерактивное стекло. Нажми на стекло или Enter, чтобы кинуть камень.');draw();}
 function point(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};}
 function inside(p,q){const v=vertices(p);let sign=0;for(let i=0;i<3;i++){const a=v[i],b=v[(i+1)%3],cross=(b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x);if(Math.abs(cross)<.01)continue;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);}return true;}
 canvas.addEventListener('pointerdown',event=>{if(drag&&drag.id!==event.pointerId)return;if(event.button!==0&&event.pointerType==='mouse')return;const q=point(event);if(!broken){if(q.x>=pane.x&&q.x<=pane.x+pane.w&&q.y>=pane.y&&q.y<=pane.y+pane.h){event.preventDefault();throwAt(q.x,q.y);}return;}
  const p=[...pieces].reverse().find(p=>inside(p,q));if(!p)return;event.preventDefault();unlock();selected=p;p.sleep=0;drag={piece:p,id:event.pointerId,offsetX:p.x-q.x,offsetY:p.y-q.y,lastX:q.x,lastY:q.y,time:performance.now(),vx:0,vy:0};canvas.setPointerCapture(event.pointerId);runningFor=0;wake();
 });
 canvas.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;event.preventDefault();const q=point(event),now=performance.now(),dt=Math.max((now-drag.time)/1000,.012);drag.vx=clamp((q.x-drag.lastX)/dt,-1400,1400);drag.vy=clamp((q.y-drag.lastY)/dt,-1400,1400);const p=drag.piece;p.x=clamp(q.x+drag.offsetX,p.radius*.4,W-p.radius*.4);p.y=clamp(q.y+drag.offsetY,10,floor-p.radius*.4);p.vx=0;p.vy=0;p.spin=0;p.sleep=0;scrape(Math.hypot(drag.vx,drag.vy));Object.assign(drag,{lastX:q.x,lastY:q.y,time:now});runningFor=0;wake();});
 function release(event){if(!drag||event.pointerId!==drag.id)return;const p=drag.piece;p.vx=drag.vx*.55;p.vy=drag.vy*.55;p.spin=clamp(drag.vx/300,-5,5);const id=drag.id;drag=null;runningFor=0;try{canvas.releasePointerCapture(id);}catch{}wake();}
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',event=>{if(drag){drag.vx=0;drag.vy=0;}release(event);});canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&!broken){event.preventDefault();throwAt(W/2,pane.y+pane.h/2);}else if(broken&&event.key.startsWith('Arrow')){event.preventDefault();unlock();selected=selected||pieces[0];if(!selected)return;selected.sleep=0;selected.vx+=event.key==='ArrowLeft'?-220:event.key==='ArrowRight'?220:0;selected.vy+=event.key==='ArrowUp'?-330:event.key==='ArrowDown'?200:0;runningFor=0;wake();}});
 throwButton.addEventListener('click',()=>throwAt(rand(250,650),rand(120,320)));
 resetButton.addEventListener('click',reset);
 shuffleButton.addEventListener('click',()=>{unlock();for(const p of pieces){p.sleep=0;p.vx+=rand(-300,300);p.vy=rand(-550,-220);p.spin=rand(-4,4);}runningFor=0;noiseBurst(.12,1800,.25);status.textContent='Осколки снова в движении.';wake();});
 soundButton.addEventListener('click',()=>{muted=!muted;if(!muted)unlock();if(master)master.gain.value=muted?0:.22;soundButton.setAttribute('aria-pressed',String(!muted));soundButton.textContent=muted?'Звук: выкл.':'Звук: вкл.';});
 function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw();}
 if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&!document.hidden;if(visible){draw();wake();}else if(raf){cancelAnimationFrame(raf);raf=0;}},{rootMargin:'100px'}).observe(stage);
 document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible)wake();else{if(raf)cancelAnimationFrame(raf);raf=0;if(drag){const id=drag.id;drag=null;try{canvas.releasePointerCapture(id);}catch{}}}});
 window.addEventListener('pagehide',()=>{disposed=true;if(raf)cancelAnimationFrame(raf);if(audio?.state==='running')audio.suspend().catch(()=>{});});
 window.addEventListener('pageshow',()=>{disposed=false;resize();});
 resize();reset();
})();
