This file is CLAUDE.md — the persistent project brief for Claude Code's Daily Design Digest project.
Read this file at the start of every session before doing anything.
Always refer back to it when making decisions about architecture, naming, or content rules.

---

## What This Project Is

A weekly web digest that curates articles and videos about how designers use AI.

**Strict content rule — NEVER include:**
- AI image generation (Midjourney, DALL-E, Stable Diffusion, etc.)
- AI music or audio generation (Suno, Udio, etc.)
- AI art communities or prompt art

**Always include:**
- UI design + AI tools
- UX workflow and AI assistants
- Figma AI features
- Design engineering and automation
- Design systems and AI
- AI-assisted prototyping and developer handoff

---

## Database

**Provider:** Supabase
**Table:** `public."DDD_Database"`
**RLS:** Enabled. Public SELECT policy applied. Write requires service role key.

| Column         | Type        | Notes                                        |
|----------------|-------------|----------------------------------------------|
| `id`           | uuid        | Primary key, auto gen_random_uuid()          |
| `created_at`   | timestamptz | Auto now()                                   |
| `issue`        | integer     | Digest issue number e.g. 1, 2, 3            |
| `section`      | text        | "hero" / "spotlight" / "sidebar"             |
| `content_type` | text        | "article" or "video" — defaults to "article" |
| `title`        | text        |                                              |
| `url`          | text        | Required (not null)                          |
| `summary`      | text        | Hero standfirst — AI-generated               |
| `thumbnail_url`| text        | Direct image URL or YouTube thumbnail        |
| `tags`         | text        | Comma-separated string e.g. "UX/AI, Workflow"|
| `source_name`  | text        | e.g. "Smashing Magazine", "YouTube"          |
| `position`     | integer     | Sort order within section, defaults to 0     |
| `insight_1`    | text        | Hero rows only — AI-generated                |
| `insight_2`    | text        | Hero rows only — AI-generated                |
| `insight_3`    | text        | Hero rows only — AI-generated                |

**YouTube thumbnail pattern:** `https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg`
**Microlink OG extraction:** `https://api.microlink.io/?url=ARTICLE_URL`

---

## Tech Stack

- `index.html` — single file, no build step, must stay that way
- Tailwind CSS via CDN only
- Vanilla JS only — no React, Vue, Svelte, or any framework
- Supabase JS SDK via CDN
- GitHub Pages deployment (static, drag and drop)
- Node.js pipeline scripts (run server-side in GitHub Actions only)

---

## Two Tasks — Complete in This Order

---

### TASK 1 — Rewrite index.html to fetch from Supabase dynamically

The current index.html has fully hardcoded placeholder content.
Rewrite it so all content loads from Supabase at page load.
Keep the exact same visual layout from the Figma — only the data source changes.

**Config block at the top of index.html:**
```js
const SUPABASE_URL      = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const CURRENT_ISSUE     = 1;
```

**Fetch logic:**
- Load Supabase JS SDK from CDN
- Query DDD_Database where issue = CURRENT_ISSUE, ordered by position ascending
- Split rows by section: hero, spotlight, sidebar
- Show skeleton loaders while fetching
- Show clear inline error if fetch fails or returns no rows

**Hero section renders:**
- thumbnail_url as full-width grayscale image (hover reveals colour)
- tags (comma-separated text) as pill labels
- title as large uppercase headline
- summary as body standfirst
- insight_1, insight_2, insight_3 as the three Core Insights cards
- CTA button: "Read Article →" or "Watch Video ▶" based on content_type

**Spotlight section renders:**
- Multiple article cards in order of position
- Each card: tags, headline, optional summary, CTA link
- content_type === "video" shows "Watch Video ▶"

**Left sidebar renders:**
- Today's date (auto from JS — day and month, large lime text)
- Current year
- Tools Featured: unique tags extracted from all rows this issue
- Timeline chips: last 5 issue numbers with auto-calculated dates (7 days apart)
- Active chip = current issue (cream background), past chips = dark

**Right sidebar renders:**
- Thumbnail index: thumbnail_url images for all rows
- Each labeled by section and position e.g. "01_HERO", "02_SPOT_A"
- Scrollable if content overflows

