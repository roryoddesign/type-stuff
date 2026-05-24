// pages/api/proxy.js
// Fetches a target site and serves its HTML from our origin, so it can be
// iframed (strips X-Frame-Options / CSP frame-ancestors) and so we can inject
// the inspector script. Sub-resources (CSS, JS, images, fonts) are loaded by
// the browser directly from the original origin via an injected <base> tag.

export default async function handler(req, res) {
  let { url } = req.query;
  if (!url) return res.status(400).send('Missing url parameter');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).send('Invalid url');
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TypeStuff/1.0; font scanner)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return res.status(502).send(`Upstream returned ${upstream.status}`);
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(415).send('Target did not return HTML');
    }

    let html = await upstream.text();
    html = injectBaseTag(html, target.origin + target.pathname);
    html = injectPopupBlocker(html);
    html = injectInspector(html);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    // Deliberately do NOT forward X-Frame-Options / CSP frame-ancestors
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).send(`Proxy error: ${err.message}`);
  }
}

function injectBaseTag(html, href) {
  const tag = `<base href="${escapeAttr(href)}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, m => m + tag);
  }
  return tag + html;
}

function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}

function injectPopupBlocker(html) {
  const css = `
<style id="__typestuff-blocker">
  /* Cookie / consent management platforms */
  #onetrust-consent-sdk, #onetrust-banner-sdk, #onetrust-pc-sdk, .onetrust-pc-dark-filter,
  #CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay, #CookiebotWidget,
  .osano-cm-dialog, .osano-cm-window, .osano-cm-dialog--type_bar,
  .cc-window, .cc-revoke, .cc-banner,
  .cky-consent-container, .cky-overlay, .cky-modal, .cky-consent-bar,
  .didomi-popup-container, #didomi-host, .didomi-popup-backdrop,
  .truste_box_overlay, .truste_overlay, .truste-banner, #truste-consent-track,
  .qc-cmp-cleanslate, .qc-cmp2-container, #qc-cmp2-ui,
  .iubenda-cs-container, #iubenda-cs-banner,
  .termly-cmp-banner, #termly-code-snippet-support,
  /* Generic GDPR / cookie selectors */
  [class*="cookie-banner"], [id*="cookie-banner"],
  [class*="cookie-consent"], [id*="cookie-consent"],
  [class*="cookie-notice"], [id*="cookie-notice"],
  [class*="cookie-policy"], [id*="cookie-policy"],
  [class*="cookie-popup"], [id*="cookie-popup"],
  [class*="gdpr-banner"], [id*="gdpr"],
  /* Common newsletter / marketing popups */
  [class*="klaviyo-form-"], [class*="klaviyo_form"], .needsclick[class*="klaviyo"],
  .privy-modal, .privy_modal_overlay, [class*="privy_"],
  [id*="mc-modal"], [class*="mailchimp-popup"], #mc_embed_signup_scroll,
  .sumome-react-wysiwyg-popup-overlay, .sumo-popup-overlay,
  .pum-overlay, .pum-container,
  .ouibounce-modal, #ouibounce-modal,
  [id^="popup-"][role="dialog"], [class*="newsletter-popup"], [class*="email-popup"] {
    display: none !important;
    visibility: hidden !important;
  }
  /* Unlock scroll that popups often hijack */
  html, body {
    overflow: auto !important;
    overflow-x: hidden !important;
  }
</style>
`.trim();

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, m => m + css);
  }
  return css + html;
}

function injectInspector(html) {
  const script = `
<script>(function(){
  if (window.__typeStuffInspector) return;
  window.__typeStuffInspector = true;

  var GENERIC = new Set([
    'inherit','initial','unset','revert','revert-layer','none',
    'serif','sans-serif','monospace','cursive','fantasy',
    'system-ui','ui-sans-serif','ui-serif','ui-monospace','ui-rounded',
    'math','emoji','fangsong',
    '-apple-system','BlinkMacSystemFont','Segoe UI','Roboto','Helvetica Neue',
    'Arial','sans','Helvetica'
  ]);

  function firstRealFamily(fontFamilyValue) {
    if (!fontFamilyValue) return null;
    var parts = fontFamilyValue.split(',');
    for (var i = 0; i < parts.length; i++) {
      var name = parts[i].trim().replace(/^["']|["']$/g, '');
      if (!name) continue;
      if (GENERIC.has(name)) continue;
      if (GENERIC.has(name.toLowerCase())) continue;
      return name;
    }
    return null;
  }

  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed','pointer-events:none','z-index:2147483646',
    'border:2px solid #c9933a','background:rgba(201,147,58,0.08)',
    'transition:all 60ms ease-out','display:none','box-sizing:border-box',
    'border-radius:2px'
  ].join(';');
  document.documentElement.appendChild(overlay);

  var label = document.createElement('div');
  label.style.cssText = [
    'position:fixed','pointer-events:none','z-index:2147483647',
    'background:#1a1a1a','color:#f4efe6','font:600 11px/1.4 -apple-system,BlinkMacSystemFont,sans-serif',
    'padding:5px 9px','border-radius:3px','letter-spacing:0.02em',
    'display:none','white-space:nowrap','box-shadow:0 2px 8px rgba(0,0,0,0.2)'
  ].join(';');
  document.documentElement.appendChild(label);

  function positionOverlay(el) {
    var r = el.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    overlay.style.display = 'block';

    label.style.left = r.left + 'px';
    label.style.top = Math.max(0, r.top - 26) + 'px';
    label.style.display = 'block';
  }

  function hide() {
    overlay.style.display = 'none';
    label.style.display = 'none';
  }

  var lastEl = null;
  var lastFont = null;

  document.addEventListener('mouseover', function(e) {
    var el = e.target;
    if (!el || el === overlay || el === label) return;
    if (el.nodeType !== 1) return;
    var cs = getComputedStyle(el);
    var font = firstRealFamily(cs.fontFamily);
    if (!font) { hide(); lastEl = null; lastFont = null; return; }
    lastEl = el;
    lastFont = font;
    label.textContent = font;
    positionOverlay(el);
    parent.postMessage({ source:'typestuff-inspector', type:'hover', font: font }, '*');
  }, true);

  document.addEventListener('mouseout', function(e) {
    // hide when leaving the document (relatedTarget null)
    if (!e.relatedTarget) {
      hide();
      parent.postMessage({ source:'typestuff-inspector', type:'leave' }, '*');
    }
  }, true);

  document.addEventListener('click', function(e) {
    // Only pin on modifier-click — plain clicks pass through so the user
    // can dismiss popups, close modals, follow links, etc.
    if (!lastFont) return;
    if (!(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    e.stopPropagation();
    parent.postMessage({ source:'typestuff-inspector', type:'pin', font: lastFont }, '*');
  }, true);

  // Reposition on scroll/resize so the overlay tracks the element
  function reposition() {
    if (lastEl && overlay.style.display !== 'none') positionOverlay(lastEl);
  }
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
})();</script>
`.trim();

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, script + '</body>');
  }
  return html + script;
}
