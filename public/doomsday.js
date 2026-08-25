const nextScheduledEvent=new Date('2026-09-08T14:00:00Z');
function formatRemaining(milliseconds){
  const total=Math.max(0,Math.floor(milliseconds/1000));
  const days=Math.floor(total/86400);
  const hours=Math.floor(total%86400/3600);
  const minutes=Math.floor(total%3600/60);
  const seconds=total%60;
  if(days>99)return days+'D '+String(hours).padStart(2,'0')+'H';
  return String(days).padStart(2,'0')+'D '+String(hours).padStart(2,'0')+':'+String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
}
function updateScheduledEventClock(){
  document.querySelector('#event-countdown').textContent=formatRemaining(nextScheduledEvent-Date.now());
}
updateScheduledEventClock();
setInterval(updateScheduledEventClock,1000);
