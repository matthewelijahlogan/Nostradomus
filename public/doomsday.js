const thresholdDateFormat=new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const thresholdTimeFormat=new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'});
let oracleCountries=[],briefArticles=[];
function shortUtcDate(date){
  return String(date.getUTCDate()).padStart(2,'0')+' '+date.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()+' '+date.getUTCFullYear();
}
function updateOracleClock(countries){
  oracleCountries=countries;
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
  document.querySelector('#terminal-trigger').textContent='LIKELY TRIGGER: SYSTEMIC VOLATILITY';
  document.querySelector('#event-countdown').textContent=shortUtcDate(eventDate);
  document.querySelector('#event-type').textContent='MOST LIKELY CATEGORY: '+(highest.score>=65?'ECONOMIC DISRUPTION':'SYSTEMIC VOLATILITY');
  document.querySelector('#event-date').textContent=thresholdTimeFormat.format(eventDate)+' UTC · '+highest.name.toUpperCase()+' SIGNAL';
  updateMilitaryLeaders();
}
function updateMilitaryLeaders(){
  if(!oracleCountries.length||!briefArticles.length)return;
  const militaryArticles=briefArticles.filter(article=>/military|conflict|war|airstrike|invasion|troops/i.test(article.title));
  const panel=document.querySelector('#military-leaders-panel'),divider=document.querySelector('#military-leaders-divider');
  if(!militaryArticles.length){panel.hidden=true;divider.hidden=true;return}
  const leaders=oracleCountries.map(country=>{const aliases=[country.name];if(country.name==='United States')aliases.push('u.s.','us ');if(country.name==='United Kingdom')aliases.push('uk ','britain');const mentions=militaryArticles.filter(article=>aliases.some(alias=>article.title.toLowerCase().includes(alias.toLowerCase()))).length;return {...country,mentions}}).filter(country=>country.mentions>0).sort((a,b)=>b.mentions-a.mentions||b.score-a.score).slice(0,2);
  if(!leaders.length){panel.hidden=true;divider.hidden=true;return}
  panel.hidden=false;divider.hidden=false;
  const label=leaders.map(country=>country.name.toUpperCase()).join(' / ');
  const detail=leaders.map(country=>country.mentions+' BBC MENTION'+(country.mentions===1?'':'S')).join(' - ');
  document.querySelector('#military-leaders').textContent=label;
  document.querySelector('#military-leaders-detail').textContent=detail+' - SIGNAL MODEL, NOT A FORECAST';
}
function modelEventCategory({nuclearSignals,militarySignals,earthquakeOutlook}){
  const measured=oracleCountries.filter(country=>country.score != null);
  const economicScore=measured.length?Math.round(measured.reduce((sum,country)=>sum+country.score,0)/measured.length):0;
  const candidates=[
    {name:'ECONOMIC DISRUPTION',score:economicScore,detail:'WORLD BANK VOLATILITY MODEL'},
    {name:'MILITARY ESCALATION',score:Math.min(100,militarySignals*30),detail:'BBC MILITARY REPORTING MODEL'},
    {name:'NUCLEAR ESCALATION',score:Math.min(100,nuclearSignals*45),detail:'BBC NUCLEAR-RELATED REPORTING MODEL'},
    {name:'NATURAL HAZARD',score:earthquakeOutlook?.probability||0,detail:'USGS 30-DAY FREQUENCY MODEL'}
  ];
  return candidates.sort((a,b)=>b.score-a.score)[0];
}
window.addEventListener('oracle-volatility-loaded',event=>updateOracleClock(event.detail));
if(window.oracleCountryVolatility)updateOracleClock(window.oracleCountryVolatility);
fetch('https://nostradomus-live-api.onrender.com/api/brief').then(response=>{if(!response.ok)throw Error('Live data unavailable');return response.json()}).then(data=>{
  briefArticles=data.articles||[];
  const nuclearSignals=data.articles.filter(article=>/nuclear|missile|radiation|atomic/i.test(article.title)).length;
  const militarySignals=data.articles.filter(article=>/military|conflict|war|airstrike|invasion|troops/i.test(article.title)).length;
  const naturalSignals=data.quakes.length;
  const earthquakeOutlook=data.earthquakeOutlook;
  document.querySelector('#nuclear-status').textContent=nuclearSignals?nuclearSignals+' ACTIVE':'NO ACTIVE SIGNALS';
  document.querySelector('#nuclear-detail').textContent='BBC WORLD · CURRENT FEED';
  document.querySelector('#natural-status').textContent=naturalSignals?naturalSignals+' SIGNIFICANT':'NO SIGNIFICANT QUAKES';
  document.querySelector('#natural-detail').textContent='USGS · PAST 24 HOURS';
  const strongestQuake=[...data.quakes].sort((a,b)=>(b.mag||0)-(a.mag||0))[0];
  const quakeTime=strongestQuake&&strongestQuake.time?new Date(strongestQuake.time):null;
  document.querySelector('#natural-risk').textContent=strongestQuake?'M '+Number(strongestQuake.mag).toFixed(1)+' EARTHQUAKE':'NO SIGNIFICANT HAZARD';
  document.querySelector('#natural-risk-detail').textContent=strongestQuake?(strongestQuake.title||'USGS significant event').replace(/^M [\d.]+ - /,'').slice(0,58).toUpperCase():'USGS SIGNIFICANT-EVENT FEED';
  document.querySelector('#natural-risk-detail').textContent=strongestQuake?(quakeTime?'REPORTED '+thresholdDateFormat.format(quakeTime).toUpperCase()+' '+thresholdTimeFormat.format(quakeTime)+' UTC':'USGS REPORTED TIME UNAVAILABLE'):'USGS SIGNIFICANT-EVENT FEED';
  document.querySelector('#natural-forecast').textContent=strongestQuake?'NO FORECAST DATE - EARTHQUAKES CANNOT BE TIMED RELIABLY':'FORECAST DATE: NOT AVAILABLE';
  const eventCategory=nuclearSignals?['NUCLEAR ESCALATION',nuclearSignals+' NUCLEAR-RELATED BBC SIGNAL'+(nuclearSignals===1?'':'S')]:militarySignals?['MILITARY ESCALATION',militarySignals+' CONFLICT-RELATED BBC SIGNAL'+(militarySignals===1?'':'S')]:naturalSignals?['NATURAL HAZARD',naturalSignals+' USGS SIGNIFICANT EVENT'+(naturalSignals===1?'':'S')]:['ECONOMIC DISRUPTION','COUNTRY-VOLATILITY MODEL FALLBACK'];
  document.querySelector('#event-category').textContent=eventCategory[0];
  document.querySelector('#event-category-detail').textContent=eventCategory[1];
  document.querySelector('#event-type').textContent='MOST LIKELY CATEGORY: '+eventCategory[0];
  document.querySelector('#terminal-trigger').textContent='LIKELY TRIGGER: '+eventCategory[0];
  const forwardCategory=modelEventCategory({nuclearSignals,militarySignals,earthquakeOutlook});
  document.querySelector('#natural-status').textContent=earthquakeOutlook?earthquakeOutlook.probability+'% / 30D':'OUTLOOK PENDING';
  document.querySelector('#natural-detail').textContent=earthquakeOutlook?'USGS REGIONAL FREQUENCY MODEL':'USGS CATALOG UNAVAILABLE';
  document.querySelector('#natural-risk').textContent=earthquakeOutlook?earthquakeOutlook.threshold+' · '+earthquakeOutlook.probability+'%':'NO NATURAL OUTLOOK';
  document.querySelector('#natural-risk-detail').textContent=earthquakeOutlook?earthquakeOutlook.location.toUpperCase().slice(0,58):'NO REGIONAL FREQUENCY MODEL';
  document.querySelector('#natural-forecast').textContent=earthquakeOutlook?'30-DAY WINDOW ENDS '+shortUtcDate(new Date(earthquakeOutlook.windowEnd))+' · '+earthquakeOutlook.events+' EVENTS / '+earthquakeOutlook.days+'D':'FORECAST WINDOW: UNAVAILABLE';
  document.querySelector('#event-category').textContent=forwardCategory.name;
  document.querySelector('#event-category-detail').textContent=forwardCategory.score+'/100 · '+forwardCategory.detail;
  document.querySelector('#event-type').textContent='MOST LIKELY CATEGORY: '+forwardCategory.name;
  document.querySelector('#terminal-trigger').textContent='LIKELY TRIGGER: '+forwardCategory.name;
  updateMilitaryLeaders();
}).catch(()=>{
  document.querySelector('#nuclear-status').textContent='UNAVAILABLE';
  document.querySelector('#natural-status').textContent='UNAVAILABLE';
  document.querySelector('#event-category').textContent='UNAVAILABLE';
  document.querySelector('#event-category-detail').textContent='LIVE FEED NOT AVAILABLE';
  document.querySelector('#event-type').textContent='MOST LIKELY CATEGORY: UNAVAILABLE';
  document.querySelector('#natural-risk').textContent='UNAVAILABLE';
  document.querySelector('#natural-forecast').textContent='FORECAST DATE: UNAVAILABLE';
  document.querySelector('#military-leaders').textContent='UNAVAILABLE';
  document.querySelector('#military-leaders-panel').hidden=true;
  document.querySelector('#military-leaders-divider').hidden=true;
});
