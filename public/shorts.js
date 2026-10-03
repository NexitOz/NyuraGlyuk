(() => {
 const modal=document.querySelector('#short-modal');
 const video=document.querySelector('#short-video');
 const status=document.querySelector('#short-video-state');
 if(!modal||!video||!status)return;
 let opener=null;

 document.querySelectorAll('[data-short-src]').forEach(button=>{
  button.addEventListener('click',()=>{
   if(modal.open)return;
   opener=button;
   status.textContent='';
   document.querySelector('#short-modal-title').textContent=button.dataset.shortTitle;
   video.setAttribute('aria-label',button.dataset.shortTitle+' — Нюра Глюк');
   video.poster=button.querySelector('img').src;
   video.src=button.dataset.shortSrc;
   video.load();
   document.querySelectorAll('audio').forEach(audio=>audio.pause());
   modal.showModal();
   document.documentElement.classList.add('short-modal-open');
   video.play().catch(()=>{
    if(modal.open&&!video.error)status.textContent='Нажми ▶ в плеере, чтобы включить ролик.';
   });
  });
 });

 modal.querySelector('.short-close').addEventListener('click',()=>modal.close());
 modal.addEventListener('click',event=>{
  if(event.target!==modal)return;
  const bounds=modal.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)modal.close();
 });
 modal.addEventListener('close',()=>{
  video.pause();
  video.removeAttribute('src');
  video.load();
  document.documentElement.classList.remove('short-modal-open');
  opener?.focus({preventScroll:true});
 });
 video.addEventListener('play',()=>{
  document.querySelectorAll('audio').forEach(audio=>audio.pause());
  status.textContent='';
 });
 video.addEventListener('error',()=>{
  if(modal.open&&video.hasAttribute('src'))status.textContent='Ролик не загрузился. Закрой окно и попробуй ещё раз.';
 });
 document.querySelectorAll('audio').forEach(audio=>audio.addEventListener('play',()=>video.pause()));
 window.addEventListener('pagehide',()=>video.pause());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
})();
