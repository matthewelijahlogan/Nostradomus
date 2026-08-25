const thresholdDateFormat=new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const thresholdTimeFormat=new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'});
function shortUtcDate(date){
  return String(date.getUTCDate()).padStart(2,'0')+' '+date.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()+' '+date.getUTCFullYear();
}
function updateOracleClock(countries){
  const measured=countries.filter(country=>country.score != null);
  if(!measured.length)return;
  const average=measured.reduce((sum,country)=>sum+country.score,0)/measured.length;
  const highest=measured.reduce((current,country)=>country.score>current.score?country:current);
  const daysToThreshold=Math.round(4380*(1-average/100));
  const threshold=new Date(Date.now()+daysToThreshold*86400000);
  const daysToEvent=Math.max(7,Math.round(730*(1-highest.score/100)));
  const eventDate=new Date(Date.now()+daysToEvent*86400000);
  document.querySelector('#terminal-countdown').textContent=thresholdDateFormat.format(threshold).toUpperCase();
  document.querySelector('#terminal-date').textContent=thresholdTimeFormat.format(threshold)+' UTC · DATA INDEX '+Math.round(average)+'/100';
  document.querySelector('#event-countdown').textContent=shortUtcDate(eventDate);
  document.querySelector('#event-date').textContent=thresholdTimeFormat.format(eventDate)+' UTC · '+highest.name.toUpperCase()+' SIGNAL';
}
window.addEventListener('oracle-volatility-loaded',event=>updateOracleClock(event.detail));
if(window.oracleCountryVolatility)updateOracleClock(window.oracleCountryVolatility);
fetch('https://nostradomus-live-api.onrender.com/api/brief').then(response=>{if(!response.ok)throw Error('Live data unavailable');return response.json()}).then(data=>{
  const nuclearSignals=data.articles.filter(article=>/nuclear|missile|radiation|atomic/i.test(article.title)).length;
  const militarySignals=data.articles.filter(article=>/military|conflict|war|airstrike|invasion|troops/i.test(article.title)).length;
  const naturalSignals=data.quakes.length;
  document.querySelector('#nuclear-status').textContent=nuclearSignals?nuclearSignals+' ACTIVE':'NO ACTIVE SIGNALS';
  document.querySelector('#nuclear-detail').textContent='BBC WORLD · CURRENT FEED';
  document.querySelector('#natural-status').textContent=naturalSignals?naturalSignals+' SIGNIFICANT':'NO SIGNIFICANT QUAKES';
  document.querySelector('#natural-detail').textContent='USGS · PAST 24 HOURS';
  const eventCategory=nuclearSignals?['NUCLEAR ESCALATION',nuclearSignals+' NUCLEAR-RELATED BBC SIGNAL'+(nuclearSignals===1?'':'S')]:militarySignals?['MILITARY ESCALATION',militarySignals+' CONFLICT-RELATED BBC SIGNAL'+(militarySignals===1?'':'S')]:naturalSignals?['NATURAL HAZARD',naturalSignals+' USGS SIGNIFICANT EVENT'+(naturalSignals===1?'':'S')]:['ECONOMIC DISRUPTION','COUNTRY-VOLATILITY MODEL FALLBACK'];
  document.querySelector('#event-category').textContent=eventCategory[0];
  document.querySelector('#event-category-detail').textContent=eventCategory[1];
}).catch(()=>{
  document.querySelector('#nuclear-status').textContent='UNAVAILABLE';
  document.querySelector('#natural-status').textContent='UNAVAILABLE';
  document.querySelector('#event-category').textContent='UNAVAILABLE';
  document.querySelector('#event-category-detail').textContent='LIVE FEED NOT AVAILABLE';
});
