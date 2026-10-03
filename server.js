const http = require('http');
const fs = require('fs');
const path = require('path');
const getIntelligence = require('./intelligence').createIntelligence();
const getForecasts = require('./forecasting').createForecasts();

const PORT = process.env.PORT || 10000;
const PUBLIC = path.join(__dirname, 'public');
const CACHE_MS = 10 * 60 * 1000;
let cache = { at: 0, body: null };
const COUNTRY_CACHE_MS = 24 * 60 * 60 * 1000;
let countryCache = { at: 0, body: null };
const METRICS_CACHE_MS = 15 * 60 * 1000;
let metricsCache = { at: 0, body: null };

const decode = (value = '') => value.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
async function getEarthquakeOutlook(feature) {
  if (!feature?.geometry?.coordinates) return null;
  const [longitude, latitude] = feature.geometry.coordinates;
  const end = new Date(), start = new Date(end); start.setUTCDate(start.getUTCDate() - 365);
  const query = new URLSearchParams({ format: 'geojson', starttime: start.toISOString().slice(0, 10), endtime: end.toISOString().slice(0, 10), latitude, longitude, maxradiuskm: '150', minmagnitude: '4.5', orderby: 'time' });
  const response = await fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?' + query);
  if (!response.ok) throw Error(`USGS outlook ${response.status}`);
  const history = await response.json();
  const events = history.features?.length || 0;
  const probability = Math.round(100 * (1 - Math.exp(-(events / 365) * 30)));
  const windowEnd = new Date(end); windowEnd.setUTCDate(windowEnd.getUTCDate() + 30);
  return { location: feature.properties?.place || 'USGS reference region', threshold: 'M4.5+', events, days: 365, windowEnd: windowEnd.toISOString(), probability, methodology: 'Historical-rate frequency model for the next 30 days within 150 km; not an earthquake prediction.' };
}
async function getInterstellarOutlook() {
  const response = await fetch('https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B365&dist-max=0.05&sort=dist&limit=1&diameter=true&fullname=true');
  if (!response.ok) throw Error(`NASA/JPL close approach ${response.status}`);
  const data = await response.json();
  if (!data.data?.length) return { status: 'NO CLOSE APPROACHES IN QUERY WINDOW' };
  const row = data.data[0], index = Object.fromEntries(data.fields.map((field, position) => [field, position]));
  const distanceAu = Number(row[index.dist]);
  return { status: 'KNOWN CLOSE FLYBY', object: String(row[index.fullname] || row[index.des]).trim(), date: row[index.cd], distanceAu, lunarDistances: Math.round(distanceAu * 389.17), diameterKm: row[index.diameter] == null ? null : Number(row[index.diameter]), source: 'NASA/JPL SBDB Close Approach Data API', methodology: 'Known nominal close-approach trajectory, not an impact prediction.' };
}
const rssItems = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(([, item]) => ({
  title: decode((item.match(/<title>([\s\S]*?)<\/title>/) || [, 'Untitled'])[1]).trim(),
  url: decode((item.match(/<link>([\s\S]*?)<\/link>/) || [, ''])[1]).trim(),
  published: decode((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [, ''])[1]).trim(),
  source: 'BBC News — World'
}));