**Constraints:**
- Anon key is safe to expose in index.html (RLS limits it to SELECT)
- Service role key must NEVER appear in index.html
- No frameworks, no build step, no package.json for index.html
- Images always render grayscale by default, colour on hover

---

### TASK 2 — Build the autonomous weekly pipeline

Fully autonomous. No manual review step.
Pipeline runs on a schedule → uploads to Supabase → index.html updates live.

**config.json** (the only file the user ever edits):
```json
{
  "schedule_day": "monday",
  "search_queries": [
    "AI UX design tools 2025",
    "design workflow AI assistant",
    "Figma AI features designer",
    "design engineering AI automation",
    "UI design system AI"
  ],
  "banned_keywords": [
    "Midjourney", "DALL-E", "Stable Diffusion", "Suno", "Udio",
    "AI image generation", "AI art generator", "AI music",
    "text to image", "text to video", "generative art"
  ],
  "relevance_threshold": 7,
  "section_counts": {
    "hero": 1,
    "spotlight": 3,
    "sidebar": 4
  },
  "model_curate": "claude-haiku-4-5-20251001",
  "model_summarise": "claude-haiku-4-5-20251001"
}
```

`schedule_day` accepts: monday / tuesday / wednesday / thursday / friday / saturday / sunday
Pipeline always runs at 08:00 UTC on the chosen day.

---

**search.js**
- Reads search_queries and banned_keywords from config.json
- Calls Tavily API for each search query
- Merges and deduplicates results by URL
- Pre-filters: removes any result whose title or URL contains a banned keyword (case-insensitive)
- Returns up to 30 candidate articles: { title, url, summary, published_date, source }
- Passes results to curate.js

---

**curate.js**
- Reads relevance_threshold and section_counts from config.json
- Calls Claude API (model: claude-haiku-4-5-20251001) to score each article 0–10:

Prompt:
```
Score this article 0-10 for relevance to a digest about how designers
use AI in their workflows. Relevant: UI design, UX, Figma, design tools,
design systems, design engineering, AI-assisted prototyping, developer
handoff, design tokens, workflow automation for designers.
NOT relevant: AI image generation, AI art, Midjourney, music AI,
general tech, marketing.
Return JSON only: { "score": number, "reason": string }
```

- Auto-rejects anything scored below relevance_threshold
- Sorts remaining articles by score descending
- Assigns sections based on section_counts:
    Rank 1           → hero
    Ranks 2 to 4     → spotlight (position 1, 2, 3)
    Remaining up to 4 → sidebar
- Sets content_type to "video" if URL contains youtube.com or vimeo.com
- Extracts source_name from article domain
- Calls Microlink for each article to fetch thumbnail_url:
    https://api.microlink.io/?url=ARTICLE_URL
  Falls back to null if Microlink fails
- Passes structured rows to summarise.js

---

**summarise.js**
- Reads model_summarise from config.json (claude-haiku-4-5-20251001)
- For HERO article only — fetches article body then calls Claude API:

Prompt:
```
You are an editor for a design and AI digest.
Read this article and return JSON only with these fields:
- summary: 2-3 sentence standfirst for designers (max 280 chars)
- insight_1: sharp one-line takeaway a designer would find actionable (max 120 chars)
- insight_2: sharp one-line takeaway a designer would find actionable (max 120 chars)
- insight_3: sharp one-line takeaway a designer would find actionable (max 120 chars)
Return JSON only, no preamble.
```

- For SPOTLIGHT articles: generate summary only (no insights)
- For SIDEBAR articles: skip summarisation entirely
- Attaches generated fields to each row object
- Passes to upload.js

---

**upload.js**
- Takes final rows from summarise.js
- Queries Supabase for max(issue) + 1 to auto-increment issue number
- Sets issue number on all rows
- Upserts into public."DDD_Database" using SUPABASE_SERVICE_ROLE_KEY
- Logs: new issue number, rows inserted, any errors
- On error: logs full error, exits with code 1 (fails the GitHub Action)

---

**pipeline.js** (master runner)
- Runs the full sequence: search → curate → summarise → upload
- This is the only file GitHub Actions calls: `node pipeline.js`

