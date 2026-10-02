const assert = require('node:assert/strict');
const { assess, topics, safeUrl } = require('../public/outlook-engine');
assert.equal(topics.length, 18);
assert.equal(new Set(topics.map(t => t.id)).size, topics.length);
assert.ok(topics.every(t => t.links.every(id => topics.some(other => other.id === id))));
assert.ok(assess().every(t => t.status === 'Evidence gap' && t.evidence.length === 0));
const brief = {
  articles: [
    { title: 'Ceasefire agreement announced', url: 'https://example.com/peace', source: 'BBC', published: '2026-10-02' },
    { title: 'Ceasefire agreement announced', url: 'https://example.com/peace', source: 'BBC' },
    { title: 'Nuclear alert', url: 'javascript:alert(1)', source: 'Untrusted' },
    { title: 'Vaccine clinical trial succeeds', url: 'https://example.com/medicine', source: 'BBC' }
  ],
  quakes: [{ mag: 5.5, place: 'Example region', time: 1790899200000, url: 'https://earthquake.usgs.gov/example' }],
  macro: { value: 2.3, year: '2025' }
};
const rows = assess(brief);
assert.equal(rows.find(t => t.id === 'peace').evidence.length, 1, 'Duplicate reporting must not inflate coverage');
assert.equal(rows.find(t => t.id === 'peace').coverage, 'Single source family');
assert.equal(rows.find(t => t.id === 'nuclear').evidence.length, 0, 'Unsafe URLs must not become evidence links');
assert.equal(rows.find(t => t.id === 'medicine').status, 'Signals observed');
assert.equal(rows.find(t => t.id === 'earth').evidence[0].type, 'Measured observation');
assert.ok(rows.find(t => t.id === 'economy').evidence[0].title.includes('2025'), 'Annual observations must retain their year');
assert.equal(rows.find(t => t.id === 'water').status, 'Evidence gap', 'Missing reporting must remain unassessed');
assert.equal(safeUrl('data:text/html,hello'), null);
assert.equal(safeUrl('/relative'), null);
assert.ok(rows.every(t => !('probability' in t)), 'Reporting mentions must not turn into fabricated event probabilities');
assert.deepEqual(assess(brief), rows, 'Assessments must be reproducible from the same evidence');
console.log('Earth outlook checks passed: coverage gaps, provenance, deduplication, safe links, reproducibility, and no fabricated probabilities.');
