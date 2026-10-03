(function (root) {
  'use strict';
  // Watch conditions are hypotheses, not fitted probability models.
  const topics = [
    ['conflict','risk','War & escalation','0–90 days','Escalation could spread through retaliation, disrupted shipping, and energy markets.','military|missile|airstrike|invasion|war|ceasefire','Repeated strikes and widening participation','Sustained ceasefire and verified withdrawal','energy,food,displacement'],
    ['nuclear','risk','Nuclear escalation','0–90 days','A breakdown in strategic communication could increase escalation danger.','nuclear|uranium|atomic|arms control','Explicit doctrine changes or verified deployments','Restored arms-control talks and de-escalation','conflict,health'],
    ['climate','risk','Climate extremes','3–12 months','Persistent extremes could compound infrastructure damage and crop losses.','climate|flood|heatwave|wildfire|drought|hurricane','Multiple regions affected and repeated infrastructure failures','Improved preparedness and falling exposure','food,water,displacement'],
    ['food','risk','Food-system stress','3–12 months','Harvest losses and transport interruptions could increase food insecurity.','food|famine|grain|harvest|fertilizer|hunger','Rising staple prices alongside lower harvests','Recovering harvests and improved market access','health,unrest'],
    ['water','risk','Water insecurity','3–12 months','Drought and damaged water systems could intensify local shortages.','water|drought|reservoir|desalination','Falling reserves and worsening service interruptions','Refilled reservoirs and restored water services','food,health'],
    ['health','risk','Disease & health-system strain','0–90 days','Outbreak growth could overwhelm already strained health systems.','outbreak|epidemic|pandemic|virus|cholera|hospital','Verified case growth and constrained hospital capacity','Sustained case decline and effective containment','displacement,economy'],
    ['economy','risk','Debt & economic disruption','3–12 months','Weak growth and inflation could restrict fiscal space and household resilience.','debt|recession|inflation|default|bank|economy','Weakening growth, refinancing stress, and persistent inflation','Improved growth and easing inflation','unrest,food'],
    ['cyber','risk','Cyber & infrastructure failures','0–90 days','Coordinated attacks could interrupt critical services across connected systems.','cyber|ransomware|blackout|power grid|data breach','Confirmed attacks against multiple critical systems','Restored service and verified defensive remediation','economy,health'],
    ['displacement','risk','Displacement & humanitarian crisis','3–12 months','Conflict and environmental losses could force additional displacement.','refugee|displaced|migration|humanitarian','Growing displacement with shrinking aid access','Safe returns and restored humanitarian access','health,unrest'],
    ['unrest','risk','Institutional instability','0–90 days','Economic pressure and contested legitimacy could produce sustained unrest.','protest|riot|coup|unrest|demonstration','Repeated mobilization and institutional breakdown','Peaceful transitions and credible negotiated reform','conflict,economy'],
    ['earth','risk','Geophysical hazards','Continuous watch','Recorded seismic activity warrants preparedness; it does not determine the next earthquake.','earthquake|tsunami|volcano|eruption','Official hazard advisories and measured exposure','Officially reduced hazard or exposure','displacement,health'],
    ['space','risk','Space & planetary hazards','Known observation windows','Known close approaches require trajectory monitoring; a flyby alone is not an impact threat.','asteroid|solar storm|geomagnetic|space weather','Official impact-risk or geomagnetic-storm advisories','Refined trajectories excluding impact and reduced storm activity','cyber,energy'],
    ['peace','triumph','Peace & diplomatic breakthroughs','3–12 months','Durable agreements could reduce violence and reopen economic corridors.','peace|ceasefire|treaty|diplomacy|agreement','Implemented agreements and sustained reductions in violence','Renewed fighting or unimplemented commitments','conflict,economy'],
    ['energy','triumph','Clean-energy abundance','1–5 years','Expanding clean generation and storage could improve energy resilience.','renewable|solar|wind power|battery|clean energy|fusion','Commissioned capacity and verified cost reductions','Grid bottlenecks and delayed deployment','climate,economy'],
    ['medicine','triumph','Medical breakthroughs','1–5 years','Successful trials and accessible treatments could reduce disease burden.','vaccine|clinical trial|treatment|cure|medical breakthrough','Replicated trial results and wider treatment access','Failed replication or inaccessible treatment','health,economy'],
    ['science','triumph','Science & productive technology','1–5 years','Useful scientific and technological advances could improve productivity and resilience.','scientific|discovery|artificial intelligence|research|innovation','Independent validation and measured real-world benefits','Unreplicated claims and harmful deployment','medicine,energy,economy'],
    ['restoration','triumph','Ecological recovery','1–5 years','Restoration and conservation could rebuild local ecosystem resilience.','restoration|conservation|reforestation|biodiversity','Measured habitat recovery and sustained protection','Continuing habitat loss and reversed protection','climate,water,food'],
    ['society','triumph','Human flourishing','1–5 years','Expanded education, rights, and access to essential services could strengthen social resilience.','education|poverty|literacy|human rights|sanitation','Measured access gains and durable institutional reform','Exclusion and declining essential-service access','unrest,health,economy']
  ].map(([id,kind,title,window,hypothesis,pattern,strengthen,weaken,links]) => ({id,kind,title,window,hypothesis,pattern,strengthen,weaken,links:links.split(',')}));
  const safeUrl = value => {try {const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
  function freshness(date,now=Date.now()) {
    if(date==null||date==='')return 'Date unknown';
    const time=typeof date==='number'?date:Date.parse(date);
    if(!Number.isFinite(time))return 'Date unknown';
    const age=(now-time)/86400000;
    return age< -1?'Future-dated':age<=7?'Past 7 days':age<=30?'Past 30 days':'Older than 30 days';
  }
  function corroboration(evidence) {
    const stop=new Set('the a an of to in on for and with from by as is are new says said after at over amid could may report reports world global'.split(' '));
    const tokens=title=>new Set((title.toLowerCase().match(/[a-z]{3,}/g)||[]).filter(t=>!stop.has(t)));
    const pairs=[];
    for(let i=0;i<evidence.length;i++)for(let j=i+1;j<evidence.length;j++){
      const a=evidence[i],b=evidence[j];if((a.sourceFamily||a.source)===(b.sourceFamily||b.source))continue;
      if(!['Past 7 days','Past 30 days'].includes(a.freshness)||!['Past 7 days','Past 30 days'].includes(b.freshness))continue;
      const x=tokens(a.title),y=tokens(b.title),shared=[...x].filter(t=>y.has(t));
      if(shared.length>=3&&shared.length/new Set([...x,...y]).size>=.4)pairs.push({a:a.url,b:b.url,sources:[a.source,b.source],sharedTerms:shared});
    }
    return pairs.slice(0,5);
  }
  function assess(brief = {}, countries = [], now = Date.now()) {
    const articles = Array.isArray(brief.articles) ? brief.articles : [];
    return topics.map(topic => {
      const matcher = new RegExp(`\\b(?:${topic.pattern})\\b`,'i');
      const seen = new Set();
      const evidence = articles.filter(a => matcher.test(String(a.title))).flatMap(a => {
        const url=safeUrl(a.url);if(!url||seen.has(url))return [];seen.add(url);
        return [{title:String(a.title),url,source:String(a.source||'Public reporting'),sourceFamily:a.sourceFamily||(/^BBC\b/i.test(a.source||'')?'BBC':a.source)||'Public reporting',date:a.published||null,retrievedAt:a.retrievedAt||brief.retrievedAt||null,retained:!!a.retained,type:a.type||'Reporting mention'}];
      });
      if(topic.id==='earth') (brief.quakes||[]).forEach(q=>evidence.push({title:`Recorded M${q.mag} earthquake: ${q.place}`,url:safeUrl(q.url)||'https://earthquake.usgs.gov/',source:'USGS',date:q.time,type:'Measured observation'}));
      if(topic.id==='space' && brief.interstellarOutlook?.object) evidence.push({title:`Known flyby: ${brief.interstellarOutlook.object} — ${brief.interstellarOutlook.lunarDistances} lunar distances; not an impact prediction`,url:'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html',source:'NASA/JPL',date:brief.interstellarOutlook.date,type:'Trajectory observation'});
      if(topic.id==='economy' && Number.isFinite(brief.macro?.value)) evidence.push({title:`World GDP growth: ${brief.macro.value.toFixed(2)}% (${brief.macro.year})`,url:'https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG',source:'World Bank',date:brief.macro.year,type:'Annual indicator'});
      if(topic.id==='economy') countries.filter(c=>c.inputs && c.score!=null).sort((a,b)=>b.score-a.score).slice(0,3).forEach(c=>evidence.push({title:`${c.name}: inflation ${c.inputs.inflation.toFixed(1)}% (${c.inputs.inflationYear}); growth ${c.inputs.growth.toFixed(1)}% (${c.inputs.growthYear})`,url:`https://data.worldbank.org/country/${c.iso3}`,source:'World Bank',date:c.inputs.inflationYear,type:'Annual indicator'}));
      evidence.forEach(e=>{e.freshness=freshness(e.date,now);e.sourceFamily=e.sourceFamily||e.source;
        const improving=/\b(ceasefire|peace deal|declin\w*|easing|recover\w*|contained|eradicated|restored|breakthrough|approved|successful|improv\w*)\b/i.test(e.title);
        const worsening=/\b(escalat\w*|surge\w*|outbreak|crisis|attack\w*|fail\w*|collapse\w*|shortage\w*|worsen\w*|record high)\b/i.test(e.title);
        e.direction=improving&&worsening?'Mixed wording':improving?(topic.kind==='risk'?'Potential counter-signal':'Potential supporting signal'):worsening?(topic.kind==='risk'?'Potential supporting signal':'Potential counter-signal'):'Direction unclassified';
      });
      const sources = [...new Set(evidence.map(e=>e.sourceFamily))];
      const current=evidence.filter(e=>['Past 7 days','Past 30 days'].includes(e.freshness)&&!e.retained);
      const corroborationCandidates=corroboration(evidence);
      const mixed=evidence.some(e=>e.direction==='Potential supporting signal')&&evidence.some(e=>e.direction==='Potential counter-signal');
      return {...topic,evidence,sources,status:evidence.length?'Signals observed':'Evidence gap',coverage:sources.length>1?'Multiple source families':sources.length?'Single source family':'No matching evidence',currentCount:current.length,corroborationCandidates,mixedSignals:mixed};
    });
  }
  const api={topics,assess,safeUrl,freshness,corroboration};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.EarthOutlook=api;
})(typeof window!=='undefined'?window:globalThis);
