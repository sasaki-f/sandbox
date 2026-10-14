// Leave enough trailing space for the final column to align beside the fixed time axis.
for(const scroller of document.querySelectorAll('.schedule-scroll')){
  const table=scroller.querySelector('.schedule-table');
  const update=()=>{const column=table.querySelector('.equipment-column');if(!column||!scroller.clientWidth)return;const tail=Math.max(0,scroller.clientWidth-70-column.offsetWidth);table.style.setProperty('--snap-tail-width',tail+'px')};
  new ResizeObserver(update).observe(scroller);
  new MutationObserver(update).observe(table,{childList:true});
  update();
  let verticalTimer;
  const snapTime=()=>{if(!scroller.clientHeight)return;const limit=scroller.scrollHeight-scroller.clientHeight;const top=Math.min(Math.round(scroller.scrollTop/32)*32,Math.floor(limit/32)*32);if(Math.abs(top-scroller.scrollTop)>0.5)scroller.scrollTo({top,left:scroller.scrollLeft,behavior:'smooth'})};
  scroller.addEventListener('scroll',()=>{clearTimeout(verticalTimer);verticalTimer=setTimeout(snapTime,140)},{passive:true});
  scroller.addEventListener('scrollend',snapTime);
}
