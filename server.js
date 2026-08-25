const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const PUBLIC = path.join(__dirname, 'public');
const CACHE_MS = 10 * 60 * 1000;
let cache = { at: 0, body: null };

const decode = (value = '') => value.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const rssItems = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(([, item]) => ({
  title: decode((item.match(/<title>([\s\S]*?)<\/title>/) || [, 'Untitled'])[1]).trim(),
  url: decode((item.match(/<link>([\s\S]*?)<\/link>/) || [, ''])[1]).trim(),
  published: decode((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [, ''])[1]).trim(),
  source: 'BBC News — World'
}));

async function getLiveBrief() {
  if (cache.body && Date.now() - cache.at < CACHE_MS) return { ...cache.body, cached: true };
  const retrievedAt = new Date().toISOString();
  const [newsResult, quakeResult, macroResult] = await Promise.allSettled([
    fetch('https://feeds.bbci.co.uk/news/world/rss.xml', { headers: { 'User-Agent': 'Nostradomus/0.1 public-source monitor' } }).then(r => { if (!r.ok) throw Error(`BBC ${r.status}`); return r.text(); }),
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson').then(r => { if (!r.ok) throw Error(`USGS ${r.status}`); return r.json(); }),
    fetch('https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=4').then(r => { if (!r.ok) throw Error(`World Bank ${r.status}`); return r.json(); })
  ]);
  const articles = newsResult.status === 'fulfilled' ? rssItems(newsResult.value) : [];
  const quakes = quakeResult.status === 'fulfilled' ? quakeResult.value.features.map(f => f.properties).filter(q => q.mag != null).slice(0, 5) : [];
  const record = macroResult.status === 'fulfilled' ? (macroResult.value[1] || []).find(x => x.value != null) : null;
  const body = {
    retrievedAt, cached: false, articles, quakes,
    macro: record ? { label: 'World GDP growth (annual %)', value: record.value, year: record.date, source: 'World Bank World Development Indicators' } : null,
    sources: [
      { name: 'BBC News — World RSS', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', status: newsResult.status },
      { name: 'USGS Significant Earthquakes, Past Day', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson', status: quakeResult.status },
      { name: 'World Bank Indicators API', url: 'https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json', status: macroResult.status }
    ]
  };
  cache = { at: Date.now(), body };
  return body;
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/brief') {
    try { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify(await getLiveBrief())); }
    catch { res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://nostradomus.onrender.com' }); res.end(JSON.stringify({ error: 'Live-source retrieval failed. Please retry shortly.' })); }
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
