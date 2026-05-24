import { useState, useRef } from 'react';
import Head from 'next/head';

const SOURCE_META = {
  'Google Fonts':   { color: '#1a7a42', bg: '#e8f5ee', label: 'Google Fonts' },
  'Adobe Fonts':    { color: '#b84400', bg: '#fdf0e8', label: 'Adobe Fonts'  },
  '@font-face':     { color: '#5b3fa8', bg: '#f0ecfc', label: '@font-face'   },
  'CSS':            { color: '#1a52a8', bg: '#eaf0fc', label: 'CSS'          },
  'Inline':         { color: '#9d1f6a', bg: '#fce8f4', label: 'Inline'       },
};

function Badge({ source }) {
  const meta = SOURCE_META[source] || { color: '#666', bg: '#eee', label: source };
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '3px 7px',
      borderRadius: '2px',
      background: meta.bg,
      color: meta.color,
    }}>
      {meta.label}
    </span>
  );
}

function FontCard({ font, index }) {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e4ddd2',
      borderRadius: '6px',
      padding: '20px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      animation: 'fadeUp 0.3s ease both',
      animationDelay: `${index * 50}ms`,
    }}>
      <div style={{
        fontSize: '10px',
        color: '#c0b8ae',
        fontWeight: 700,
        letterSpacing: '0.1em',
      }}>
        {String(index + 1).padStart(2, '0')}
      </div>

      <div style={{
        fontSize: 'clamp(18px, 4vw, 26px)',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        lineHeight: 1.05,
        color: '#1a1a1a',
        fontFamily: `"${font.name}", sans-serif`,
        wordBreak: 'break-word',
      }}>
        {font.name}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
        {font.sources.map(src => <Badge key={src} source={src} />)}
        {font.sources.includes('Google Fonts') && (
          <a
            href={`https://fonts.google.com/specimen/${font.name.replace(/ /g, '+')}`}
            target="_blank"
            rel="noreferrer"
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: '#b0a898',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ↗ GF
          </a>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [fonts, setFonts] = useState([]);
  const [scannedUrl, setScannedUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const scan = async () => {
    const target = url.trim();
    if (!target || status === 'loading') return;

    setStatus('loading');
    setFonts([]);
    setErrorMsg('');
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
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      <Head>
        <title>type stuff.</title>
        <meta name="description" content="Paste a URL. Get the fonts. No devtools needed." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="type stuff." />
        <meta property="og:description" content="Paste a URL. Get the fonts." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <header style={{
          padding: 'clamp(32px, 6vw, 56px) clamp(24px, 5vw, 56px) 0',
          maxWidth: '900px',
          width: '100%',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            {/* Wordmark */}
            <div>
              <h1
                onClick={reset}
                style={{
                  fontSize: 'clamp(56px, 12vw, 108px)',
                  fontWeight: 900,
                  letterSpacing: '-0.045em',
                  lineHeight: 0.88,
                  textTransform: 'lowercase',
                  cursor: status !== 'idle' ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                type<br />
                <span style={{ color: '#c9933a' }}>stuff.</span>
              </h1>
              <p style={{
                marginTop: '14px',
                fontSize: '13px',
                color: '#9a9080',
                letterSpacing: '0.02em',
              }}>
                Paste a URL. Get the fonts. No devtools.
              </p>
            </div>

            {/* Result count pill */}
            {status === 'done' && (
              <div style={{
                background: '#1a1a1a',
                color: '#f4efe6',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                borderRadius: '3px',
                alignSelf: 'flex-start',
                marginTop: '8px',
              }}>
                {fonts.length} typeface{fonts.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div style={{
            height: '1.5px',
            background: '#ddd5c8',
            margin: '28px 0 0',
          }} />
        </header>

        {/* ── Main ── */}
        <main style={{
          flex: 1,
          padding: 'clamp(24px, 4vw, 40px) clamp(24px, 5vw, 56px) 80px',
          maxWidth: '900px',
          width: '100%',
          margin: '0 auto',
        }}>

          {/* Input row */}
          <div style={{ display: 'flex', gap: '8px', maxWidth: '660px' }}>
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. are.na or tracksmith.com"
              style={{
                flex: 1,
                background: '#fff',
                border: '1.5px solid #d0c8bc',
                borderRadius: '4px',
                padding: '13px 16px',
                fontSize: '15px',
                color: '#1a1a1a',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#1a1a1a'}
              onBlur={e => e.target.style.borderColor = '#d0c8bc'}
            />
            <button
              onClick={scan}
              disabled={status === 'loading'}
              style={{
                background: status === 'loading' ? '#c8c0b6' : '#1a1a1a',
                color: '#f4efe6',
                border: 'none',
                borderRadius: '4px',
                padding: '13px 22px',
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: 'inherit',
                letterSpacing: '0.03em',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {status === 'loading' ? (
                <>
                  <div style={{
                    width: '13px', height: '13px',
                    border: '2px solid #a09888',
                    borderTopColor: '#f4efe6',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                  scanning
                </>
              ) : 'scan →'}
            </button>
          </div>

          {/* Loading state */}
          {status === 'loading' && (
            <div style={{
              marginTop: '28px',
              fontSize: '12px',
              color: '#b0a898',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#c9933a',
                animation: 'pulse 1.2s ease-in-out infinite',
              }} />
              Fetching {scannedUrl}
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={{
              marginTop: '24px',
              background: '#fff5f5',
              border: '1.5px solid #f5c5c5',
              borderRadius: '4px',
              padding: '14px 18px',
              fontSize: '13px',
              color: '#c0392b',
              maxWidth: '660px',
            }}>
              <strong>Couldn't reach that site.</strong>{' '}
              <span style={{ color: '#b0a898' }}>
                {errorMsg || 'The site may be blocking external requests.'}
              </span>
            </div>
          )}

          {/* Results */}
          {status === 'done' && (
            <div style={{ marginTop: '36px' }}>
              <div style={{
                fontSize: '11px',
                color: '#b0a898',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}>
                {scannedUrl}
              </div>

              {fonts.length === 0 ? (
                <div style={{
                  border: '1.5px dashed #d0c8bc',
                  borderRadius: '4px',
                  padding: '40px',
                  textAlign: 'center',
                  color: '#b0a898',
                  fontSize: '14px',
                  maxWidth: '660px',
                }}>
                  No typefaces detected — site may use system fonts or JS-loaded type.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '10px',
                }}>
                  {fonts.map((font, i) => (
                    <FontCard key={font.name} font={font} index={i} />
                  ))}
                </div>
              )}

              <p style={{
                marginTop: '28px',
                fontSize: '11px',
                color: '#c0b8ae',
                lineHeight: 1.7,
                maxWidth: '520px',
              }}>
                Fonts loaded via JavaScript bundles won't appear here — for those you still need devtools on desktop.
                {' '}<span
                  onClick={reset}
                  style={{ color: '#9a9080', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Scan another site →
                </span>
              </p>
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: '1px solid #ddd5c8',
          padding: '18px clamp(24px, 5vw, 56px)',
          maxWidth: '900px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <span style={{ fontSize: '11px', color: '#c0b8ae', letterSpacing: '0.06em' }}>
            TYPE STUFF — font scanner
          </span>
          <span style={{ fontSize: '11px', color: '#d0c8bc', letterSpacing: '0.04em' }}>
            no devtools needed.
          </span>
        </footer>
      </div>
    </>
  );
}
