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
async function execute(){
  modal.hidden=false;
  modal.querySelector('.progress i').style.width='100%';
  document.querySelector('#modal-copy').textContent='Retrieving 30-day public reporting timelines…';
  try{
    const response=await fetch(METRICS_API);
    if(!response.ok)throw Error('Metrics service unavailable');
    renderMetrics(await response.json());
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
