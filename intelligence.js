'use strict';
const FEEDS = [
  ['bbc-world','BBC World','BBC','Conflict & society','https://feeds.bbci.co.uk/news/world/rss.xml'],
  ['bbc-health','BBC Health','BBC','Health & medicine','https://feeds.bbci.co.uk/news/health/rss.xml'],
  ['bbc-science','BBC Science & Environment','BBC','Climate & science','https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'],
  ['who','World Health Organization','WHO','Health & outbreaks','https://www.who.int/rss-feeds/news-english.xml'],
  ['un','UN News','United Nations','Humanitarian & diplomacy','https://news.un.org/feed/subscribe/en/news/all/rss.xml'],
  ['nasa','NASA News','NASA','Science & technology','https://www.nasa.gov/rss/dyn/breaking_news.rss'],
  ['earth-observatory','NASA Earth Observatory','NASA','Climate & environment','https://earthobservatory.nasa.gov/feeds/earth-observatory.rss'],
  ['energy','US Department of Energy','US DOE','Energy & innovation','https://www.energy.gov/rss.xml'],
  ['science','Science / AAAS','AAAS','Research & discovery','https://www.science.org/rss/news_current.xml'],
  ['noaa','NOAA Space Weather','NOAA','Space weather','https://services.swpc.noaa.gov/products/alerts.json','noaa']
].map(([id,name,family,domain,url,format])=>({id,name,family,domain,url,format:format||'rss'}));
function clean(value='') {
  return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g,e=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '}[e])).replace(/\s+/g,' ').trim();
}
function safeUrl(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}}
function field(xml,names){for(const name of names){const match=xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`,'i'));if(match)return clean(match[1]);}return '';}
function parseFeed(xml,feed,retrievedAt) {
  if(!/<(?:rss|rdf:RDF|feed)[\s>]/i.test(xml)||/<html[\s>]/i.test(xml))throw Error('Response is not an RSS/Atom feed');
  return [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].slice(0,30).flatMap(([, ,item])=>{
    const title=field(item,['title']);const atom=item.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    const url=safeUrl(field(item,['link'])||atom?.[1]);if(!title||!url)return [];
    const raw=field(item,['pubDate','dc:date','published','updated']);const time=Date.parse(raw);
    return [{title,url,source:feed.name,sourceFamily:feed.family,sourceId:feed.id,published:Number.isFinite(time)?new Date(time).toISOString():null,retrievedAt,type:'Source publication'}];
  });
}
function parseNoaa(data,feed,retrievedAt){if(!Array.isArray(data))throw Error('Invalid NOAA response');return data.slice(0,25).map(item=>{
  const lines=String(item.message||'').split('\n');const title=lines.find(line=>/^(ALERT|WARNING|WATCH|SUMMARY):/i.test(line.trim()))||lines.find(line=>/geomagnetic|solar|radio blackout/i.test(line))||`Space-weather bulletin ${item.product_id}`;
  const time=Date.parse(String(item.issue_datetime||'').replace(' ','T')+'Z');
  return {title:clean(title),url:'https://www.swpc.noaa.gov/products/alerts-watches-and-warnings',source:feed.name,sourceFamily:feed.family,sourceId:feed.id,published:Number.isFinite(time)?new Date(time).toISOString():null,retrievedAt,type:'Official bulletin',bulletinId:item.product_id};
});}
function createIntelligence(fetcher=fetch,now=()=>Date.now()) {
  let cached=null,pending=null;const previous=new Map();const ttl=15*60*1000;
  async function collect(){
    const retrievedAt=new Date(now()).toISOString();
    const results=await Promise.all(FEEDS.map(async feed=>{
      try{
        const response=await fetcher(feed.url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Nostradomus/0.2 (public-source intelligence)'}});
        if(!response.ok)throw Error(`HTTP ${response.status}`);
        const articles=feed.format==='noaa'?parseNoaa(await response.json(),feed,retrievedAt):parseFeed(await response.text(),feed,retrievedAt);
        if(!articles.length)throw Error('No usable entries returned');
        const unique=[...new Map(articles.map(a=>[a.url+'|'+a.title,a])).values()];previous.set(feed.id,{articles:unique,at:retrievedAt});
        return {...feed,status:'available',attemptedAt:retrievedAt,lastSuccessAt:retrievedAt,articles:unique};
      }catch(error){const old=previous.get(feed.id);return {...feed,status:old?'retained':'unavailable',attemptedAt:retrievedAt,lastSuccessAt:old?.at||null,error:error.name==='TimeoutError'?'Source timed out':error.message,articles:old?.articles.map(a=>({...a,retained:true}))||[]};}
    }));
    const articles=results.flatMap(r=>r.articles);const sources=results.map(({articles,...source})=>({...source,count:articles.length,newestPublishedAt:articles.map(a=>a.published).filter(Boolean).sort().at(-1)||null}));
    cached={at:now(),body:{version:'earth-phase2',retrievedAt,cached:false,articles,sources,methodology:'Public publications and official bulletins; publication times differ from retrieval times. Retained entries preserve original timestamps. No paid AI services.'}};return cached.body;
  }
  return async function getIntelligence(){if(cached && now()-cached.at<ttl)return {...cached.body,cached:true};if(!pending)pending=collect().finally(()=>{pending=null;});return pending;};
}
module.exports={FEEDS,clean,parseFeed,parseNoaa,createIntelligence};
