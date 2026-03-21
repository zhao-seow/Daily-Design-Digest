This file is CLAUDE.md — the persistent project brief for Claude Code's Daily Design Digest project.
Read this file at the start of every session before doing anything.
Always refer back to it when making decisions about architecture,
naming, or content rules.

## Design System Rules

### Figma reference
https://www.figma.com/design/uNoLixeJOIqPsanQbbKGyM/DailyDesignDigest?node-id=1-2

### Tokens (defined as Tailwind config in index.html)
Colors:
  --dark:   #0e0e0e   page background
  --panel:  #131313   article card background
  --raised: #1f1f1f   inset card / tools widget
  --mid:    #262626   image card background
  --muted:  #757575   secondary / timestamp text
  --dim:    #ababab   body copy
  --cream:  #f3ffca   labels, borders, button text
  --lime:   #cafd00   large date, primary accent
  --border: rgba(72,72,72,0.4)

Typography:
  Display: Space Grotesk, font-weight 700, uppercase, tight tracking
  Mono:    IBM Plex Mono, font-weight 400 and 700, used for ALL labels and body

Spacing rhythm: 8px base unit. Common values: 4, 8, 12, 16, 24, 32, 48, 96px

### Styling approach
- Tailwind CSS via CDN — no build step, no purge, no config file
- All custom tokens live inside the tailwind.config block in index.html
- No CSS Modules, no Styled Components, no PostCSS
- Global styles in a <style> block inside index.html (skeleton, scrollbar, hover states)
- Responsive: not a priority for Phase 1/2 — desktop layout only

### Asset management
- Images: direct CDN URLs only in src attributes — never local files
- YouTube thumbnails: https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
- Microlink for OG extraction: https://api.microlink.io/?url=URL
- No icon system — arrows use unicode (→ ▶) or inline SVG

### Component patterns
No component library. Patterns are copy-paste HTML blocks:
  Article card:   bg-panel border border-border p-8 flex flex-col gap-6
  Image card:     bg-mid border border-border relative overflow-hidden
  Tag pill:       font-mono text-[10px] uppercase border border-border px-2 py-1
  Section label:  w-1.5 h-1.5 bg-cream + font-mono text-cream text-[10px] uppercase
  CTA button:     bg-cream text-[#516700] font-mono font-bold uppercase tracking-[2px]
  Skeleton:       animate shimmer, bg linear-gradient #1f1f1f → #2a2a2a

### Image treatment
All images render in grayscale by default, reveal colour on hover:
  .img-gray { filter: grayscale(100%) contrast(1.05); transition: filter 0.4s ease; }
  .img-gray:hover { filter: grayscale(0%) contrast(1); }

### Project structure
design-ai-digest/
├── CLAUDE.md           this file
├── index.html          single-file frontend — no build step
├── config.json         pipeline settings — only file user edits
├── pipeline.js         master runner: search → curate → summarise → upload
├── search.js           Tavily API
├── curate.js           Claude scoring + section assignment
├── summarise.js        Claude summary + 3 insights for hero
├── upload.js           Supabase upsert
├── package.json
├── .env                local only — never commit
└── .github/
    └── workflows/
        └── weekly-digest.yml

## Two Tasks — Complete in This Order

### Task 1 — Update index.html to fetch from Supabase dynamically
The current index.html has hardcoded placeholder content.
Rewrite it so all content loads from Supabase at page load.
Keep the exact same visual layout — only the data source changes.
Full spec is in the "TASK 1" section above.

### Task 2 — Build the autonomous weekly pipeline
Create all pipeline scripts and the GitHub Actions workflow
so new issues are published automatically every week.
Full spec is in the "TASK 2" section above.

Complete Task 1 fully before starting Task 2.
Do not start Task 2 until Task 1 is confirmed working.


## Database Schema

Table: `public."DDD_Database"` (Supabase)

| Column         | Type      | Notes                              |
|----------------|-----------|------------------------------------|
| `id`           | uuid      | Primary key, auto gen_random_uuid()|
| `created_at`   | timestamptz | Auto now()                       |
| `issue`        | integer   | Digest issue number                |
| `section`      | text      | Section the item belongs to        |
| `content_type` | text      | Defaults to `'article'`            |
| `title`        | text      |                                    |
| `url`          | text      | Required (not null)                |
| `summary`      | text      |                                    |
| `thumbnail_url`| text      |                                    |
| `tags`         | text      |                                    |
| `source_name`  | text      |                                    |
| `position`     | integer   | Order within section, defaults to 0|
| `insight_1`    | text      | Hero items only                    |
| `insight_2`    | text      | Hero items only                    |
| `insight_3`    | text      | Hero items only                    |

### Never do these
- No frameworks (no React, Vue, Svelte)
- No build step or package.json for index.html
- No service role key in index.html
- No local image files — always remote URLs
- No AI image generation, AI art, or AI music content