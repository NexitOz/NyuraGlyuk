(()=>{
 'use strict';
 const song=document.querySelector('#song'),root=document.documentElement,body=document.body;
 const toggle=document.querySelector('#atmosphere-toggle'),lines=document.querySelectorAll('[data-nyura-reaction]'),bars=[...document.querySelectorAll('.equalizer i')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let enabled=true,context=null,analyser=null,data=null,starting=null,raf=0,level=0,disposed=false,lastLine='',lastReaction=0;
 function say(text){if(text===lastLine)return;lastLine=text;lines.forEach(el=>el.textContent=text);}
 function clearMeter(){root.style.setProperty('--music-energy','0');bars.forEach(bar=>bar.style.removeProperty('transform'));}
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;level=0;clearMeter();}
 function frame(){raf=0;if(!enabled||reduced.matches||document.hidden||song.paused||disposed||!analyser)return;
  analyser.getByteFrequencyData(data);let sum=0;for(let i=2;i<35;i++)sum+=data[i];level+=(sum/(33*255)-level)*.18;
  root.style.setProperty('--music-energy',level.toFixed(3));
  bars.forEach((bar,i)=>{const start=2+i*4;let total=0;for(let k=0;k<4;k++)total+=data[start+k]||0;bar.style.transform=`scaleY(${(.08+total/1020*.92).toFixed(3)})`;});
  raf=requestAnimationFrame(frame);
 }
 function wake(){if(!raf&&analyser&&!song.paused&&enabled&&!reduced.matches&&!document.hidden&&!disposed)raf=requestAnimationFrame(frame);}
 async function ensureGraph(){
  if(starting)return starting;
  starting=(async()=>{try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   if(!context)context=new Audio();if(context.state==='suspended')await context.resume();
   if(context.state!=='running')return;
   if(!analyser){const source=context.createMediaElementSource(song);source.connect(context.destination);analyser=context.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.72;source.connect(analyser);data=new Uint8Array(analyser.frequencyBinCount);body.classList.add('real-meter');}
   wake();
  }catch{/* Native playback remains the fallback if analysis is unavailable. */}})();
  await starting;starting=null;
 }
 document.addEventListener('click',event=>{if(event.target.closest('#play,[data-listen],#song'))ensureGraph();},true);
 song.addEventListener('play',()=>{say('Соседи потерпят. Включай громче.');ensureGraph();wake();});
 song.addEventListener('pause',()=>{stop();say(song.ended?'Ещё раз? Я не против.':'Мы уже всё? Я только разогрелась.');});
 song.addEventListener('ended',()=>{stop();say('Ещё раз? Я не против.');});
 song.addEventListener('error',stop);
 document.addEventListener('nyura:glass-broken',()=>say('Я ничего не видела. Ты тоже.'));
 document.addEventListener('nyura:glass-reset',()=>{if(performance.now()-lastReaction>800){say('Новое стекло. Старые привычки.');lastReaction=performance.now();}});
 document.querySelector('#copy').addEventListener('click',()=>say('Забирай фразу. Приличия оставь здесь.'));
 toggle.addEventListener('click',()=>{enabled=!enabled;body.classList.toggle('atmosphere-off',!enabled);toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=enabled?'Ночной свет: вкл.':'Ночной свет: выкл.';if(enabled)wake();else stop();});
 document.addEventListener('visibilitychange',()=>document.hidden?stop():wake());
 reduced.addEventListener('change',()=>reduced.matches?stop():wake());
 window.addEventListener('pagehide',()=>{disposed=true;stop();});window.addEventListener('pageshow',()=>{disposed=false;wake();});
})();
