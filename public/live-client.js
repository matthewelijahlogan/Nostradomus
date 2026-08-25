const LIVE_API = 'https://nostradomus-live-api.onrender.com/api/brief';
async function loadExternalLive() {
  const state = document.querySelector('#live-state');
  const content = document.querySelector('#live-content');
  state.textContent = 'Retrieving public source material…';
  try {
    const response = await fetch(LIVE_API);
    if (!response.ok) throw new Error('Source service unavailable');
    const data = await response.json();
    state.textContent = `Retrieved ${new Date(data.retrievedAt).toLocaleString()}${data.cached ? ' · cached up to 10 minutes' : ''}`;
    const articles = data.articles.length ? data.articles.map(article => `<a class="headline" href="${article.url}" target="_blank" rel="noopener"><span>${article.source} · ${article.published}</span>${article.title}</a>`).join('') : 'No reporting items were returned.';
    const macro = data.macro ? `<h3>${data.macro.value.toFixed(2)}%</h3><p>${data.macro.label} · ${data.macro.year}</p>` : '';
    const quakes = data.quakes.length ? `<p><b>USGS significant earthquakes, past day</b></p><ul>${data.quakes.map(quake => `<li>M${quake.mag} — ${quake.place}</li>`).join('')}</ul>` : '<p>No significant USGS earthquakes reported in the past day.</p>';
    content.innerHTML = `<div class="headline-list">${articles}</div><div class="signal-box">${macro}${quakes}</div><div class="source-row">${data.sources.map(source => `<a href="${source.url}" target="_blank" rel="noopener">${source.name} · ${source.status}</a>`).join('')}</div>`;
  } catch {
    state.textContent = 'Live-source retrieval is temporarily unavailable. Retry in a moment.';
    content.innerHTML = '';
  }
}
const oldRefresh = document.querySelector('#refresh-live');
const refresh = oldRefresh.cloneNode(true);
oldRefresh.replaceWith(refresh);
refresh.addEventListener('click', loadExternalLive);
loadExternalLive();
