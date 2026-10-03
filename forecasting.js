'use strict';
const DAY=86400000;
const iso=time=>new Date(time).toISOString();
const probability=(count,days,horizon)=>1-Math.pow(days/(days+horizon),count+.5);
const brier=trials=>trials.reduce((sum,t)=>sum+(t.probability-t.outcome)**2,0)/trials.length;
function earthquakeForecast(features,{threshold,horizon,start,end,url}) {
  const events=features.filter(f=>Number.isFinite(f.properties?.mag)&&f.properties.mag>=threshold&&Number.isFinite(f.properties?.time)&&f.properties.time>=start&&f.properties.time<end);
  const split=end-730*DAY;
  const trainCount=events.filter(e=>e.properties.time<split).length;
  const trainDays=(split-start)/DAY;
  if(trainDays<365)throw Error('Insufficient earthquake history');
  const heldProbability=probability(trainCount,trainDays,horizon),trials=[];
  for(let t=split;t+horizon*DAY<=end;t+=horizon*DAY){const finish=t+horizon*DAY;trials.push({start:iso(t),end:iso(finish),probability:heldProbability,outcome:Number(events.some(e=>e.properties.time>=t&&e.properties.time<finish))});}
  const totalDays=(end-start)/DAY;
  return {id:`earthquake-m${threshold}`,kind:'risk',title:`At least one M${threshold}+ earthquake worldwide`,probability:probability(events.length,totalDays,horizon),windowStart:iso(end),windowEnd:iso(end+horizon*DAY),resolutionRule:`Resolves YES if the USGS catalog records at least one earthquake worldwide with magnitude >= ${threshold} and origin time in [window start, window end). Catalog revisions may change the outcome.`,method:'Gamma-Poisson historical frequency baseline (Jeffreys rate prior)',formula:'P(at least one) = 1 - (observed days / (observed days + forecast days))^(event count + 0.5)',baseline:{events:events.length,observedDays:totalDays,start:iso(start),end:iso(end),horizonDays:horizon},validation:{trainingEnd:iso(split),trainingEvents:trainCount,trainingDays:trainDays,windows:trials.length,brier:brier(trials),observedFrequency:trials.reduce((n,t)=>n+t.outcome,0)/trials.length,trials},source:{name:'USGS earthquake catalog',url},limitations:'A worldwide occurrence estimate, not a location, impact, or casualty prediction. Assumes a stationary rate; earthquakes cluster and catalog magnitudes are revised. Backtest is retrospective and does not establish prospective calibration.'};
}
function growthForecast(rows,{positive,url,now}) {
  const history=rows.filter(r=>Number.isFinite(r.value)&&/^\d{4}$/.test(r.date)&&Number(r.date)<new Date(now).getUTCFullYear()).sort((a,b)=>Number(a.date)-Number(b.date));
  if(history.length<30)throw Error('Insufficient annual growth history');
  const latest=Number(history.at(-1).date),target=latest+1;
  if(target<new Date(now).getUTCFullYear())throw Error('Annual growth data too old for the current forecast year');
  const predicate=value=>positive?value>3:value<0;
  const train=history.slice(0,-15),test=history.slice(-15),trainCount=train.filter(r=>predicate(r.value)).length;
  const heldProbability=(trainCount+1)/(train.length+2),events=history.filter(r=>predicate(r.value)).length;
  const trials=test.map(r=>({year:Number(r.date),probability:heldProbability,outcome:Number(predicate(r.value)),observedGrowth:r.value}));
  return {id:positive?'global-growth':'global-contraction',kind:positive?'triumph':'risk',title:positive?`World GDP growth exceeds 3% in ${target}`:`World GDP contracts in ${target}`,probability:(events+1)/(history.length+2),windowStart:`${target}-01-01T00:00:00.000Z`,windowEnd:`${target+1}-01-01T00:00:00.000Z`,resolutionRule:`Resolves YES if World Bank WDI indicator NY.GDP.MKTP.KD.ZG for WLD in ${target} is ${positive?'strictly greater than 3':'strictly below 0'} percent. Resolution waits for publication; later data revisions are possible.`,method:'Beta-Bernoulli annual frequency baseline (uniform Beta(1,1) prior)',formula:'P(event next year) = (historical event years + 1) / (observed years + 2)',baseline:{events,observedYears:history.length,startYear:Number(history[0].date),endYear:latest,threshold:positive?'>3%':'<0%'},validation:{trainingEndYear:Number(train.at(-1).date),trainingYears:train.length,trainingEvents:trainCount,windows:trials.length,brier:brier(trials),observedFrequency:trials.reduce((n,t)=>n+t.outcome,0)/trials.length,trials},source:{name:'World Bank WDI',url},limitations:'An unconditional annual baseline, not a macroeconomic nowcast. Historical observations use current revised data, not the data vintage available at each past prediction date. Growth above 3% does not establish equitable gains, peace, or ecological recovery.'};
}
function createForecasts(fetcher=fetch,clock=()=>Date.now()) {
  let cache=null,pending=null;
  async function collect(){
    const now=clock(),end=now,startDate=new Date(end);startDate.setUTCFullYear(startDate.getUTCFullYear()-10);const start=startDate.getTime();
    const quakeUrl='https://earthquake.usgs.gov/fdsnws/event/1/query?'+new URLSearchParams({format:'geojson',starttime:iso(start),endtime:iso(end),minmagnitude:'7',eventtype:'earthquake',orderby:'time-asc',limit:'20000'});
    const growthUrl='https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=100';
    const get=async url=>{const response=await fetcher(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`HTTP ${response.status}`);return response.json();};
    const results=await Promise.allSettled([get(quakeUrl),get(growthUrl)]),forecasts=[],sources=[];
    for(let i=0;i<results.length;i++){
      const result=results[i],name=i?'World Bank':'USGS',url=i?growthUrl:quakeUrl;
      try{if(result.status!=='fulfilled')throw result.reason;
        if(i){if(!Array.isArray(result.value[1]))throw Error('Invalid growth response');forecasts.push(growthForecast(result.value[1],{positive:false,url,now}),growthForecast(result.value[1],{positive:true,url,now}));}
        else {if(!Array.isArray(result.value.features)||result.value.features.length===0||result.value.features.length>=20000)throw Error('Incomplete earthquake history');forecasts.push(earthquakeForecast(result.value.features,{threshold:7,horizon:30,start,end,url}),earthquakeForecast(result.value.features,{threshold:8,horizon:90,start,end,url}));}
        sources.push({name,url,status:'available'});
      }catch(error){sources.push({name,url,status:'unavailable',error:error.message});}
    }
    const body={version:'earth-phase3',modelVersion:'historical-baselines-v1',generatedAt:iso(now),cached:false,forecasts,sources,methodology:'Four fixed, resolvable event definitions. Historical-frequency probabilities; chronological holdout evaluation uses observations excluded from training. Final forecasts refit all available history. No claim of predictive skill beyond historical baselines; no paid AI.'};cache={at:now,body};return body;
  }
  return async()=>{if(cache&&clock()-cache.at<(cache.body.forecasts.length===4?6*60*60*1000:5*60*1000))return {...cache.body,cached:true};if(!pending)pending=collect().finally(()=>{pending=null;});return pending;};
}
module.exports={probability,brier,earthquakeForecast,growthForecast,createForecasts};
