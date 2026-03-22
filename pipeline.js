/**
 * pipeline.js — Master runner
 * Run: node pipeline.js
 *
 * Required environment variables (put in .env for local use):
 *   TAVILY_API_KEY        — from https://app.tavily.com
 *   ANTHROPIC_API_KEY     — from https://console.anthropic.com
 *   SUPABASE_URL          — e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key from Supabase → Settings → API
 */

import dotenv from 'dotenv';
dotenv.config({ path: './keys.env' });
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

import { search    } from './search.js';
import { curate    } from './curate.js';
import { summarise } from './summarise.js';
import { upload           } from './upload.js';
import { sendNotification } from './email.js';

// ─── Determine next issue number ─────────────────────────────────────────────
async function getNextIssue() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_KEY not set');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('DDD_Database')
    .select('issue')
    .order('issue', { ascending: false })
    .limit(1);

  if (error) throw new Error(`Failed to query max issue: ${error.message}`);
  return data.length ? data[0].issue + 1 : 1;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const config = JSON.parse(readFileSync('./config.json', 'utf8'));

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Design × AI Digest — Pipeline Runner   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Issue number
  const issue = await getNextIssue();
  console.log(`► Issue #${String(issue).padStart(3, '0')}\n`);

  // 2. Search
  console.log('● SEARCH');
  const rawResults = await search(config.queries, config.search);
  if (!rawResults.length) throw new Error('No search results — check TAVILY_API_KEY');

  // 3. Curate
  console.log('\n● CURATE');
  const curated = await curate(rawResults, config.sections);
  if (!curated.length) throw new Error('Curation returned no items — check Claude response');

  // 4. Summarise
  console.log('\n● SUMMARISE');
  const enriched = await summarise(curated);

  // 5. Upload
  console.log('\n● UPLOAD');
  await upload(enriched, issue);

  // 6. Email notification
  console.log('\n● EMAIL');
  await sendNotification(enriched, issue);

  console.log(`\n✓ Issue #${String(issue).padStart(3, '0')} published successfully\n`);
}

main().catch(err => {
  console.error('\n✗ Pipeline failed:', err.message);
  process.exit(1);
});