---

**package.json scripts:**
```json
{
  "scripts": {
    "run-pipeline": "node pipeline.js"
  }
}
```
User can run `npm run pipeline` locally to trigger immediately.

**Dependencies:**
- @supabase/supabase-js
- @anthropic-ai/sdk
- node-fetch

---

**.github/workflows/weekly-digest.yml**

Two triggers:
1. Cron schedule — 08:00 UTC on schedule_day (default Monday = `0 8 * * 1`)
2. workflow_dispatch — manual trigger from GitHub Actions UI with no inputs required

Steps:
1. Checkout repo
2. Setup Node.js 20
3. npm ci
4. node pipeline.js

Secrets (stored in GitHub repo secrets, never in code):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- TAVILY_API_KEY
- ANTHROPIC_API_KEY

**.env** (local testing only — never commit):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TAVILY_API_KEY=
ANTHROPIC_API_KEY=
```

---

## Design System

### Figma reference
https://www.figma.com/design/uNoLixeJOIqPsanQbbKGyM/DailyDesignDigest?node-id=1-2

### Color tokens (defined in Tailwind config inside index.html)
```
dark:   #0e0e0e   page background
panel:  #131313   article card background
raised: #1f1f1f   inset card / tools widget
mid:    #262626   image card background
muted:  #757575   secondary / timestamp text
dim:    #ababab   body copy
cream:  #f3ffca   labels, borders, button text
lime:   #cafd00   large date, primary accent
border: rgba(72,72,72,0.4)
```

### Typography
```
Display: Space Grotesk, font-weight 700, uppercase, tight tracking (-1.2px to -3.6px)
Mono:    IBM Plex Mono, font-weight 400 and 700 — used for ALL labels and body text
```

### Spacing
8px base unit. Common values: 4, 8, 12, 16, 24, 32, 48, 96px

### Styling approach
- Tailwind CSS via CDN — no build step, no purge, no config file
- All custom tokens inside the tailwind.config block in index.html
- Global styles in a `<style>` block (skeleton loader, scrollbar, hover states)
- Desktop layout only — responsive not a priority for Phase 1/2

### Component patterns
```
Article card:   bg-panel border border-border p-8 flex flex-col gap-6
Image card:     bg-mid border border-border relative overflow-hidden
Tag pill:       font-mono text-[10px] uppercase border border-border px-2 py-1
Section label:  w-1.5 h-1.5 bg-cream + font-mono text-cream text-[10px] uppercase tracking-[1px]
CTA button:     bg-cream text-[#516700] font-mono font-bold uppercase tracking-[2px] px-8 py-4
Skeleton:       shimmer animation, bg linear-gradient #1f1f1f → #2a2a2a
```

### Image treatment
```css
.img-gray { filter: grayscale(100%) contrast(1.05); transition: filter 0.4s ease; }
.img-gray:hover { filter: grayscale(0%) contrast(1); }
```

---

## Final File Structure

```
design-ai-digest/
├── CLAUDE.md                          ← this file
├── index.html                         ← dynamic frontend, no build step
├── config.json                        ← only file user edits
├── pipeline.js                        ← master runner
├── search.js                          ← Tavily search
├── curate.js                          ← Claude scoring + section assignment
├── summarise.js                       ← Claude summarisation + insights
├── upload.js                          ← Supabase upsert
├── package.json
├── .env                               ← local only, gitignored
└── .github/
    └── workflows/
        └── weekly-digest.yml
```

---

## Hard Constraints — Never Break These

- index.html must remain a single file with zero dependencies or build step
- No frameworks anywhere in index.html (no React, Vue, Svelte)
- Service role key never appears in index.html — anon key only
- No local image files — always remote CDN URLs
- Pipeline scripts run only in GitHub Actions or local terminal — never in the browser
- Pipeline must be idempotent — safe to re-run without duplicating rows (use upsert)
- config.json is the single source of truth for all pipeline settings
- All AI calls use claude-haiku-4-5-20251001 (cheapest model)
- Content rule strictly enforced: no AI image gen, no AI music, no AI art