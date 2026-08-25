const modal=document.querySelector('#modal'),run=document.querySelector('#run');
const METRICS_API='https://nostradomus-live-api.onrender.com/api/codex-metrics';
function ensureCharts(){
  const grid=document.querySelector('.grid');
  grid.querySelectorAll('.signal-chart').forEach(chart=>chart.remove());
  grid.insertAdjacentHTML('afterbegin','<article class="panel chart signal-chart"><p>CIVIL UNREST REPORTING · 30 DAYS</p><svg id="civil-chart" viewBox="0 0 580 220" role="img" aria-label="Civil unrest reporting coverage over 30 days"></svg></article><article class="panel chart signal-chart"><p>MILITARY ESCALATION REPORTING · 30 DAYS</p><svg id="military-chart" viewBox="0 0 580 220" role="img" aria-label="Military escalation reporting coverage over 30 days"></svg></article><article class="panel chart signal-chart"><p>INTERPRETIVE GEMATRIA OVERLAY · NOT A RISK MEASURE</p><svg id="gematria-chart" viewBox="0 0 580 220" role="img" aria-label="Interpretive gematria transformation of reporting values"></svg></article>');
}
function drawChart(id,series,color){
  const svg=document.querySelector('#'+id);
  const values=series.map(point=>point.value);
  const max=Math.max(...values,0.01);
  const points=values.map((value,index)=>(20+(index*540/Math.max(1,values.length-1))).toFixed(1)+','+(190-(value/max)*150).toFixed(1)).join(' ');
  svg.innerHTML='<path d="M20 190H560" stroke="#24445b"/><polyline points="'+points+'" fill="none" stroke="'+color+'" stroke-width="4"/>'+points.split(' ').map(point=>'<circle cx="'+point.split(',')[0]+'" cy="'+point.split(',')[1]+'" r="3.5" fill="'+color+'"/>').join('')+'<text x="20" y="210" fill="#8da7b9" font-size="11">30-day reporting timeline · GDELT coverage share</text>';
}
function digitSum(value){return String(Math.abs(value)).split('').reduce((sum,digit)=>sum+Number(digit),0)}
function renderMetrics(data){
  const civil=data.civil||[],military=data.military||[];
  if(!civil.length||!military.length)throw Error('No reporting timeline returned');
  const count=Math.min(civil.length,military.length);
  const paired=Array.from({length:count},(_,index)=>({civil:civil[civil.length-count+index].value,military:military[military.length-count+index].value}));
  const gematria=paired.map(point=>({value:Math.min(100,digitSum(Math.round((point.civil+point.military)*1000))*11.11)}));
  ensureCharts();
  drawChart('civil-chart',paired.map(point=>({value:point.civil})),'#35e6ff');
  drawChart('military-chart',paired.map(point=>({value:point.military})),'#ff49c3');
  drawChart('gematria-chart',gematria,'#b783ff');
  const civilLatest=paired[paired.length-1].civil,militaryLatest=paired[paired.length-1].military,gematriaLatest=Math.round(gematria[gematria.length-1].value);
  const cards=document.querySelectorAll('.metrics article');
  const labels=['CIVIL UNREST COVERAGE','MILITARY COVERAGE','GEMATRIA OVERLAY','OBSERVATION DAYS'];
  const values=[civilLatest.toFixed(2),militaryLatest.toFixed(2),gematriaLatest,String(count)];
  const units=['% of GDELT coverage','% of GDELT coverage','interpretive score','reported days'];
  cards.forEach((card,index)=>{card.querySelector('span').textContent=labels[index];card.querySelector('strong').textContent=values[index];card.querySelector('em').textContent=units[index]});
  const bars=document.querySelectorAll('.bars div');
  const barValues=[Math.min(100,civilLatest*20),Math.min(100,militaryLatest*20),gematriaLatest];
  ['Civil reporting signal','Military reporting signal','Gematria overlay'].forEach((label,index)=>{bars[index].querySelector('span').textContent=label;bars[index].querySelector('i').style.width=barValues[index]+'%';bars[index].querySelector('b').textContent=Math.round(barValues[index])});
  document.querySelector('.equation').innerHTML='<b>OBSERVED CIVIL + MILITARY</b><strong>'+Math.round((civilLatest+militaryLatest)*100)+'</strong><i>↔</i><b>INTERPRETIVE DIGIT REDUCTION</b><strong>'+gematriaLatest+'</strong>';
}
const fipsToState={1:'AL',2:'AK',4:'AZ',5:'AR',6:'CA',8:'CO',9:'CT',10:'DE',11:'DC',12:'FL',13:'GA',15:'HI',16:'ID',17:'IL',18:'IN',19:'IA',20:'KS',21:'KY',22:'LA',23:'ME',24:'MD',25:'MA',26:'MI',27:'MN',28:'MS',29:'MO',30:'MT',31:'NE',32:'NV',33:'NH',34:'NJ',35:'NM',36:'NY',37:'NC',38:'ND',39:'OH',40:'OK',41:'OR',42:'PA',44:'RI',45:'SC',46:'SD',47:'TN',48:'TX',49:'UT',50:'VT',51:'VA',53:'WA',54:'WV',55:'WI',56:'WY',60:'AS',66:'GU',69:'MP',72:'PR',78:'VI'};
function ensureWaterPanel(){if(document.querySelector('#water-panel'))return;document.querySelector('.grid').insertAdjacentHTML('beforeend','<article id="water-panel" class="panel chart water-panel"><p>U.S. DRINKING-WATER COMPLIANCE FINDINGS - EPA SDWIS</p><div class="water-toolbar"><label>Violation category <select id="water-category"></select></label><output id="water-selection">Loading quarterly EPA extract...</output></div><svg id="water-map" viewBox="0 0 975 610" role="img" aria-label="United States map showing selected drinking-water compliance violation records by state"></svg><p id="water-note" class="water-note"></p></article>')}
function loadScript(source){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=source;script.onload=resolve;script.onerror=reject;document.head.append(script)})}
async function renderWaterMap(){
  ensureWaterPanel();
  const water=await fetch('data/us-water-compliance.json').then(response=>{if(!response.ok)throw Error('Water data unavailable');return response.json()});
  if(!window.topojson)await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
  if(!window.d3)await loadScript('https://cdn.jsdelivr.net/npm/d3-geo@3/dist/d3-geo.min.js');
  const select=document.querySelector('#water-category');select.innerHTML=Object.entries(water.categories).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('');
  const stateData=new Map(water.states.map(state=>[state.code,state])),svg=document.querySelector('#water-map'),note=document.querySelector('#water-note'),selection=document.querySelector('#water-selection');
  const topology=await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(response=>{if(!response.ok)throw Error('Map geometry unavailable');return response.json()});
  const states=topojson.feature(topology,topology.objects.states).features.filter(feature=>fipsToState[Number(feature.id)]),path=d3.geoPath();
  function draw(){const category=select.value,maximum=Math.max(...water.states.map(state=>state[category]),1);svg.innerHTML=states.map(feature=>{const code=fipsToState[Number(feature.id)],state=stateData.get(code),value=state?state[category]:0,opacity=.16+.84*Math.sqrt(value/maximum);return '<path data-code="'+code+'" d="'+path(feature)+'" fill="'+(value?'#ff3fbd':'#183047')+'" fill-opacity="'+opacity.toFixed(2)+'" stroke="#42dff8" stroke-opacity=".58"><title>'+state.name+': '+value+' reported record'+(value===1?'':'s')+'</title></path>'}).join('');note.textContent=water.coverageNote+' Extract: '+water.asOf+'. Source: EPA SDWIS public download.';selection.textContent='Select a state for its reported-record count.';svg.querySelectorAll('path').forEach(element=>element.addEventListener('click',()=>{const state=stateData.get(element.dataset.code),value=state[category];selection.textContent=state.name+': '+value+' '+water.categories[category].toLowerCase()+' record'+(value===1?'':'s')+' in '+water.asOf+'.'}))}
  select.addEventListener('change',draw);draw();
}
async function execute(){
  modal.hidden=false;
  modal.querySelector('.progress i').style.width='100%';
  document.querySelector('#modal-copy').textContent='Retrieving 30-day public reporting timelines…';
  try{
    const response=await fetch(METRICS_API);
    if(!response.ok)throw Error('Metrics service unavailable');
    renderMetrics(await response.json());
    renderWaterMap().catch(()=>{ensureWaterPanel();document.querySelector('#water-selection').textContent='EPA map data is temporarily unavailable.'});
    document.querySelector('#empty').hidden=true;
    document.querySelector('#results').hidden=false;
    modal.hidden=true;
  }catch{
    modal.hidden=true;
    document.querySelector('#empty h2').textContent='Reporting timelines temporarily unavailable';
    document.querySelector('#empty p').textContent='The public-source timeline did not return a complete result. Run The Codex again in a moment.';
  }
}
run.addEventListener('click',execute);
document.querySelector('#rerun').addEventListener('click',execute);
