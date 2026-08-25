function updateOracleClock(){
  const forecasts=[...document.querySelectorAll('#forecast-list .forecast')].map(item=>({
    name:item.querySelector('span').childNodes[0].textContent.trim(),
    score:Number.parseFloat(item.querySelector('b').textContent)
  })).filter(item=>Number.isFinite(item.score));
  if(!forecasts.length)return;
  const average=forecasts.reduce((sum,item)=>sum+item.score,0)/forecasts.length;
  const seconds=Math.max(60,Math.round(300-average*4));
  const highest=forecasts.reduce((current,item)=>item.score>current.score?item:current);
  document.querySelector('#terminal-countdown').textContent=seconds+' SECONDS';
  document.querySelector('#terminal-date').textContent='TO MIDNIGHT · SYSTEMIC INDEX '+Math.round(average)+'/100';
  document.querySelector('#event-countdown').textContent=highest.score+'%';
  document.querySelector('#event-date').textContent=highest.name.toUpperCase()+' · ACTIVE HORIZON';
}
updateOracleClock();
document.querySelectorAll('[data-horizon]').forEach(button=>button.addEventListener('click',()=>requestAnimationFrame(updateOracleClock)));
