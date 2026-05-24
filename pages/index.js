import { useState, useRef, useEffect, useMemo } from 'react';
import Head from 'next/head';

const SOURCE_META = {
  'Google Fonts':   { color: '#1a7a42', bg: '#e8f5ee', label: 'Google Fonts' },
  'Adobe Fonts':    { color: '#b84400', bg: '#fdf0e8', label: 'Adobe Fonts'  },
  '@font-face':     { color: '#5b3fa8', bg: '#f0ecfc', label: '@font-face'   },
  'CSS':            { color: '#1a52a8', bg: '#eaf0fc', label: 'CSS'          },
  'Inline':         { color: '#9d1f6a', bg: '#fce8f4', label: 'Inline'       },
};

function normalize(name) {
  // Strip all non-alphanumeric so "SainteColombe", "Sainte Colombe", and
  // "sainte-colombe" all collapse to the same key for matching.
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function purveyorLinks(font) {
  const cleaned = font.displayName || font.name;
  const q = encodeURIComponent(cleaned);
  const plus = cleaned.replace(/ /g, '+');
  // Use Google site-scoped search for foundries whose own search URLs are
  // unstable or 404 on miss (MyFonts, Fonts in Use). Direct search is kept
  // for sites where it actually returns useful results.
  const siteSearch = (site) =>
    `https://www.google.com/search?q=${encodeURIComponent(`${cleaned} site:${site}`)}`;

  const links = [];

  if (font.sources.includes('Google Fonts')) {
    links.push({ label: 'Google Fonts', href: `https://fonts.google.com/specimen/${plus}` });
  } else {
    links.push({ label: 'Google Fonts', href: `https://fonts.google.com/?query=${q}` });
  }
  links.push({ label: 'Adobe Fonts',  href: `https://fonts.adobe.com/search?query=${q}` });
  links.push({ label: 'Fontshare',    href: `https://www.fontshare.com/?q=${q}` });
  links.push({ label: 'MyFonts',      href: siteSearch('myfonts.com') });
  links.push({ label: 'Fonts in Use', href: siteSearch('fontsinuse.com') });
  links.push({ label: 'Web search',   href: `https://www.google.com/search?q=${encodeURIComponent(cleaned + ' typeface')}` });

  return links;
}

function Badge({ source }) {
  const meta = SOURCE_META[source] || { color: '#666', bg: '#eee', label: source };
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '2px 6px',
      borderRadius: '2px',
      background: meta.bg,
      color: meta.color,
    }}>
      {meta.label}
    </span>
  );
}

