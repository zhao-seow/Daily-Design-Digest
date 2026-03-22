/**
 * upload.js — Supabase upsert
 * Deletes any existing rows for the issue, then inserts fresh ones.
 * Uses the service role key — never expose this in index.html.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * @param {Array}  items   Enriched items from summarise.js
 * @param {number} issue   Issue number
 */
export async function upload(items, issue) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url) throw new Error('SUPABASE_URL not set');
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Delete any existing rows for this issue (makes re-runs safe)
  const { error: delErr } = await supabase
    .from('DDD_Database')
    .delete()
    .eq('issue', issue);
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);

  // Build rows matching the DB schema exactly
  const rows = items.map(item => ({
    issue,
    section:       item.section,
    content_type:  item.content_type  || 'article',
    title:         item.title,
    url:           item.url,
    summary:       item.summary       || null,
    thumbnail_url: item.thumbnail_url || null,
    tags:          item.tags          || null,
    source_name:   item.source_name   || null,
    position:      item.position      ?? 0,
    insight_1:     item.insight_1     || null,
    insight_2:     item.insight_2     || null,
    insight_3:     item.insight_3     || null,
  }));

  const { error: insErr } = await supabase
    .from('DDD_Database')
    .insert(rows);
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

  console.log(`  Inserted ${rows.length} rows for issue #${String(issue).padStart(3, '0')}`);
}
