This file is CLAUDE.md — the persistent project brief for Claude Code's Daily Design Digest project.
Read this file at the start of every session before doing anything.
Always refer back to it when making decisions about architecture, naming, or content rules.

---

## What This Project Is

A weekly web digest that curates articles and videos about how designers use AI.
Pipeline runs every Monday → publishes to Supabase → live site updates automatically → email notification sent.

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

## Status — Both Tasks Complete

- **Task 1** ✓ `index.html` fetches all content from Supabase dynamically at page load
- **Task 2** ✓ Autonomous weekly pipeline: search → curate → summarise → upload → email

**Live site:** https://zhao-seow.github.io/Daily-Design-Digest/

---

## Database

**Provider:** Supabase
**Table:** `public."DDD_Database"`
**RLS:** Enabled. Public SELECT policy applied. Write requires Secret Key (service role).

| Column         | Type        | Notes                                        |
|----------------|-------------|----------------------------------------------|
| `id`           | uuid        | Primary key, auto gen_random_uuid()          |
| `created_at`   | timestamptz | Auto now()                                   |
| `issue`        | integer     | Digest issue number e.g. 1, 2, 3            |
| `section`      | text        | "hero" / "spotlight" / "visual-inspo"        |
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

**Supabase key naming (new dashboard UI):**
- "Publishable Key" = anon key → used in `index.html` (read-only, safe to expose)
- "Secret Key" = service role key → used in pipeline only, bypasses RLS

---

## Tech Stack

**Frontend (`index.html`):**
- Single file, no build step — must stay that way
- Tailwind CSS via CDN only
- Vanilla JS only — no React, Vue, Svelte, or any framework
- Fetches from Supabase REST API using the Publishable Key
- GitHub Pages deployment: https://zhao-seow.github.io/Daily-Design-Digest/

**Pipeline (Node.js scripts, server-side only):**
- Runs in GitHub Actions or local terminal — never in the browser
- `node pipeline.js` to run manually

---

## Pipeline Architecture

```
search.js → curate.js → summarise.js → upload.js → email.js
```

**search.js**
- Reads `queries` and `search` config from config.json
- Calls Tavily API for each query (native fetch, Node 20)
- Merges and deduplicates results by URL
- Returns candidate articles: `{ title, url, content, thumbnail_url, source_name }`

**curate.js**
- Calls Claude API (claude-sonnet-4-6) with all raw results in one prompt
- Claude scores each article, filters banned content, and assigns sections
- Returns items with `{ section, position, tags, content_type }` merged in
- Sections assigned: hero (1), spotlight (3), visual-inspo (2)

**summarise.js**
- Hero: calls Claude for `summary` + `insight_1/2/3`
- Spotlight: calls Claude for `summary` only
- Visual-inspo / sidebar: skipped

**upload.js**
- Deletes existing rows for the issue (idempotent re-runs)
- Inserts all enriched rows into `public."DDD_Database"`
- Uses `SUPABASE_SERVICE_KEY` (Secret Key) to bypass RLS

**email.js**
- Sends a plain-text email via Gmail SMTP (nodemailer)
- Lists article titles grouped by section + link to live site
- Uses `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_EMAIL`

**pipeline.js** (master runner)
- Loads `keys.env` via dotenv
- Determines next issue number from `MAX(issue) + 1` in Supabase
- Runs the full sequence and logs progress

---

## config.json — Only File the User Ever Edits

```json
{
  "queries": [
    "UX design AI tools news 2025",
    "design systems product design trends 2025",
    "brand identity visual design case study 2025",
    "design engineering frontend craft 2025",
    "AI product design interface 2025"
  ],
  "sections": {
    "hero":         1,
    "spotlight":    3,
    "visual-inspo": 2
  },
  "search": {
    "maxResultsPerQuery": 8,
    "searchDepth":        "advanced"
  }
}
```

---

## Environment Variables

**`keys.env`** (local only — gitignored, never commit):
```
SUPABASE_URL=https://rpgkxbgotmsdonpzzgpf.supabase.co
SUPABASE_SERVICE_KEY=eyJ...        ← Secret Key from Supabase → Settings → API
TAVILY_API_KEY=
ANTHROPIC_API_KEY=
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
NOTIFY_EMAIL=your@gmail.com
```

**Gmail App Password setup:**
Google Account → Security → 2-Step Verification → App passwords → create "DDD Pipeline"

**GitHub Actions secrets** (Settings → Secrets → Actions):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `TAVILY_API_KEY`
- `ANTHROPIC_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `NOTIFY_EMAIL`

---

## GitHub Actions

**Workflow:** `.github/workflows/weekly-digest.yml`

Two triggers:
1. Cron — every Monday 08:00 UTC (`0 8 * * 1`)
2. `workflow_dispatch` — manual trigger from GitHub Actions UI

---

## File Structure

```
Daily-Design-Digest-v2/
├── CLAUDE.md                     ← this file
├── index.html                    ← dynamic frontend, single file, no build step
├── config.json                   ← only file user edits
├── pipeline.js                   ← master runner: node pipeline.js
├── search.js                     ← Tavily search
├── curate.js                     ← Claude scoring + section assignment
├── summarise.js                  ← Claude summarisation + insights
├── upload.js                     ← Supabase insert
├── email.js                      ← Gmail plain-text notification
├── package.json                  ← deps: @anthropic-ai/sdk, @supabase/supabase-js, dotenv, nodemailer
├── package-lock.json
├── keys.env                      ← local secrets, gitignored
├── .gitignore
└── .github/
    └── workflows/
        └── weekly-digest.yml
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

## Hard Constraints — Never Break These

- `index.html` must remain a single file with zero dependencies or build step
- No frameworks anywhere in `index.html` (no React, Vue, Svelte)
- Secret Key (service role) never appears in `index.html` — Publishable Key only
- No local image files — always remote CDN URLs
- Pipeline scripts run only in GitHub Actions or local terminal — never in the browser
- Pipeline is idempotent — delete existing rows for the issue before inserting
- `config.json` is the single source of truth for all pipeline settings
- Content rule strictly enforced: no AI image gen, no AI music, no AI art
