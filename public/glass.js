(()=>{
 'use strict';
 const canvas=document.querySelector('#glass-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const stage=document.querySelector('#glass-stage'),status=document.querySelector('#glass-status');
 const throwButton=document.querySelector('#glass-throw'),resetButton=document.querySelector('#glass-reset'),shuffleButton=document.querySelector('#glass-shuffle'),soundButton=document.querySelector('#glass-sound');
 const W=900,H=650,pane={x:124,y:29,w:652,h:319};
 let pieces=[],stone=null,broken=false,drag=null,selected=null,raf=0,last=0,visible=true,muted=false,audio=null,master=null,noise=null,lastClink=0,lastScrape=0,disposed=false;
 let runningFor=0;
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
  const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,t);osc.frequency.setValueAtTime(frequency*.997,t+duration);gain.gain.setValueAtTime(level,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 function shatterSound(){noiseBurst(.012,100,.9);noiseBurst(.4,1150,.65);for(let i=0;i<9;i++)ping(rand(1800,7200),rand(.035,.16),.055);}
 function clink(speed){const now=performance.now();if(speed<70||now-lastClink<75)return;lastClink=now;ping(rand(1600,4400),.09,Math.min(.2,speed/3500));noiseBurst(.035,2400,.05);}
 function scrape(speed){const now=performance.now();if(speed<12||now-lastScrape<75)return;lastScrape=now;noiseBurst(.1,1700,Math.min(.25,speed/1800));if(Math.random()<.3)clink(speed);}
 const intact=new Image(),empty=new Image(),rock=new Image();
 let imagesReady=false,clock=0,impact=null,hover=null;
 intact.src='assets/glass-scene-intact.webp';empty.src='assets/glass-scene-open.webp';rock.src='assets/glass-stone.png';
 const projection=(x,h,z)=>{const k=1+z*.0004;return {x:W/2+(x-W/2)*k,y:500+z*.45-h*k};};
 function worldVertices(p){const c=Math.cos(p.angle),s=Math.sin(p.angle),tilt=Math.cos(p.tilt),depth=Math.sin(p.tilt);return p.local.map(v=>{const x=v.x*c-v.y*s,y=v.x*s+v.y*c;return {x:p.x+x,h:p.h-y*tilt,z:p.z+y*depth};});}
 function vertices(p){return worldVertices(p).map(v=>projection(v.x,v.h,v.z));}
 function path(points){ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();}
 function texturedTriangle(source,dest,alpha){
  const [a,b,c]=source,[p,q,r]=dest,den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(den)<.001)return;
  const A=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/den,B=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/den,C=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/den,D=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/den;
  ctx.save();path(dest);ctx.clip();ctx.globalAlpha=alpha;ctx.transform(A,B,C,D,p.x-A*a.x-C*a.y,p.y-B*a.x-D*a.y);ctx.drawImage(intact,0,0,W,H);ctx.restore();
 }
 function drawShard(p){
  const v=vertices(p);if(v.some(q=>!Number.isFinite(q.x)||!Number.isFinite(q.y)))return;
  if(p.landed){const shadow=worldVertices(p).map(q=>projection(q.x,.2,q.z));ctx.save();path(shadow.map(q=>({x:q.x+2,y:q.y+3})));ctx.fillStyle='#00000080';ctx.shadowColor='#000000aa';ctx.shadowBlur=3;ctx.fill();ctx.restore();}
  const source=p.source;
  for(let i=1;i<source.length-1;i++)texturedTriangle([source[0],source[i],source[i+1]],[v[0],v[i],v[i+1]],p.released?(p.landed?.24:.34):1);
  if(!p.released)return;
  path(v);const g=ctx.createLinearGradient(v[0].x,v[0].y,v[Math.floor(v.length/2)].x+1,v[Math.floor(v.length/2)].y+1);g.addColorStop(0,'#cce8df08');g.addColorStop(.45,'#c1e4ec20');g.addColorStop(1,'#ffffff05');ctx.fillStyle=g;ctx.fill();
  ctx.lineJoin='round';ctx.strokeStyle=p===selected?'#f3fff5c0':'#c6e4e060';ctx.lineWidth=p===selected?1.15:.65;ctx.stroke();
  for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length],light=.25+.55*Math.abs(Math.cos(p.angle+i*1.7+p.tilt));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(236,250,248,${light})`;ctx.lineWidth=.5+(p.landed?.25:.65);ctx.stroke();}
  // The cut edge catches light; the broad face remains transparent.
  if(!p.landed&&Math.abs(Math.cos(p.tilt))<.22){path(v);ctx.strokeStyle='#edf9f5d0';ctx.lineWidth=1.25;ctx.stroke();}
 }
 function cracks(hit,t){
  ctx.save();ctx.beginPath();ctx.rect(pane.x,pane.y,pane.w,pane.h);ctx.clip();ctx.lineCap='round';
  for(let i=0;i<hit.rays.length;i++){const ray=hit.rays[i];ctx.beginPath();ctx.moveTo(hit.x,hit.y);for(const q of ray)ctx.lineTo(hit.x+(q.x-hit.x)*Math.min(1,t*12),hit.y+(q.y-hit.y)*Math.min(1,t*12));ctx.strokeStyle=i%3?'#ecf9f599':'#d8eaf0d0';ctx.lineWidth=i%3?.6:1.05;ctx.stroke();}
  ctx.restore();
 }
 function draw(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#0c0d0c';ctx.fillRect(0,0,W,H);
  if(!imagesReady){ctx.fillStyle='#b7bcb1';ctx.font='18px Arial';ctx.textAlign='center';ctx.fillText('Загружаем ночную улицу…',W/2,H/2);return;}
  ctx.drawImage(broken?empty:intact,0,0,W,H);
  if(broken){const ordered=[...pieces].sort((a,b)=>a.z-b.z);for(const p of ordered)drawShard(p);}
  if(impact&&clock-impact.time<.55)cracks(impact,clock-impact.time);
  if(impact&&clock-impact.time<.07){ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(impact.x,impact.y,0,impact.x,impact.y,25);g.addColorStop(0,'#ffffffc0');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(impact.x-25,impact.y-25,50,50);ctx.restore();}
  if(hover&&!broken&&!stone){ctx.save();ctx.strokeStyle='#ffffff70';ctx.lineWidth=.65;ctx.beginPath();ctx.arc(hover.x,hover.y,9,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(stone){const t=clamp(stone.time/.3,0,1),x=stone.startX+(stone.x-stone.startX)*t,y=stone.startY+(stone.y-stone.startY)*t-75*Math.sin(t*Math.PI),size=73*(1-t)+23;ctx.save();ctx.translate(x,y);ctx.rotate(stone.time*8);ctx.globalAlpha=.22;ctx.drawImage(rock,-size/2-5, -size/2+5,size,size);ctx.globalAlpha=1;ctx.drawImage(rock,-size/2,-size/2,size,size);ctx.restore();}
 }
 function clipPolygon(poly,nx,ny,limit){
  const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.x*nx+a.y*ny-limit,db=b.x*nx+b.y*ny-limit;if(da<=.0001)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}return out;
 }
 function fragment(poly,hit){
  const x=poly.reduce((a,v)=>a+v.x,0)/poly.length,y=poly.reduce((a,v)=>a+v.y,0)/poly.length,area=Math.abs(poly.reduce((a,v,i)=>{const q=poly[(i+1)%poly.length];return a+v.x*q.y-q.x*v.y;},0)/2),distance=Math.hypot(x-hit.x,y-hit.y);
  return {x,h:500-y,z:0,source:poly,local:poly.map(v=>({x:v.x-x,y:v.y-y})),area,mass:Math.max(.3,area/2200),radius:clamp(Math.sqrt(area)*.22,4,18),angle:0,tilt:0,spin:rand(-1.8,1.8),tumble:rand(-2.8,2.8),vx:(x-hit.x)/(distance||1)*rand(30,120)+rand(-24,24),vh:rand(10,100),vz:rand(65,160),released:false,delay:.04+distance*.00035,landed:false,sleep:0};
 }
 function fracture(hit){
  const sites=[];
  for(let j=0;j<6;j++)for(let i=0;i<9;i++)sites.push({x:pane.x+(i+.5+rand(-.38,.38))*pane.w/9,y:pane.y+(j+.5+rand(-.38,.38))*pane.h/6});
  sites.push({x:hit.x,y:hit.y});for(let ring=0;ring<2;ring++)for(let i=0;i<10;i++){const a=i*Math.PI/5+rand(-.12,.12),r=(ring?76:20)*rand(.65,1.25);const x=hit.x+Math.cos(a)*r,y=hit.y+Math.sin(a)*r;if(x>pane.x+2&&x<pane.x+pane.w-2&&y>pane.y+2&&y<pane.y+pane.h-2)sites.push({x,y});}
  pieces=[];for(let i=0;i<sites.length;i++){let poly=[{x:pane.x,y:pane.y},{x:pane.x+pane.w,y:pane.y},{x:pane.x+pane.w,y:pane.y+pane.h},{x:pane.x,y:pane.y+pane.h}];const a=sites[i];for(let j=0;j<sites.length&&poly.length;j++){if(i===j)continue;const b=sites[j];poly=clipPolygon(poly,b.x-a.x,b.y-a.y,(b.x*b.x+b.y*b.y-a.x*a.x-a.y*a.y)/2);}if(poly.length>=3)pieces.push(fragment(poly,hit));}
  const rays=[];for(let i=0;i<14;i++){const a=i*Math.PI/7+rand(-.08,.08),ray=[];for(let r=20;r<900;r+=rand(30,65))ray.push({x:hit.x+Math.cos(a)*r+rand(-5,5),y:hit.y+Math.sin(a)*r+rand(-5,5)});rays.push(ray);}
  impact={x:hit.x,y:hit.y,time:clock,rays};broken=true;stone=null;throwButton.disabled=true;shuffleButton.disabled=false;selected=null;
  canvas.setAttribute('aria-label','Разбитое окно и стекло на асфальте. Перетаскивай осколки мышью или пальцем. Стрелки двигают выбранный осколок.');status.textContent='Вдребезги. Потаскай стекло по асфальту.';shatterSound();
 }
 function physics(dt){
  for(const p of pieces){
   if(!p.released){if(clock-impact.time>=p.delay)p.released=true;else continue;}
   if(drag?.piece===p||p.sleep>55)continue;
   p.vh-=980*dt;p.x+=p.vx*dt;p.h+=p.vh*dt;p.z+=p.vz*dt;p.angle+=p.spin*dt;
   if(!p.landed)p.tilt+=p.tumble*dt;
   else {const target=Math.PI/2+Math.round((p.tilt-Math.PI/2)/Math.PI)*Math.PI;p.tilt+=(target-p.tilt)*Math.min(1,dt*10);p.spin*=Math.exp(-4*dt);}
   p.z=clamp(p.z,0,260);if(p.z===260)p.vz=-Math.abs(p.vz)*.2;p.x=clamp(p.x,35,W-35);if(p.x===35||p.x===W-35)p.vx*=-.25;
   const minimum=Math.min(...worldVertices(p).map(v=>v.h));
   if(minimum<1){p.h+=1-minimum;const speed=-p.vh;if(speed>25){clink(speed);p.vh=speed>85?speed*.17:0;}else p.vh=0;p.landed=true;p.vx*=Math.exp(-5.2*dt);p.vz*=Math.exp(-5.2*dt);p.tumble*=.8;}
   p.vx*=Math.exp(-.15*dt);p.vz*=Math.exp(-.15*dt);
   if(p.landed&&Math.abs(p.vh)+Math.abs(p.vx)+Math.abs(p.vz)+Math.abs(p.spin)*10<5)p.sleep++;else p.sleep=0;
  }
  // Contact impulses act in the ground plane, so resting shards do not form upright walls.
  for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){const a=pieces[i],b=pieces[j];if(!a.landed||!b.landed||a.sleep>55&&b.sleep>55)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),overlap=a.radius+b.radius-d;if(overlap<=0||d<.01)continue;const nx=dx/d,nz=dz/d,ia=drag?.piece===a?0:1/a.mass,ib=drag?.piece===b?0:1/b.mass,total=ia+ib;if(!total)continue;const amount=overlap*.35/total;a.x-=nx*amount*ia;a.z-=nz*amount*ia;b.x+=nx*amount*ib;b.z+=nz*amount*ib;const speed=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(speed<0){const impulse=-speed*.6/total;a.vx-=impulse*nx*ia;a.vz-=impulse*nz*ia;b.vx+=impulse*nx*ib;b.vz+=impulse*nz*ib;clink(-speed);}a.z=clamp(a.z,0,260);b.z=clamp(b.z,0,260);}
 }
 function settle(){for(const p of pieces){p.released=true;p.landed=true;p.tilt=Math.PI/2;p.h=1;p.z=clamp(p.z,20,260);p.vh=p.vx=p.vz=p.spin=0;p.sleep=56;}}
 function tick(now){raf=0;if(!visible||disposed)return;const dt=Math.min((now-last)/1000||1/60,.05);last=now;clock+=dt;runningFor+=dt;
  if(stone){stone.time+=dt;if(stone.time>=.3)fracture(stone);}
  if(broken){physics(dt/2);physics(dt/2);if(runningFor>12&&!drag)settle();}
  draw();if(stone||drag||broken&&pieces.some(p=>!p.released||p.sleep<=55))raf=requestAnimationFrame(tick);
 }
 function wake(){if(disposed||!visible||raf)return;last=performance.now();raf=requestAnimationFrame(tick);}
 function throwAt(x,y){if(!imagesReady||broken||stone)return;unlock();selected=null;runningFor=0;stone={x:clamp(x,pane.x+15,pane.x+pane.w-15),y:clamp(y,pane.y+15,pane.y+pane.h-15),time:0,startX:W*.68,startY:H+30};status.textContent='Лови!';if(reduced.matches)fracture(stone);wake();}
 function reset(){if(drag)try{canvas.releasePointerCapture(drag.id);}catch{}pieces=[];stone=null;broken=false;drag=null;selected=null;impact=null;runningFor=0;hover=null;throwButton.disabled=!imagesReady;shuffleButton.disabled=true;status.textContent=imagesReady?'Нажми на стекло. Потом потаскай осколки по асфальту.':'Сцена загружается…';canvas.setAttribute('aria-label','Реалистичное окно на ночной улице. Нажми на стекло или Enter, чтобы бросить камень.');draw();}
 function point(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};}
 function inside(p,q){const v=vertices(p);let sign=0;for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length],cross=(b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x);if(Math.abs(cross)<.01)continue;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);}return true;}
 function pick(q){const order=[...pieces].sort((a,b)=>b.z-a.z),exact=order.find(p=>p.released&&inside(p,q));if(exact)return exact;const near=order.map(p=>({p,d:Math.hypot(projection(p.x,p.h,p.z).x-q.x,projection(p.x,p.h,p.z).y-q.y)})).sort((a,b)=>a.d-b.d)[0];return near&&near.d<18?near.p:null;}
 canvas.addEventListener('pointerdown',event=>{if(drag&&drag.id!==event.pointerId)return;if(event.button!==0&&event.pointerType==='mouse')return;const q=point(event);if(!broken){if(q.x>=pane.x&&q.x<=pane.x+pane.w&&q.y>=pane.y&&q.y<=pane.y+pane.h){event.preventDefault();throwAt(q.x,q.y);}return;}
  const p=pick(q);if(!p)return;event.preventDefault();unlock();selected=p;p.sleep=0;drag={piece:p,id:event.pointerId,lastX:q.x,lastY:q.y,time:performance.now(),vx:0,vz:0};canvas.setPointerCapture(event.pointerId);runningFor=0;wake();
 });
 canvas.addEventListener('pointermove',event=>{const q=point(event);if(!drag){hover=q.x>=pane.x&&q.x<=pane.x+pane.w&&q.y>=pane.y&&q.y<=pane.y+pane.h?q:null;if(!broken&&!stone)draw();return;}if(event.pointerId!==drag.id)return;event.preventDefault();const now=performance.now(),dt=Math.max((now-drag.time)/1000,.012),p=drag.piece;const dx=q.x-drag.lastX,dy=q.y-drag.lastY;
  // Move on the actual pavement, rather than levitating a flat shard in screen space.
  p.x=clamp(p.x+dx/(1+p.z*.0004),35,W-35);p.z=clamp(p.z+dy/.45,5,260);p.tilt=Math.PI/2;p.h=1;p.landed=true;p.spin=dx*.006;p.vx=p.vz=p.vh=0;p.sleep=0;drag.vx=clamp(dx/dt,-600,600);drag.vz=clamp(dy/.45/dt,-450,450);scrape(Math.hypot(drag.vx,drag.vz));Object.assign(drag,{lastX:q.x,lastY:q.y,time:now});runningFor=0;wake();
 });
 canvas.addEventListener('pointerleave',()=>{hover=null;if(!drag)draw();});
 function release(event){if(!drag||event.pointerId!==drag.id)return;const p=drag.piece;p.vx=drag.vx*.2;p.vz=drag.vz*.2;p.spin=clamp(drag.vx/350,-2,2);const id=drag.id;drag=null;runningFor=0;try{canvas.releasePointerCapture(id);}catch{}wake();}
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',event=>{if(drag){drag.vx=0;drag.vz=0;}release(event);});canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&!broken){event.preventDefault();throwAt(W/2,pane.y+pane.h/2);}else if(broken&&event.key.startsWith('Arrow')){event.preventDefault();unlock();selected=selected||pieces.find(p=>p.released);if(!selected)return;selected.sleep=0;selected.vx+=event.key==='ArrowLeft'?-130:event.key==='ArrowRight'?130:0;selected.vz+=event.key==='ArrowUp'?-90:event.key==='ArrowDown'?90:0;runningFor=0;wake();}});
 throwButton.addEventListener('click',()=>throwAt(rand(pane.x+100,pane.x+pane.w-100),rand(pane.y+70,pane.y+pane.h-70)));
 resetButton.addEventListener('click',reset);
 shuffleButton.addEventListener('click',()=>{unlock();for(const p of pieces){p.sleep=0;p.released=true;p.landed=false;p.vx+=rand(-120,120);p.vh=rand(70,190);p.vz=rand(-45,60);p.spin=rand(-2,2);p.tumble=rand(-3,3);}runningFor=0;noiseBurst(.12,1800,.2);status.textContent='Стекло скользит и звенит.';wake();});
 soundButton.addEventListener('click',()=>{muted=!muted;if(!muted)unlock();if(master)master.gain.value=muted?0:.22;soundButton.setAttribute('aria-pressed',String(!muted));soundButton.textContent=muted?'Звук: выкл.':'Звук: вкл.';});
 function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw();}
 let intersecting=true;
 if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;visible=intersecting&&!document.hidden;if(visible){draw();wake();}else if(raf){cancelAnimationFrame(raf);raf=0;}},{rootMargin:'100px'}).observe(stage);
 document.addEventListener('visibilitychange',()=>{visible=intersecting&&!document.hidden;if(visible)wake();else{if(raf)cancelAnimationFrame(raf);raf=0;if(drag){const id=drag.id;drag=null;try{canvas.releasePointerCapture(id);}catch{}}}});
 window.addEventListener('pagehide',()=>{disposed=true;if(raf)cancelAnimationFrame(raf);if(audio?.state==='running')audio.suspend().catch(()=>{});});window.addEventListener('pageshow',()=>{disposed=false;resize();});
 Promise.all([intact,empty,rock].map(img=>img.decode())).then(()=>{imagesReady=true;reset();}).catch(()=>{status.textContent='Сцена не загрузилась. Обнови страницу.';throwButton.disabled=true;});
 resize();reset();
})();
