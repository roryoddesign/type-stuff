# type stuff.

Paste a URL. Get the fonts. No devtools needed.

Font scanner built with Next.js — server-side fetching means no CORS issues, works on mobile.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create type-stuff --public --source=. --push
# or push manually via GitHub Desktop
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your `type-stuff` GitHub repo
3. Framework will auto-detect as **Next.js**
4. Hit **Deploy** — that's it

### 3. Custom domain (optional)

In Vercel → Project Settings → Domains, add `typestuff.lol` (or whatever you grab).

---

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## How it works

- `pages/index.js` — the UI
- `pages/api/scan.js` — server-side route that fetches HTML + CSS from the target site and extracts font declarations

Because the fetch happens server-side, there are no CORS restrictions. The scanner pulls:
- Google Fonts embed URLs
- Adobe Fonts / Typekit kit references
- `@font-face` declarations
- `font-family` values from all linked stylesheets
- Inline style attributes

**Limitation:** fonts loaded via JavaScript bundles (many React/Next.js sites) won't appear, because the scanner reads static HTML/CSS rather than executing JS.
