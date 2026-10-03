'use strict';
const assert=require('node:assert/strict');
const {FEEDS,parseFeed,parseNoaa,createIntelligence}=require('../intelligence');
const {assess,freshness}=require('../public/outlook-engine');
const now=Date.parse('2026-10-03T12:00:00Z');
const rss='<rss><channel><item><title><![CDATA[Vaccine trial &amp; results]]></title><link>https://example.com/trial</link><pubDate>Fri, 02 Oct 2026 12:00:00 GMT</pubDate></item><item><title>Bad</title><link>javascript:alert(1)</link></item></channel></rss>';
assert.equal(parseFeed(rss,FEEDS[0],new Date(now).toISOString()).length,1);
assert.equal(parseFeed(rss,FEEDS[0],'now')[0].title,'Vaccine trial & results');
assert.throws(()=>parseFeed('<html>blocked</html>',FEEDS[0],'now'));
assert.equal(parseFeed('<feed><entry><title>Test</title><link href="https://example.com/atom"/><updated>2026-10-02T12:00:00Z</updated></entry></feed>',FEEDS[0],'now')[0].url,'https://example.com/atom');
assert.equal(freshness(null,now),'Date unknown');
assert.equal(freshness('2025-01-01',now),'Older than 30 days');
assert.equal(freshness('2026-10-02',now),'Past 7 days');
assert.equal(freshness('2027-01-01',now),'Future-dated');
const sample=(title,sourceFamily,url,published='2026-10-02T12:00:00Z')=>({title,source:sourceFamily,sourceFamily,url,published});
const rows=assess({articles:[
  sample('Cholera outbreak spreads in coastal district','WHO','https://example.com/a'),
  sample('Cholera outbreak spreads in coastal district','BBC','https://example.com/b'),
  sample('Cholera outbreak spreads in coastal district','BBC','https://example.com/c'),
  sample('Cholera outbreak spreads in coastal district','UN','https://example.com/old','2020-01-01'),
  sample('Cholera cases declining after treatment','WHO','https://example.com/d'),
  sample('Award ceremony celebrates research','BBC','https://example.com/award')
]},[],now);
assert.equal(rows.find(r=>r.id==='health').corroborationCandidates.length,2,'Same-family articles and stale items must not establish corroboration');
assert.equal(rows.find(r=>r.id==='health').mixedSignals,true);
assert.equal(rows.find(r=>r.id==='conflict').evidence.length,0,'war must not match award');
const bulletin=parseNoaa([{product_id:'A',issue_datetime:'2026-10-02 12:00:00.000',message:'Header\nALERT: Geomagnetic storm'}],FEEDS.at(-1),'now')[0];
assert.equal(bulletin.published,'2026-10-02T12:00:00.000Z');
(async()=>{
  let clock=now,fail=false,calls=0;
  const get=createIntelligence(async url=>{calls++;if(fail)throw Error('Offline');return {ok:true,text:async()=>rss,json:async()=>[{product_id:'A',issue_datetime:'2026-10-02 12:00:00.000',message:'ALERT: Geomagnetic storm'}]};},()=>clock);
  const [first,concurrent]=await Promise.all([get(),get()]);
  assert.equal(calls,FEEDS.length,'Concurrent requests must share one collection');
  assert.equal(first,concurrent);assert.equal(first.sources.every(s=>s.status==='available'),true);
  assert.equal((await get()).cached,true);assert.equal(calls,FEEDS.length);
  clock+=16*60*1000;fail=true;const retained=await get();
  assert.ok(retained.sources.every(s=>s.status==='retained'));
  assert.equal(retained.articles[0].retrievedAt,first.articles[0].retrievedAt,'Retained evidence must preserve its original retrieval time');
  assert.ok(retained.articles.every(a=>a.retained));
  const outage=await createIntelligence(async()=>{throw Error('Offline');},()=>clock)();
  assert.equal(outage.articles.length,0);assert.ok(outage.sources.every(s=>s.status==='unavailable'));
  console.log('Phase-two checks passed: RSS/Atom parsing, unsafe links, source-family independence, freshness, mixed signals, caching, single-flight collection, and outages.');
})().catch(error=>{console.error(error);process.exitCode=1;});