function FontModule({ font, index, count, isHovered, isPinned, onClick }) {
  const links = useMemo(() => purveyorLinks(font), [font]);
  const expanded = isPinned;

  const borderColor = isPinned
    ? '#1a1a1a'
    : isHovered
    ? '#c9933a'
    : '#e4ddd2';
  const bg = isPinned ? '#fffaf0' : isHovered ? '#fdf6e8' : '#fff';

  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: '5px',
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
        animation: 'fadeUp 0.3s ease both',
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}>
        <div style={{
          fontSize: '9px',
          color: '#c0b8ae',
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {count > 0 && (
            <div style={{
              fontSize: '9px',
              color: '#9a9080',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}>
              {count} use{count !== 1 ? 's' : ''}
            </div>
          )}
          {isPinned && (
            <div style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#c9933a',
            }}>
              ● pinned
            </div>
          )}
        </div>
      </div>

      <div style={{
        fontSize: 'clamp(16px, 2.2vw, 20px)',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        color: '#1a1a1a',
        fontFamily: `"${font.name}", "${font.displayName || font.name}", sans-serif`,
        wordBreak: 'break-word',
      }}>
        {font.displayName || font.name}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {font.sources.map(src => <Badge key={src} source={src} />)}
      </div>

      {expanded && (
        <div style={{
          marginTop: '4px',
          paddingTop: '10px',
          borderTop: '1px dashed #e4ddd2',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <div style={{
            fontSize: '9px',
            color: '#b0a898',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}>
            Find on
          </div>
          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: '12px',
                color: '#1a1a1a',
                textDecoration: 'none',
                padding: '4px 0',
                borderBottom: '1px solid #f0ebe0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{link.label}</span>
              <span style={{ color: '#b0a898', fontSize: '11px' }}>↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [fonts, setFonts] = useState([]);
  const [scannedUrl, setScannedUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hoveredFont, setHoveredFont] = useState(null);
  const [pinnedFont, setPinnedFont] = useState(null);
  const [usageCounts, setUsageCounts] = useState({}); // { normalizedKey: count }
  const [showSecondary, setShowSecondary] = useState(false);
  const inputRef = useRef(null);
  const iframeRef = useRef(null);

  // Listen for inspector postMessages from the proxied iframe
  useEffect(() => {
    function onMessage(e) {
      const data = e.data;
      if (!data || data.source !== 'typestuff-inspector') return;
      if (data.type === 'hover') setHoveredFont(data.font);
      else if (data.type === 'leave') setHoveredFont(null);
      else if (data.type === 'pin') {
        setPinnedFont(data.font);
        setHoveredFont(data.font);
      } else if (data.type === 'tally' && data.counts) {
        setUsageCounts(prev => ({ ...prev, ...data.counts }));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Ask the iframe to scroll-to + flash-highlight the first instance of a font
  const findInPreview = (font) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const msg = {
      source: 'typestuff-parent',
      type: 'find',
      font: font.displayName || font.name,
    };
    win.postMessage(msg, '*');
    // Belt-and-suspenders for the race against inspector script readiness
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage(msg, '*'), 250);
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage(msg, '*'), 800);
  };

  const countFor = (font) => {
    return (
      usageCounts[normalize(font.name)] ||
      usageCounts[normalize(font.displayName || '')] ||
      0
    );
  };

  // Auto-scroll pinned/hovered module into view in the sidebar
  useEffect(() => {
    const target = pinnedFont || hoveredFont;
    if (!target) return;
    const norm = normalize(target);
    const idx = fonts.findIndex(f => normalize(f.name) === norm || normalize(f.name).includes(norm) || norm.includes(normalize(f.name)));
    if (idx === -1) return;
    const el = document.querySelector(`[data-font-idx="${idx}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [pinnedFont, hoveredFont, fonts]);

  const scan = async () => {
    const target = url.trim();
    if (!target || status === 'loading') return;

    setStatus('loading');
    setFonts([]);
    setErrorMsg('');
    setPinnedFont(null);
    setHoveredFont(null);
    setUsageCounts({});
    setShowSecondary(false);
    setScannedUrl(target);

    try {
      const res = await fetch(`/api/scan?url=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setFonts(data.fonts);
      setStatus('done');
    } catch (e) {
      setErrorMsg(e.message);
      setStatus('error');
    }
  };

  const handleKey = e => { if (e.key === 'Enter') scan(); };

  const reset = () => {
    setStatus('idle');
    setFonts([]);
    setUrl('');
    setScannedUrl('');
    setPinnedFont(null);
    setHoveredFont(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const matches = (fontName, target) => {
    if (!target) return false;
    const a = normalize(fontName);
    const b = normalize(target);
    return a === b || a.includes(b) || b.includes(a);
  };

  const proxyUrl = scannedUrl
    ? `/api/proxy?url=${encodeURIComponent(scannedUrl)}`
    : '';

  // ─── Landing state ────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <>
        <Head>
          <title>type stuff.</title>
          <meta name="description" content="Paste a URL. Get the fonts. No devtools needed." />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
        }}>
          <div style={{ maxWidth: '660px', width: '100%' }}>
            <h1 style={{
              fontSize: 'clamp(56px, 12vw, 108px)',
              fontWeight: 900,
              letterSpacing: '-0.045em',
              lineHeight: 0.88,
              textTransform: 'lowercase',
            }}>
              type<br />
              <span style={{ color: '#c9933a' }}>stuff.</span>
            </h1>
            <p style={{
              marginTop: '14px',
              fontSize: '13px',
              color: '#9a9080',
              letterSpacing: '0.02em',
            }}>
              Paste a URL. Get the fonts. Hover the preview to inspect.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '32px' }}>
              <input
                ref={inputRef}
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. are.na or tracksmith.com"
                autoFocus
                style={{
                  flex: 1,
                  background: '#fff',
                  border: '1.5px solid #d0c8bc',
                  borderRadius: '4px',
                  padding: '13px 16px',
                  fontSize: '15px',
                  color: '#1a1a1a',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={scan}
                style={{
                  background: '#1a1a1a',
                  color: '#f4efe6',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '13px 22px',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  letterSpacing: '0.03em',
                  cursor: 'pointer',
                }}
              >
                scan →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Working state (loading / done / error) ───────────────────────
  return (
    <>
      <Head>
        <title>{scannedUrl} — type stuff.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* ── Top bar ── */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '12px 18px',
          borderBottom: '1px solid #ddd5c8',
          background: '#f4efe6',
          flexShrink: 0,
        }}>
          <div
            onClick={reset}
            style={{
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              cursor: 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            type<span style={{ color: '#c9933a' }}>stuff.</span>
          </div>

          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKey}
            placeholder="paste a URL"
            style={{
              flex: 1,
              maxWidth: '560px',
              background: '#fff',
              border: '1.5px solid #d0c8bc',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: '13px',
              color: '#1a1a1a',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={scan}
            disabled={status === 'loading'}
            style={{
              background: status === 'loading' ? '#c8c0b6' : '#1a1a1a',
              color: '#f4efe6',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'loading' ? 'scanning…' : 'scan →'}
          </button>

          {status === 'done' && (
            <div style={{
              background: '#1a1a1a',
              color: '#f4efe6',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 11px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
            }}>
              {fonts.length} typeface{fonts.length !== 1 ? 's' : ''}
            </div>
          )}
        </header>

        {/* ── Two-pane body ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
        }}>
          {/* Sidebar */}
          <aside style={{
            width: '340px',
            flexShrink: 0,
            borderRight: '1px solid #ddd5c8',
            background: '#faf6ed',
            overflowY: 'auto',
            padding: '14px',
          }}>
            {status === 'loading' && (
              <div style={{
                fontSize: '12px',
                color: '#b0a898',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 4px',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#c9933a',
                  animation: 'pulse 1.2s ease-in-out infinite',
                }} />
                Fetching {scannedUrl}
              </div>
            )}

            {status === 'error' && (
              <div style={{
                background: '#fff5f5',
                border: '1.5px solid #f5c5c5',
                borderRadius: '4px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#c0392b',
              }}>
                <strong>Couldn't reach that site.</strong>{' '}
                <span style={{ color: '#b0a898' }}>
                  {errorMsg || 'Site may be blocking external requests.'}
                </span>
              </div>
            )}

            {status === 'done' && fonts.length === 0 && (
              <div style={{
                border: '1.5px dashed #d0c8bc',
                borderRadius: '4px',
                padding: '24px',
                textAlign: 'center',
                color: '#b0a898',
                fontSize: '13px',
              }}>
                No typefaces detected — site may use system fonts or JS-loaded type.
              </div>
            )}

            {status === 'done' && fonts.length > 0 && (() => {
              // Sort by usage count desc; split into primary (used 3+ times)
              // and secondary (rare / fallback-only). Until counts arrive
              // from the iframe, everything stays in primary.
              const PRIMARY_MIN = 3;
              const sorted = [...fonts].sort((a, b) => countFor(b) - countFor(a));
              const haveCounts = Object.keys(usageCounts).length > 0;
              const primary = haveCounts
                ? sorted.filter(f => countFor(f) >= PRIMARY_MIN)
                : sorted;
              const secondary = haveCounts
                ? sorted.filter(f => countFor(f) < PRIMARY_MIN)
                : [];

              const renderModule = (font, i) => (
                <div key={font.name} data-font-idx={i}>
                  <FontModule
                    font={font}
                    index={i}
                    count={countFor(font)}
                    isHovered={matches(font.name, hoveredFont)}
                    isPinned={matches(font.name, pinnedFont)}
                    onClick={() => {
                      const isPinned = pinnedFont && matches(font.name, pinnedFont);
                      if (isPinned) {
                        setPinnedFont(null);
                      } else {
                        setPinnedFont(font.name);
                        findInPreview(font);
                      }
                    }}
                  />
                </div>
              );

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {primary.length === 0 && secondary.length > 0 && (
                    <div style={{
                      fontSize: '11px',
                      color: '#b0a898',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '4px 2px',
                    }}>
                      Only fallback fonts detected
                    </div>
                  )}
                  {primary.map(renderModule)}

                  {secondary.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowSecondary(s => !s)}
                        style={{
                          marginTop: '10px',
                          background: 'transparent',
                          border: '1px dashed #d0c8bc',
                          borderRadius: '4px',
                          padding: '10px 12px',
                          fontSize: '11px',
                          color: '#9a9080',
                          fontFamily: 'inherit',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>
                          {showSecondary ? '−' : '+'} {secondary.length} rarely used
                        </span>
                        <span style={{ fontSize: '10px', color: '#c0b8ae' }}>
                          {showSecondary ? 'hide' : 'show'}
                        </span>
                      </button>
                      {showSecondary && secondary.map((f, i) => renderModule(f, primary.length + i))}
                    </>
                  )}
                </div>
              );
            })()}
          </aside>

          {/* Preview */}
          <main style={{
            flex: 1,
            position: 'relative',
            background: '#fff',
            minWidth: 0,
          }}>
            {status === 'loading' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b0a898',
                fontSize: '13px',
                letterSpacing: '0.04em',
              }}>
                Loading preview…
              </div>
            )}

            {(status === 'done' || status === 'error') && proxyUrl && (
              <iframe
                ref={iframeRef}
                src={proxyUrl}
                title="preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  background: '#fff',
                }}
              />
            )}

            {status === 'done' && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                background: 'rgba(26,26,26,0.85)',
                color: '#f4efe6',
                fontSize: '11px',
                padding: '6px 10px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
              }}>
                hover to inspect · ⌘-click to pin · click sidebar to find
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
