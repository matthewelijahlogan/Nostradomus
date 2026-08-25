const VOLATILITY_API='https://nostradomus-live-api.onrender.com/api/country-volatility';
const regionFilter=document.querySelector('#region-filter');
const countrySearch=document.querySelector('#country-search');
const countryFilter=document.querySelector('#country-filter');
const resultPanel=document.querySelector('#volatility-results');
const detailPanel=document.querySelector('#forecast-detail');
const explorerHelp=document.querySelector('#country-search-help');
let countryVolatility=[];
function scoreText(score){return score == null?'N/A':score+'/100'}
function regionalProfiles(){
  const groups=new Map();
  countryVolatility.filter(country=>country.score != null).forEach(country=>{
    const group=groups.get(country.region)||[];
    group.push(country.score);groups.set(country.region,group);
  });
  return [...groups].map(([name,scores])=>({name,score:Math.round(scores.reduce((sum,score)=>sum+score,0)/scores.length),count:scores.length})).sort((a,b)=>a.name.localeCompare(b.name));
}
function renderCountryDetail(country){
  if(country.score == null){
    detailPanel.innerHTML='<div class="detail-label"><span>'+country.region.toUpperCase()+'</span><span>DATA STATUS</span></div><h2>'+country.name+'</h2><p class="detail-unavailable">No volatility index is shown because the required recent World Bank observations are unavailable.</p>';
    return;
  }
  const input=country.inputs;
  detailPanel.innerHTML='<div class="detail-label"><span>'+country.region.toUpperCase()+'</span><span>LATEST REPORTED DATA</span></div><h2>'+country.name+' economic volatility</h2><div class="detail-score">'+country.score+'<small>/ 100</small></div><div class="meter"><i style="width:'+country.score+'%"></i></div><div class="detail-label"><span>DATA-DERIVED INDEX</span><span>'+input.growthYear+' / '+input.inflationYear+'</span></div><p class="eyebrow" style="margin-top:1.55rem">REPORTED INPUTS</p><div class="drivers"><div class="driver"><span>Inflation ('+input.inflationYear+')</span><b>'+input.inflation.toFixed(1)+'%</b></div><div class="driver"><span>GDP growth ('+input.growthYear+')</span><b>'+input.growth.toFixed(1)+'%</b></div><div class="driver"><span>GDP growth change ('+input.priorGrowthYear+'–'+input.growthYear+')</span><b>'+input.growthChange.toFixed(1)+' pts</b></div></div>';
}
function renderVolatility(){
  const query=countrySearch.value.trim().toLowerCase();
  const region=regionFilter.value;
  const records=query?countryVolatility.filter(country=>country.name.toLowerCase().includes(query)&&(region==='all'||country.region===region)):regionalProfiles().filter(item=>region==='all'||item.name===region);
  if(!records.length){resultPanel.innerHTML='<p class="volatility-empty">No matching country or regional data is available.</p>';return}
  resultPanel.innerHTML=records.map(item=>{
    const country='iso3' in item;
    const subtitle=country?(item.region+(item.score == null?' · unavailable':' · latest data')):(item.count+' countries with data');
    return '<button class="volatility-result" data-iso="'+(item.iso3||'')+'" data-country="'+country+'"><span>'+item.name+'<small>'+subtitle+'</small></span><b>'+scoreText(item.score)+'</b></button>';
  }).join('');
  resultPanel.querySelectorAll('[data-country="true"]').forEach(button=>button.addEventListener('click',()=>{
    const country=countryVolatility.find(item=>item.iso3===button.dataset.iso);
    renderCountryDetail(country);
    window.dispatchEvent(new CustomEvent('oracle-country-selected',{detail:country}));
  }));
  resultPanel.querySelectorAll('[data-country="false"]').forEach(button=>button.addEventListener('click',()=>{
    const region=regionalProfiles().find(item=>item.name===button.querySelector('span').childNodes[0].textContent);
    regionFilter.value=region.name;countrySearch.value='';countryFilter.value='all';renderVolatility();
    window.dispatchEvent(new CustomEvent('oracle-region-selected',{detail:region}));
  }));
}
function configureExplorer(data){
  countryVolatility=data.countries;
  countryFilter.innerHTML='<option value="all">All '+countryVolatility.length+' World Bank economies</option>'+countryVolatility.map(country=>'<option value="'+country.iso3+'">'+country.name+'</option>').join('');
  const regions=[...new Set(countryVolatility.map(country=>country.region))].sort();
  regionFilter.innerHTML='<option value="all">All regions</option>'+regions.map(region=>'<option value="'+region+'">'+region+'</option>').join('');
  explorerHelp.innerHTML='Latest published economic data from <a href="'+data.source.url+'" target="_blank" rel="noopener">World Bank World Development Indicators</a>. '+data.methodology;
  window.oracleCountryVolatility=countryVolatility;
  window.dispatchEvent(new CustomEvent('oracle-volatility-loaded',{detail:countryVolatility}));
  renderVolatility();
}
regionFilter.addEventListener('change',renderVolatility);
countrySearch.addEventListener('input',()=>{countryFilter.value='all';renderVolatility()});
countryFilter.addEventListener('change',()=>{
  const country=countryVolatility.find(item=>item.iso3===countryFilter.value);
  if(!country){countrySearch.value='';renderVolatility();return}
  regionFilter.value='all';countrySearch.value=country.name;renderVolatility();renderCountryDetail(country);
  window.dispatchEvent(new CustomEvent('oracle-country-selected',{detail:country}));
});
resultPanel.innerHTML='<p class="volatility-empty">Loading published country data…</p>';
fetch(VOLATILITY_API).then(response=>{if(!response.ok)throw Error('Country data unavailable');return response.json()}).then(configureExplorer).catch(()=>{resultPanel.innerHTML='<p class="volatility-empty">Country data is temporarily unavailable. Please retry shortly.</p>'});
