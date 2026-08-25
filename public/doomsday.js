const thresholdDateFormat=new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const thresholdTimeFormat=new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'});
function updateOracleClock(){
  const forecasts=[...document.querySelectorAll('#forecast-list .forecast')].map(item=>({
    name:item.querySelector('span').childNodes[0].textContent.trim(),
    score:Number.parseFloat(item.querySelector('b').textContent)
  })).filter(item=>Number.isFinite(item.score));
  if(!forecasts.length)return;
  const average=forecasts.reduce((sum,item)=>sum+item.score,0)/forecasts.length;
  const highest=forecasts.reduce((current,item)=>item.score>current.score?item:current);
  const daysToThreshold=Math.round(4380*(1-average/100));
  const threshold=new Date(Date.now()+daysToThreshold*86400000);
  document.querySelector('#terminal-countdown').textContent=thresholdDateFormat.format(threshold).toUpperCase();
  document.querySelector('#terminal-date').textContent=thresholdTimeFormat.format(threshold)+' UTC · MODEL INDEX '+Math.round(average)+'/100';
  document.querySelector('#event-countdown').textContent=highest.score+'%';
  document.querySelector('#event-date').textContent=highest.name.toUpperCase()+' · ACTIVE HORIZON';
}
updateOracleClock();
document.querySelectorAll('[data-horizon]').forEach(button=>button.addEventListener('click',()=>requestAnimationFrame(updateOracleClock)));
