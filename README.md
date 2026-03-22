# Design × AI Digest

A self-running weekly newsletter that curates articles and videos about how designers use AI. Every Monday, a pipeline searches the web, scores and selects the best content, publishes it to a live website, and emails you a summary.

**Live site:** https://zhao-seow.github.io/Daily-Design-Digest/

---

## How it works

1. **Search** — Tavily searches the web using your queries in `config.json`
2. **Curate** — Claude scores each result for relevance and assigns it to a section (hero, spotlight, visual-inspo)
3. **Summarise** — Claude writes a summary for the hero and spotlight articles, plus 3 key insights for the hero
4. **Upload** — Content is pushed to Supabase; the live site updates automatically
5. **Email** — A plain-text email is sent to you with the article titles and a link to the site

The pipeline runs automatically every Monday at 08:00 UTC via GitHub Actions. You can also trigger it manually at any time.

---

## Setup

## Running the pipeline manually

From the project root:

```bash
node pipeline.js
```

The pipeline will log its progress and print `✓ Issue #00X published successfully` when done. You will receive an email notification and the live site will update immediately.

---

## Editing settings

All pipeline settings live in **`config.json`** — the only file you need to edit.

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

| Setting | What it does |
|---------|-------------|
| `queries` | Search terms sent to Tavily. Add, remove, or reword these to change what content gets found. |
| `sections.hero` | Number of hero articles per issue. Keep this at 1. |
| `sections.spotlight` | Number of spotlight articles. Default 3. |
| `sections.visual-inspo` | Number of visual design picks. Default 2. |
| `search.maxResultsPerQuery` | How many results to fetch per query. Higher = more candidates but slower. |
| `search.searchDepth` | `"advanced"` or `"basic"`. Advanced is more thorough. |

### Content rules

The pipeline will never include content about AI image generation, AI art, or AI music — this is enforced in the Claude curation prompt regardless of what the search queries return.

To change what topics are covered, edit the `queries` array. Examples:

```json
"queries": [
  "Figma AI features 2025",
  "design tokens design systems 2025",
  "AI prototyping tools UX 2025"
]
```

---

## File structure

```
├── index.html          Live site — fetches content from Supabase at page load
├── config.json         Edit this to change search queries and section counts
├── pipeline.js         Master runner — entry point for the pipeline
├── search.js           Tavily web search
├── curate.js           Claude scoring and section assignment
├── summarise.js        Claude summary and insights generation
├── upload.js           Supabase insert
├── email.js            Gmail notification
├── keys.env            Local secrets — never committed
└── .github/
    └── workflows/
        └── weekly-digest.yml   Automated Monday schedule
```
