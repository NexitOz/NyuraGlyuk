const tracks=[
 {title:'Приличная',lines:['Я не лапочка — я сбой,','Не знакомь меня с семьёй.','Я приличная. Почти.','При мне маме не пиши.'],src:'assets/prilichnaya.mp3',duration:149,button:'Слушать «Приличную»'},
 {title:'Не лечи меня — включи',lines:['Не лечи меня — включи!','Слышишь бас? Тогда молчи.','Я хорошей быть не хочу —','Я не сломана — я так звучу!'],src:'assets/ne-lechi-menya-vklyuchi.mp3',duration:122,button:'Слушать «Не лечи меня — включи»'},
 {title:'Я в пакетике',lines:['Не трогай — я в пакетике,','В домашней эстетике.','Шуршу, шуршу, шуршу —','Я никуда не спешу.']}
];
let selectedTrack=0,selectedSong=0;
const song=document.querySelector('#song'),box=document.querySelector('.sound-box'),play=document.querySelector('#play'),audioState=document.querySelector('#audio-state');
function selectLyrics(index){
 selectedTrack=index;
 document.querySelectorAll('[data-open]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.open)===index)));
 document.querySelectorAll('.track').forEach(t=>t.classList.toggle('active',Number(t.dataset.track)===index));
 document.querySelector('#lyric-title').textContent=tracks[index].title.toUpperCase()+(tracks[index].src?' / ПРИПЕВ':' / НАБРОСОК ПРИПЕВА');
 const p=document.querySelector('#lyrics');p.replaceChildren();
 tracks[index].lines.forEach((line,i)=>{if(i)p.append(document.createElement('br'));p.append(document.createTextNode(line));});
 document.querySelector('#copy-state').textContent='Для подписи к твоему видео.';
}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>selectLyrics(Number(b.dataset.open))));
document.querySelector('#copy').addEventListener('click',async()=>{
 const status=document.querySelector('#copy-state');
 try{if(!navigator.clipboard)throw Error('clipboard');await navigator.clipboard.writeText(tracks[selectedTrack].lines.join('\n'));status.textContent='Скопировано. Теперь это и твоя фраза.';}
 catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(document.querySelector('#lyrics'));selection.removeAllRanges();selection.addRange(range);status.textContent='Текст выделен — скопируй его через меню устройства.';}
});
function time(value){const seconds=Math.floor(Number.isFinite(value)?value:0);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
function updateTime(){document.querySelector('#play-time').textContent=time(song.currentTime)+' / '+time(Number.isFinite(song.duration)?song.duration:tracks[selectedSong].duration);}
function sync(){
 const active=!song.paused&&!song.ended;
 box.classList.toggle('playing',active);
 play.textContent=active?'Пауза':tracks[selectedSong].button;
 play.setAttribute('aria-pressed',String(active));
 audioState.textContent=active?'Играет «'+tracks[selectedSong].title+'»':'Воспроизведение остановлено';
}
function selectSong(index){
 if(!tracks[index]?.src)return;
 if(index!==selectedSong){song.pause();selectedSong=index;song.src=tracks[index].src;song.load();}
 document.querySelector('#player-title').textContent=tracks[index].title.toUpperCase()+' / НЮРА ГЛЮК';
 song.setAttribute('aria-label','Нюра Глюк — '+tracks[index].title);
 document.querySelector('#recording-note').textContent='Полная запись · '+time(tracks[index].duration);
 document.querySelectorAll('[data-song]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.song)===index)));
 selectLyrics(index);updateTime();sync();
}
async function startSong(){try{await song.play();}catch{audioState.textContent='Не удалось запустить песню. Попробуй плеер ниже.';}}
document.querySelectorAll('[data-song]').forEach(b=>b.addEventListener('click',()=>selectSong(Number(b.dataset.song))));
document.querySelectorAll('[data-listen]').forEach(b=>b.addEventListener('click',()=>{selectSong(Number(b.dataset.listen));document.querySelector('#glitch').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});startSong();}));
play.addEventListener('click',()=>{if(!song.paused)song.pause();else startSong();});
['play','pause','ended'].forEach(event=>song.addEventListener(event,sync));
['timeupdate','loadedmetadata','durationchange'].forEach(event=>song.addEventListener(event,updateTime));
song.addEventListener('error',()=>{audioState.textContent='Песня не загрузилась. Обнови страницу и попробуй ещё раз.';box.classList.remove('playing');play.textContent='Повторить воспроизведение';play.setAttribute('aria-pressed','false');});
window.addEventListener('pagehide',()=>song.pause());
