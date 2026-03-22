/**
 * curate.js — Claude scoring + section assignment
 * Passes raw search results to Claude and gets back a curated selection
 * with section, position, tags, and content_type for each item.
 */

import Anthropic from '@anthropic-ai/sdk';

function extractJSON(text) {
  try   { return JSON.parse(text.trim()); }  catch {}
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) {
    try { return JSON.parse(block[1].trim()); } catch {}
  }
  throw new Error(`Could not extract JSON from Claude response.\nRaw: ${text.slice(0, 300)}`);
}

/**
 * @param {Array}  rawResults   Output from search.js
 * @param {Object} sectionCounts  e.g. { hero: 1, spotlight: 3, 'visual-inspo': 2 }
 * @returns {Promise<Array>}    Curated items with section metadata merged in
 */
export async function curate(rawResults, sectionCounts = { hero: 1, spotlight: 3, 'visual-inspo': 2 }) {
  if (!rawResults.length) return [];

  const articleList = rawResults.map((r, i) => ({
    index:   i + 1,
    title:   r.title,
    url:     r.url,
    source:  r.source_name,
    snippet: r.content,
  }));

  const sectionSpec = Object.entries(sectionCounts)
    .map(([s, n]) => `"${s}": exactly ${n}`)
    .join(', ');

  console.log(`  Asking Claude to pick from ${rawResults.length} results…`);

  const client  = new Anthropic();
  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system:
      'You are the editorial curator for Design × AI Digest, a weekly newsletter ' +
      'for senior designers and design engineers. You select the highest-quality ' +
      'articles from a pool of search results.',
    messages: [{
      role:    'user',
      content:
`Select and assign the best articles from the list below to these sections: ${sectionSpec}.

SECTION DEFINITIONS:
- hero: The single most insightful, substantive deep-dive on design or the intersection of design and AI. Must have real editorial depth, not just news.
- spotlight: Notable reads with good signal — diverse topics, actionable or thought-provoking.
- visual-inspo: Visual design showcases only — brand identity, UI galleries, portfolios, Awwwards-style picks, case studies with strong visuals.

HARD RULES — you MUST skip any article about:
- AI image generation, AI art creation, AI music, or deepfakes
- Pure tech news with no design angle
- Generic listicles with no original insight

For each selected article assign:
- tags: 1–3 comma-separated category tags (e.g. "UX Research,AI Tools")
- content_type: "article", "video", or "tool"
- position: integer order within its section (1-indexed)

Return ONLY a valid JSON array. Example format:
[
  { "index": 3, "section": "hero",         "position": 1, "tags": "Design Systems,AI",    "content_type": "article" },
  { "index": 7, "section": "spotlight",    "position": 1, "tags": "UX Research",           "content_type": "article" },
  { "index": 2, "section": "visual-inspo", "position": 1, "tags": "Brand Identity,Visual", "content_type": "article" }
]

ARTICLES:
${JSON.stringify(articleList, null, 2)}`,
    }],
  });

  const picks = extractJSON(message.content[0].text);
  if (!Array.isArray(picks)) throw new Error('Claude curate did not return an array');

  // Merge curation metadata back into the full source objects
  const result = picks
    .filter(p => p.section && p.section !== 'skip')
    .map(pick => {
      const source = rawResults[pick.index - 1];
      if (!source) return null;
      return {
        ...source,
        section:      pick.section,
        position:     pick.position      ?? 1,
        tags:         pick.tags          ?? '',
        content_type: pick.content_type  ?? 'article',
      };
    })
    .filter(Boolean);

  console.log(`  Claude selected ${result.length} items`);
  return result;
}
