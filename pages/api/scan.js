// pages/api/scan.js
// Server-side font scanner — no CORS issues, no third-party proxy

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // Normalize URL
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try {
    const html = await fetchText(url);
    if (!html) return res.status(422).json({ error: 'Empty response from target site' });

    // Resolve base for relative hrefs
    const base = new URL(url);

    // Grab inline <style> blocks
    let inlineCSS = '';
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let sm;
    while ((sm = styleRegex.exec(html)) !== null) {
      inlineCSS += sm[1] + '\n';
    }

    // Collect <link rel="stylesheet"> hrefs
    const cssUrls = [];
    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;
    let lm;
    while ((lm = linkRegex.exec(html)) !== null) {
      cssUrls.push(resolveUrl(lm[1], base));
    }

    // Also catch reversed attribute order: href before rel
    const linkRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi;
    while ((lm = linkRegex2.exec(html)) !== null) {
      const resolved = resolveUrl(lm[1], base);
      if (!cssUrls.includes(resolved)) cssUrls.push(resolved);
    }

    // Fetch up to 10 external stylesheets in parallel
    const sheets = await Promise.allSettled(
      cssUrls.slice(0, 10).map(u => fetchText(u))
    );
    const externalCSS = sheets
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
      .join('\n');

    const allCSS = inlineCSS + externalCSS;
    const fonts = extractFonts(html, allCSS);

    return res.status(200).json({
      url,
      fonts,
      cssSheetCount: cssUrls.length,
    });

  } catch (err) {
    console.error('Scan error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to scan site' });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveUrl(href, base) {
  if (href.startsWith('//')) return 'https:' + href;
  if (href.startsWith('/')) return base.origin + href;
  if (href.startsWith('http')) return href;
  return base.origin + '/' + href;
}

async function fetchText(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TypeStuff/1.0; font scanner)',
        'Accept': 'text/html,text/css,*/*',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function cleanFontName(name) {
  return name.replace(/['"]/g, '').trim();
}

const SKIP = new Set([
  'inherit', 'initial', 'unset', 'revert', 'none',
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', '-apple-system', 'BlinkMacSystemFont',
  'ui-sans-serif', 'ui-serif', 'ui-monospace',
  'var', 'env',
]);

function extractFonts(html, css) {
  const fonts = new Map();

  const add = (name, source) => {
    const clean = cleanFontName(name);
    if (!clean || clean.length < 2) return;
    if (SKIP.has(clean.toLowerCase())) return;
    if (clean.startsWith('-') || clean.startsWith('var(')) return;
    if (!fonts.has(clean)) fonts.set(clean, { name: clean, sources: [] });
    const entry = fonts.get(clean);
    if (!entry.sources.includes(source)) entry.sources.push(source);
  };

  // Google Fonts embed URLs
  const gfRegex = /fonts\.googleapis\.com\/css[2]?\?[^"'\s>)]+/g;
  for (const match of (html + css).match(gfRegex) || []) {
    const fm = match.match(/family=([^&"'\s>)]+)/);
    if (fm) {
      fm[1].split('|').forEach(entry => {
        add(entry.split(':')[0].replace(/\+/g, ' '), 'Google Fonts');
      });
    }
  }

  // Adobe Fonts / Typekit
  if (/use\.typekit\.net\/[a-z0-9]+/.test(html + css)) {
    add('Adobe Fonts (Typekit)', 'Adobe Fonts');
  }

  // @font-face blocks
  const ffRegex = /@font-face\s*\{([^}]+)\}/gi;
  let ffm;
  while ((ffm = ffRegex.exec(css)) !== null) {
    const block = ffm[1];
    const fm = block.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1/i);
    if (fm) add(fm[2], '@font-face');
  }

  // font-family declarations in CSS
  const declRegex = /font-family\s*:\s*([^;}\n]+)/gi;
  let dm;
  while ((dm = declRegex.exec(css)) !== null) {
    dm[1].trim().split(',').forEach(f => add(f.trim(), 'CSS'));
  }

  // Inline style attributes in HTML
  const inlineRegex = /style=["'][^"']*font-family\s*:\s*([^;'"]+)/gi;
  let im;
  while ((im = inlineRegex.exec(html)) !== null) {
    im[1].split(',').forEach(f => add(f.trim(), 'Inline'));
  }

  return Array.from(fonts.values());
}
