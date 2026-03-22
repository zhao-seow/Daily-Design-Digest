/**
 * search.js — Tavily search
 * Searches multiple queries and returns a deduplicated result array.
 */

const TAVILY_API = 'https://api.tavily.com/search';

/**
 * @param {string[]} queries
 * @param {{ maxResultsPerQuery?: number, searchDepth?: string }} options
 * @returns {Promise<Array>}
 */
export async function search(queries, { maxResultsPerQuery = 8, searchDepth = 'advanced' } = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY not set');

  const allResults = [];
  const seen       = new Set();

  for (const query of queries) {
    console.log(`  Searching: "${query}"`);

    let res;
    try {
      res = await fetch(TAVILY_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key:        apiKey,
          query,
          search_depth:   searchDepth,
          max_results:    maxResultsPerQuery,
          include_images: true,
        }),
      });
    } catch (err) {
      console.warn(`  Network error for "${query}": ${err.message}`);
      continue;
    }

    if (!res.ok) {
      console.warn(`  Tavily HTTP ${res.status} for "${query}"`);
      continue;
    }

    const data = await res.json();

    for (const r of (data.results || [])) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);

      let hostname = '';
      try { hostname = new URL(r.url).hostname.replace(/^www\./, ''); } catch {}

      allResults.push({
        title:         r.title   || '',
        url:           r.url,
        content:       (r.content || '').slice(0, 400),
        thumbnail_url: r.image   || null,
        source_name:   hostname,
        raw_score:     r.score   || 0,
      });
    }

    // Stay polite to the Tavily API
    await delay(400);
  }

  console.log(`  Found ${allResults.length} unique results across ${queries.length} queries`);
  return allResults;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