async function getLiveBrief() {
  if (cache.body && Date.now() - cache.at < CACHE_MS) return { ...cache.body, cached: true };
  const retrievedAt = new Date().toISOString();
  const [newsResult, quakeResult, macroResult, interstellarResult] = await Promise.allSettled([
    fetch('https://feeds.bbci.co.uk/news/world/rss.xml', { headers: { 'User-Agent': 'Nostradomus/0.1 public-source monitor' } }).then(r => { if (!r.ok) throw Error(`BBC ${r.status}`); return r.text(); }),
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson').then(r => { if (!r.ok) throw Error(`USGS ${r.status}`); return r.json(); }),
    fetch('https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=4').then(r => { if (!r.ok) throw Error(`World Bank ${r.status}`); return r.json(); }),
    getInterstellarOutlook()
  ]);
  const articles = newsResult.status === 'fulfilled' ? rssItems(newsResult.value) : [];
  const quakeFeatures = quakeResult.status === 'fulfilled' ? quakeResult.value.features.filter(feature => feature.properties?.mag != null).slice(0, 5) : [];
  const quakes = quakeFeatures.map(feature => feature.properties);
  let earthquakeOutlook = null;
  if (quakeFeatures[0]) { try { earthquakeOutlook = await getEarthquakeOutlook(quakeFeatures[0]); } catch {} }
  const record = macroResult.status === 'fulfilled' ? (macroResult.value[1] || []).find(x => x.value != null) : null;
  const body = {
    retrievedAt, cached: false, articles, quakes, earthquakeOutlook, interstellarOutlook: interstellarResult.status === 'fulfilled' ? interstellarResult.value : null,
    macro: record ? { label: 'World GDP growth (annual %)', value: record.value, year: record.date, source: 'World Bank World Development Indicators' } : null,
    sources: [
      { name: 'BBC News — World RSS', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', status: newsResult.status },
      { name: 'USGS Significant Earthquakes, Past Day', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson', status: quakeResult.status },
      { name: 'USGS Earthquake Catalog', url: 'https://earthquake.usgs.gov/fdsnws/event/1/', status: earthquakeOutlook ? 'fulfilled' : 'unavailable' },
      { name: 'NASA/JPL SBDB Close Approach Data API', url: 'https://ssd-api.jpl.nasa.gov/cad.api', status: interstellarResult.status },
      { name: 'World Bank Indicators API', url: 'https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json', status: macroResult.status }
    ]
  };
  cache = { at: Date.now(), body };
  return body;
}

function recentRows(rows = []) {
  return rows.filter(row => row.value != null).sort((a, b) => Number(b.date) - Number(a.date));
}
async function getSignalTimeline(query) {
  const endpoint = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(query) + '&mode=timelinevol&format=json&timespan=30d';
  const response = await fetch(endpoint);
  if (!response.ok) throw Error('GDELT timeline request failed');
  const data = await response.json();
  return data.timeline?.[0]?.data || [];
}
async function getCodexMetrics() {
  if (metricsCache.body && Date.now() - metricsCache.at < METRICS_CACHE_MS) return { ...metricsCache.body, cached: true };
  const [civilResult, militaryResult] = await Promise.allSettled([
    getSignalTimeline('(protest OR riot OR demonstration)'),
    getSignalTimeline('(military OR missile OR airstrike OR "armed conflict")')
  ]);
  const body = { retrievedAt: new Date().toISOString(), cached: false, civil: civilResult.status === 'fulfilled' ? civilResult.value : [], military: militaryResult.status === 'fulfilled' ? militaryResult.value : [], source: { name: 'GDELT DOC 2.0', url: 'https://api.gdeltproject.org/api/v2/doc/doc', civilStatus: civilResult.status, militaryStatus: militaryResult.status } };
  metricsCache = { at: Date.now(), body };
  return body;
}
async function getCountryVolatility() {
  if (countryCache.body && Date.now() - countryCache.at < COUNTRY_CACHE_MS) return { ...countryCache.body, cached: true };
  const [countriesResult, indicatorsResult] = await Promise.all([
    fetch('https://api.worldbank.org/v2/country?format=json&per_page=400').then(r => { if (!r.ok) throw Error('World Bank country request failed'); return r.json(); }),
    fetch('https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG;FP.CPI.TOTL.ZG?format=json&date=2020:2025&per_page=20000&source=2').then(r => { if (!r.ok) throw Error('World Bank indicator request failed'); return r.json(); })
  ]);
  const countries = (countriesResult[1] || []).filter(country => country.region?.id !== 'NA' && country.id);
  const countryByIso = new Map(countries.map(country => [country.id, country]));
  const history = new Map();
  for (const row of indicatorsResult[1] || []) {
    if (!countryByIso.has(row.countryiso3code)) continue;
    const record = history.get(row.countryiso3code) || { growth: [], inflation: [] };
    if (row.indicator?.id === 'NY.GDP.MKTP.KD.ZG') record.growth.push(row);
    if (row.indicator?.id === 'FP.CPI.TOTL.ZG') record.inflation.push(row);
    history.set(row.countryiso3code, record);
  }
  const profiles = countries.map(country => {
    const record = history.get(country.id) || {};
    const growth = recentRows(record.growth);
    const inflation = recentRows(record.inflation);
    const latestGrowth = growth[0], priorGrowth = growth[1], latestInflation = inflation[0];
    if (!latestGrowth || !priorGrowth || !latestInflation) return { name: country.name, iso3: country.id, region: country.region.value.trim(), score: null, reason: 'Insufficient recent World Bank observations' };
    const growthChange = Math.abs(latestGrowth.value - priorGrowth.value);
    return {
      name: country.name, iso3: country.id, region: country.region.value.trim(),
      score: Math.round(Math.min(100, Math.abs(latestInflation.value) * 2 + growthChange * 5)),
      inputs: { inflation: latestInflation.value, inflationYear: latestInflation.date, growth: latestGrowth.value, growthYear: latestGrowth.date, priorGrowth: priorGrowth.value, priorGrowthYear: priorGrowth.date, growthChange }
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const body = {
    retrievedAt: new Date().toISOString(), cached: false, countries: profiles,
    source: { name: 'World Bank World Development Indicators', url: 'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG;FP.CPI.TOTL.ZG?format=json&date=2020:2025&per_page=20000&source=2', updatedAt: indicatorsResult[0]?.lastupdated || null },
    methodology: 'Economic volatility index = min(100, 2 × absolute inflation rate + 5 × absolute year-over-year change in GDP growth).'
  };
  countryCache = { at: Date.now(), body };
  return body;
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/forecasts') {
    try { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify(await getForecasts())); }
    catch { res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify({ error: 'Forecast computation failed' })); }
    return;
  }
  if (url.pathname === '/api/intelligence') {
    try { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify(await getIntelligence())); }
    catch { res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify({ error: 'Intelligence retrieval failed' })); }
    return;
  }
  if (url.pathname === '/api/brief') {
    try { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify(await getLiveBrief())); }
    catch { res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify({ error: 'Live-source retrieval failed. Please retry shortly.' })); }
    return;
  }
  if (url.pathname === '/api/country-volatility') {
    try { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify(await getCountryVolatility())); }
    catch { res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify({ error: 'Country-volatility retrieval failed. Please retry shortly.' })); }
    return;
  }
  if (url.pathname === '/api/codex-metrics') {
    try { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=900', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify(await getCodexMetrics())); }
    catch { res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify({ error: 'Metrics retrieval failed. Please retry shortly.' })); }
    return;
  }
  if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); return; }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(PUBLIC, requested));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  });
});
server.listen(PORT, () => console.log(`Nostradomus listening on ${PORT}`));
