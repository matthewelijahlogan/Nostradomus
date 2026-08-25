const regionalVolatility=[
  {name:'Middle East',scores:{7:42,30:47,90:51,180:55}},
  {name:'Europe',scores:{7:24,30:27,90:30,180:33}},
  {name:'Asia-Pacific',scores:{7:28,30:31,90:34,180:37}},
  {name:'Africa',scores:{7:35,30:38,90:41,180:44}},
  {name:'Americas',scores:{7:19,30:22,90:25,180:29}},
  {name:'Oceania',scores:{7:11,30:14,90:17,180:20}}
];
const countryVolatility=[
  {name:'Australia',region:'Oceania',scores:{7:10,30:13,90:16,180:19},confidence:'Low',change:'+0.4 points',drivers:[['Climate exposure','Moderate'],['Trade concentration','Low'],['Regional security','Low']]},
  {name:'Argentina',region:'Americas',scores:{7:30,30:34,90:38,180:41},confidence:'Moderate',change:'+3.1 points',drivers:[['Currency pressure','Elevated'],['Debt refinancing conditions','High'],['Inflation expectations','Elevated']]},
  {name:'Brazil',region:'Americas',scores:{7:18,30:21,90:24,180:28},confidence:'Moderate',change:'+1.4 points',drivers:[['Fiscal policy uncertainty','Moderate'],['Commodity sensitivity','Elevated'],['Currency volatility','Moderate']]},
  {name:'China',region:'Asia-Pacific',scores:{7:22,30:25,90:29,180:32},confidence:'Low',change:'+1.8 points',drivers:[['Property-sector stress','Elevated'],['Trade policy friction','Moderate'],['Demand conditions','Moderate']]},
  {name:'Egypt',region:'Middle East',scores:{7:39,30:43,90:46,180:49},confidence:'Moderate',change:'+4.6 points',drivers:[['External financing','High'],['Food-price pressure','Elevated'],['Currency conditions','Elevated']]},
  {name:'France',region:'Europe',scores:{7:16,30:19,90:22,180:25},confidence:'Low',change:'+0.9 points',drivers:[['Fiscal outlook','Moderate'],['Political fragmentation','Moderate'],['Energy costs','Low']]},
  {name:'Germany',region:'Europe',scores:{7:13,30:16,90:19,180:23},confidence:'Low',change:'+0.6 points',drivers:[['Industrial demand','Moderate'],['Energy inputs','Moderate'],['Coalition stability','Low']]},
  {name:'India',region:'Asia-Pacific',scores:{7:20,30:23,90:27,180:30},confidence:'Moderate',change:'+1.7 points',drivers:[['Food-price volatility','Elevated'],['Energy imports','Moderate'],['Regional security','Moderate']]},
  {name:'Iran',region:'Middle East',scores:{7:51,30:55,90:59,180:62},confidence:'Moderate',change:'+5.9 points',drivers:[['Regional military posture','High'],['Sanctions exposure','High'],['Currency pressure','Elevated']]},
  {name:'Israel',region:'Middle East',scores:{7:48,30:52,90:56,180:58},confidence:'Moderate',change:'+5.3 points',drivers:[['Security environment','High'],['Regional escalation risk','High'],['Fiscal strain','Moderate']]},
  {name:'Japan',region:'Asia-Pacific',scores:{7:12,30:15,90:18,180:21},confidence:'Low',change:'+0.5 points',drivers:[['Currency conditions','Moderate'],['Energy imports','Moderate'],['Natural-hazard exposure','Low']]},
  {name:'Mexico',region:'Americas',scores:{7:25,30:28,90:31,180:34},confidence:'Moderate',change:'+2.2 points',drivers:[['Organized-crime exposure','Elevated'],['Trade concentration','Moderate'],['Water stress','Moderate']]},
  {name:'Nigeria',region:'Africa',scores:{7:43,30:47,90:50,180:53},confidence:'Moderate',change:'+4.2 points',drivers:[['Currency pressure','High'],['Security conditions','Elevated'],['Oil revenue sensitivity','Elevated']]},
  {name:'Pakistan',region:'Asia-Pacific',scores:{7:46,30:50,90:54,180:57},confidence:'Moderate',change:'+4.9 points',drivers:[['External financing','High'],['Political stability','Elevated'],['Climate exposure','Elevated']]},
  {name:'South Africa',region:'Africa',scores:{7:29,30:33,90:36,180:40},confidence:'Moderate',change:'+2.7 points',drivers:[['Electricity reliability','Elevated'],['Fiscal outlook','Moderate'],['Social pressure','Moderate']]},
  {name:'Turkey',region:'Middle East',scores:{7:34,30:38,90:42,180:45},confidence:'Moderate',change:'+3.8 points',drivers:[['Inflation persistence','High'],['Currency volatility','Elevated'],['Regional security','Moderate']]},
  {name:'United Kingdom',region:'Europe',scores:{7:15,30:18,90:21,180:24},confidence:'Low',change:'+0.8 points',drivers:[['Fiscal headroom','Moderate'],['Growth outlook','Moderate'],['Energy costs','Low']]},
  {name:'United States of America',aliases:['United States','USA','US'],region:'Americas',scores:{7:17,30:20,90:23,180:27},confidence:'Low',change:'+1.1 points',drivers:[['Political polarization','Moderate'],['Debt trajectory','Moderate'],['Market concentration','Moderate']]}
];
const regionFilter=document.querySelector('#region-filter');
const countrySearch=document.querySelector('#country-search');
const countryFilter=document.querySelector('#country-filter');
const resultPanel=document.querySelector('#volatility-results');
const detailPanel=document.querySelector('#forecast-detail');
let selectedCountry=null;
function activeHorizon(){return Number(document.querySelector('[data-horizon].active')?.dataset.horizon||90)}
function renderCountryDetail(country){
  const score=country.scores[activeHorizon()];
  detailPanel.innerHTML=`<div class="detail-label"><span>${country.region.toUpperCase()}</span><span>${activeHorizon()}-DAY OUTLOOK</span></div><h2>${country.name} volatility</h2><div class="detail-score">${score}% <small>volatility index</small></div><div class="meter"><i style="width:${score}%"></i></div><div class="detail-label"><span>CONFIDENCE: ${country.confidence.toUpperCase()}</span><span class="up">${country.change}</span></div><p class="eyebrow" style="margin-top:1.55rem">PRIMARY DRIVERS</p><div class="drivers">${country.drivers.map(([name,level])=>`<div class="driver"><span>${name}</span><b>${level}</b></div>`).join('')}</div>`;
}
function renderVolatility(){
  const query=countrySearch.value.trim().toLowerCase();
  const region=regionFilter.value;
  const records=query?countryVolatility.filter(country=>(country.name.toLowerCase().includes(query)||(country.aliases||[]).some(alias=>alias.toLowerCase().includes(query)))&& (region==='all'||country.region===region)):regionalVolatility.filter(item=>region==='all'||item.name===region);
  if(!records.length){resultPanel.innerHTML='<p class="volatility-empty">No country profile matches that search. Try another country or clear the region filter.</p>';return}
  resultPanel.innerHTML=records.map(item=>{
    const isCountry='region' in item;
    const subtitle=isCountry?item.region:'Regional volatility';
    return `<button class="volatility-result" data-name="${item.name}" data-type="${isCountry?'country':'region'}"><span>${item.name}<small>${subtitle}</small></span><b>${item.scores[activeHorizon()]}%</b></button>`;
  }).join('');
  resultPanel.querySelectorAll('.volatility-result').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.type==='country'){selectedCountry=countryVolatility.find(country=>country.name===button.dataset.name);renderCountryDetail(selectedCountry)}
  }));
}
regionFilter.addEventListener('change',renderVolatility);
countrySearch.addEventListener('input',()=>{countryFilter.value='all';renderVolatility()});
countryFilter.innerHTML+=[...countryVolatility].sort((a,b)=>a.name.localeCompare(b.name)).map(country=>`<option value="${country.name}">${country.name}</option>`).join('');
countryFilter.addEventListener('change',()=>{countrySearch.value=countryFilter.value==='all'?'':countryFilter.value;renderVolatility()});
document.querySelectorAll('[data-horizon]').forEach(button=>button.addEventListener('click',()=>{if(selectedCountry)renderCountryDetail(selectedCountry);renderVolatility()}));
renderVolatility();
