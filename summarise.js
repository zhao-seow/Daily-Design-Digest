/**
 * summarise.js — Claude summary + 3 hero insights
 * Enriches each curated item with a summary.
 * Adds insight_1/2/3 for the hero item only.
 */

import Anthropic from '@anthropic-ai/sdk';

const delay = ms => new Promise(r => setTimeout(r, ms));

function extractJSON(text) {
  try   { return JSON.parse(text.trim()); }  catch {}
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) {
    try { return JSON.parse(block[1].trim()); } catch {}
  }
  return null;
}

async function getSummary(item) {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system:     'You are a sharp editorial writer for a design newsletter. Be concise and insightful. No fluff.',
    messages: [{
      role:    'user',
      content:
`Write a 2–3 sentence summary of this article for senior designers. Capture the key insight, not just the topic. Be specific.

Title:   ${item.title}
Source:  ${item.source_name}
Snippet: ${item.content}

Return ONLY valid JSON: { "summary": "..." }`,
    }],
  });

  const parsed = extractJSON(msg.content[0].text);
  return parsed?.summary ?? '';
}

async function getInsights(item) {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system:     'You are a sharp editorial writer for a design newsletter.',
    messages: [{
      role:    'user',
      content:
`Generate 3 distinct, punchy insights from this hero article. Each should be 1–2 sentences max. Avoid generic design platitudes — make them specific to what this article actually argues.

Title:   ${item.title}
Summary: ${item.summary || item.content}

Return ONLY valid JSON: { "insight_1": "...", "insight_2": "...", "insight_3": "..." }`,
    }],
  });

  const parsed = extractJSON(msg.content[0].text);
  return {
    insight_1: parsed?.insight_1 ?? '',
    insight_2: parsed?.insight_2 ?? '',
    insight_3: parsed?.insight_3 ?? '',
  };
}

/**
 * @param {Array} items  Curated items from curate.js
 * @returns {Promise<Array>}  Items enriched with summary (+ insights for hero)
 */
export async function summarise(items) {
  const enriched = [];

  for (const item of items) {
    console.log(`  [${item.section.padEnd(12)}] ${item.title.slice(0, 55)}…`);

    let enrichedItem = { ...item };

    try {
      enrichedItem.summary = await getSummary(item);
    } catch (err) {
      console.warn(`    Summary failed: ${err.message}`);
      enrichedItem.summary = '';
    }

    if (item.section === 'hero') {
      try {
        const insights = await getInsights(enrichedItem);
        Object.assign(enrichedItem, insights);
      } catch (err) {
        console.warn(`    Insights failed: ${err.message}`);
      }
    }

    enriched.push(enrichedItem);

    // Throttle Claude calls to avoid rate limits
    await delay(300);
  }

  return enriched;
}
