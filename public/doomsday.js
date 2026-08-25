const scenarioClocks=[
  {target:'2041-10-14T23:47:00Z',countdownId:'terminal-countdown',dateId:'terminal-date'},
  {target:'2026-09-17T14:30:00Z',countdownId:'event-countdown',dateId:'event-date'}
];
const utcDateFormat=new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'});
function formatRemaining(milliseconds){
  const total=Math.max(0,Math.floor(milliseconds/1000));
  const days=Math.floor(total/86400);
  const hours=Math.floor(total%86400/3600);
  const minutes=Math.floor(total%3600/60);
  const seconds=total%60;
  return days>99?`${days}D ${String(hours).padStart(2,'0')}H`:`${String(days).padStart(2,'0')}D ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
function updateScenarioClocks(){
  const now=Date.now();
  scenarioClocks.forEach(clock=>{
    const target=new Date(clock.target);
    document.querySelector(`#${clock.countdownId}`).textContent=formatRemaining(target-now);
    document.querySelector(`#${clock.dateId}`).textContent=`EST. ${utcDateFormat.format(target)} UTC`;
  });
}
updateScenarioClocks();
setInterval(updateScenarioClocks,1000);
