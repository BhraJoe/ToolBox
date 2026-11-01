import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  FileCode,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  decodeJwt,
  formatUnixTimestamp,
  getExpirationStatus,
  getNotBeforeStatus,
  getTokenStatus,
  type JwtDecoded,
} from '../../../utils/jwtDecoder';

type Tab = 'header' | 'payload' | 'signature';
type ActionMessage = { kind: 'success' | 'error'; text: string };

function encodeExamplePart(value: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

const EXAMPLE_JWT = [
  encodeExamplePart({ alg: 'HS256', typ: 'JWT', kid: 'example-key-id' }),
  encodeExamplePart({
    iss: 'example.local',
    sub: 'demo-user',
    aud: ['toolbox-demo'],
    iat: 1762000000,
    exp: 4102444800,
    jti: 'example-token-id',
    name: 'Example User',
    note: 'Non-sensitive demo data; this token is not authenticated.',
  }),
  'ZXhhbXBsZS1zaWduYXR1cmU',
].join('.');

const TABS: { id: Tab; label: string }[] = [
  { id: 'header', label: 'Header' },
  { id: 'payload', label: 'Payload' },
  { id: 'signature', label: 'Signature' },
];

function formatClaim(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'Not provided';
  const formatted = JSON.stringify(value);
  return typeof formatted === 'string' ? formatted : String(value);
}

function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTab: Tab, setTab: (tab: Tab) => void) {
  const currentIndex = TABS.findIndex(({ id }) => id === currentTab);
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextTab = TABS[(currentIndex + direction + TABS.length) % TABS.length];
    setTab(nextTab.id);
    document.getElementById(`jwt-tab-${nextTab.id}`)?.focus();
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    const nextTab = event.key === 'Home' ? TABS[0] : TABS[TABS.length - 1];
    setTab(nextTab.id);
    document.getElementById(`jwt-tab-${nextTab.id}`)?.focus();
  }
}

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState<JwtDecoded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('header');
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const canReadClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.readText === 'function';
  const canWriteClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.writeText === 'function';

  const handleDecode = () => {
    setMessage(null);
    const result = decodeJwt(token);
    if (!result.success) {
      setDecoded(null);
      setError(result.error);
      return;
    }
    setError(null);
    setDecoded(result.data);
    setActiveTab('header');
  };

  const handlePaste = async () => {
    if (!canReadClipboard) {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      setToken(text);
      setDecoded(null);
      setError(null);
      setMessage({ kind: 'success', text: 'Token pasted. Select Decode Token to inspect it.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to read the clipboard. Check browser permissions and try again.' });
    }
  };

  const handleClear = () => {
    setToken('');
    setDecoded(null);
    setError(null);
    setMessage(null);
    setActiveTab('header');
  };

  const handleLoadExample = () => {
    setToken(EXAMPLE_JWT);
    setDecoded(null);
    setError(null);
    setMessage({ kind: 'success', text: 'Example token loaded. It is demo data and is not authenticated; select Decode Token to inspect it.' });
  };

  const copyText = async (text: string, label: string) => {
    if (!canWriteClipboard) {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ kind: 'success', text: `${label} copied to the clipboard.` });
    } catch {
      setMessage({ kind: 'error', text: `Unable to copy ${label.toLowerCase()}. Check browser permissions and try again.` });
    }
  };

  const handleDownload = () => {
    if (!decoded) return;
    try {
      const blob = new Blob(
        [JSON.stringify({ header: decoded.header, payload: decoded.payload }, null, 2)],
        { type: 'application/json;charset=utf-8' },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'jwt-decoded.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage({ kind: 'success', text: 'Decoded header and payload downloaded.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to download decoded data in this browser.' });
    }
  };

  const expiration = decoded ? getExpirationStatus(decoded.payload.exp, now) : null;
  const notBefore = decoded ? getNotBeforeStatus(decoded.payload.nbf, now) : null;
  const tokenStatus = decoded ? getTokenStatus(decoded.payload.exp, decoded.payload.nbf, now) : null;
  const tabPanelId = `jwt-panel-${activeTab}`;

  return (
    <div className="jwt-decoder">
      <div className="jwt-decoder__security" role="note">
        <ShieldAlert size={20} aria-hidden="true" />
        <p>
          <strong>Decoding does not verify a JWT signature.</strong> Anyone can decode a JWT payload.
          Do not trust its contents until a trusted system verifies the signature using the appropriate
          key and algorithm. This browser tool only reads the header and payload; it does not verify tokens.
        </p>
      </div>

      <section className="jwt-decoder__panel" aria-labelledby="jwt-input-title">
        <div className="jwt-decoder__input-header">
          <div className="jwt-decoder__section-title" id="jwt-input-title">
            <FileCode size={18} aria-hidden="true" />
            <span>JWT Token</span>
          </div>
          <div className="jwt-decoder__input-actions">
            <button type="button" className="jwt-decoder__btn" onClick={handleLoadExample}>
              Load Example
            </button>
            {canReadClipboard && (
              <button type="button" className="jwt-decoder__btn" onClick={handlePaste}>
                <ClipboardPaste size={16} aria-hidden="true" /> Paste Token
              </button>
            )}
            <button type="button" className="jwt-decoder__btn" onClick={handleClear}>
              <RotateCcw size={16} aria-hidden="true" /> Clear
            </button>
          </div>
        </div>
        <label className="jwt-decoder__sr-only" htmlFor="jwt-token-input">JWT token input</label>
        <textarea
          id="jwt-token-input"
          className="jwt-decoder__textarea"
          placeholder="Paste a compact JWT: header.payload.signature"
          value={token}
          onChange={(event) => {
            setToken(event.target.value);
            setDecoded(null);
            setError(null);
            setMessage(null);
          }}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-describedby="jwt-token-help"
        />
        <p className="jwt-decoder__helper" id="jwt-token-help">
          Your token stays in this browser. It is not sent to a server. Decoding only happens when you select Decode Token.
        </p>
        <div className="jwt-decoder__input-footer">
          <button type="button" className="jwt-decoder__btn jwt-decoder__btn--primary" onClick={handleDecode}>
            Decode Token
          </button>
          <button
            type="button"
            className="jwt-decoder__btn"
            onClick={() => copyText(token.trim(), 'Entire token')}
            disabled={!token.trim()}
          >
            <Copy size={16} aria-hidden="true" /> Copy Entire Token
          </button>
        </div>
        {error && <div className="jwt-decoder__error" role="alert">{error}</div>}
        {message && (
          <div
            className={`jwt-decoder__message jwt-decoder__message--${message.kind}`}
            role={message.kind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {message.kind === 'success' && <Check size={16} aria-hidden="true" />}
            {message.kind === 'error' && <AlertTriangle size={16} aria-hidden="true" />}
            {message.text}
          </div>
        )}
      </section>

      {decoded && tokenStatus && expiration && notBefore && (
        <>
          <section className="jwt-decoder__panel jwt-decoder__claims" aria-labelledby="jwt-claims-title">
            <div className="jwt-decoder__panel-heading">
              <div>
                <h2 id="jwt-claims-title">Claims Inspector</h2>
                <p>Decoded timestamp claims and standard identifiers</p>
              </div>
              <span className={`jwt-decoder__badge jwt-decoder__badge--${tokenStatus.badge}`}>
                {tokenStatus.text}
              </span>
            </div>
            <div className="jwt-decoder__claim-grid">
              <div className="jwt-decoder__claim-card">
                <span className="jwt-decoder__claim-label">Expiration (exp)</span>
                <strong className={`jwt-decoder__badge jwt-decoder__badge--${expiration.badge}`}>
                  {expiration.text}
                </strong>
                {decoded.payload.exp !== undefined ? (
                  <>
                    <span className="jwt-decoder__claim-value">{formatUnixTimestamp(decoded.payload.exp)}</span>
                    <span className="jwt-decoder__claim-meta">Unix timestamp: {formatClaim(decoded.payload.exp)} seconds</span>
                    {expiration.details && <span className="jwt-decoder__claim-meta">{expiration.details}</span>}
                  </>
                ) : <span className="jwt-decoder__claim-meta">No expiration claim was provided.</span>}
              </div>
              <div className="jwt-decoder__claim-card">
                <span className="jwt-decoder__claim-label">Not Before (nbf)</span>
                <strong className={`jwt-decoder__badge jwt-decoder__badge--${notBefore.badge}`}>
                  {notBefore.text}
                </strong>
                {decoded.payload.nbf !== undefined ? (
                  <>
                    <span className="jwt-decoder__claim-value">{formatUnixTimestamp(decoded.payload.nbf)}</span>
                    <span className="jwt-decoder__claim-meta">Unix timestamp: {formatClaim(decoded.payload.nbf)} seconds</span>
                    {notBefore.details && <span className="jwt-decoder__claim-meta">{notBefore.details}</span>}
                  </>
                ) : <span className="jwt-decoder__claim-meta">No not-before claim was provided.</span>}
              </div>
              <div className="jwt-decoder__claim-card">
                <span className="jwt-decoder__claim-label">Issued At (iat)</span>
                {decoded.payload.iat !== undefined ? (
                  <>
                    <span className="jwt-decoder__claim-value">{formatUnixTimestamp(decoded.payload.iat)}</span>
                    <span className="jwt-decoder__claim-meta">Unix timestamp: {formatClaim(decoded.payload.iat)} seconds</span>
                  </>
                ) : <span className="jwt-decoder__claim-meta">No issued-at claim was provided.</span>}
              </div>
            </div>
            <div className="jwt-decoder__claim-list">
              {(['iss', 'sub', 'aud', 'jti'] as const).map((claim) => (
                decoded.payload[claim] !== undefined && (
                  <div className="jwt-decoder__claim-row" key={claim}>
                    <span className="jwt-decoder__claim-label">{{
                      iss: 'Issuer (iss)',
                      sub: 'Subject (sub)',
                      aud: 'Audience (aud)',
                      jti: 'JWT ID (jti)',
                    }[claim]}</span>
                    <span className="jwt-decoder__claim-value">{formatClaim(decoded.payload[claim])}</span>
                  </div>
                )
              ))}
            </div>
            <p className="jwt-decoder__status-note">
              Status reflects decoded timestamp claims only. It does not establish authenticity, signature validity, or API acceptance.
            </p>
          </section>

          <section className="jwt-decoder__panel jwt-decoder__results" aria-label="Decoded JWT sections">
            <div className="jwt-decoder__tabs" role="tablist" aria-label="JWT sections">
              {TABS.map(({ id, label }) => (
                <button
                  type="button"
                  role="tab"
                  id={`jwt-tab-${id}`}
                  aria-controls={`jwt-panel-${id}`}
                  aria-selected={activeTab === id}
                  tabIndex={activeTab === id ? 0 : -1}
                  className={`jwt-decoder__tab ${activeTab === id ? 'jwt-decoder__tab--active' : ''}`}
                  onClick={() => setActiveTab(id)}
                  onKeyDown={(event) => handleTabKeyDown(event, activeTab, setActiveTab)}
                  key={id}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="jwt-decoder__tab-panel"
              id={tabPanelId}
              role="tabpanel"
              aria-labelledby={`jwt-tab-${activeTab}`}
              tabIndex={0}
            >
              {activeTab === 'header' && (
                <div>
                  <div className="jwt-decoder__panel-heading">
                    <div>
                      <h2>Header (decoded)</h2>
                      <p>Algorithm and metadata declared by the token</p>
                    </div>
                    <button type="button" className="jwt-decoder__btn" onClick={() => copyText(decoded.headerJson, 'Header')}>
                      <Copy size={16} aria-hidden="true" /> Copy Header
                    </button>
                  </div>
                  <div className="jwt-decoder__header-claims">
                    {(['alg', 'typ', 'kid', 'cty'] as const).map((field) => (
                      decoded.header[field] !== undefined && (
                        <div className="jwt-decoder__header-claim" key={field}>
                          <span>{field}</span>
                          <strong>{formatClaim(decoded.header[field])}</strong>
                        </div>
                      )
                    ))}
                  </div>
                  <pre className="jwt-decoder__code">{decoded.headerJson}</pre>
                  <p className="jwt-decoder__status-note">
                    The alg field describes the algorithm declared in the token; it does not prove that the signature is trustworthy.
                  </p>
                </div>
              )}
              {activeTab === 'payload' && (
                <div>
                  <div className="jwt-decoder__panel-heading">
                    <div>
                      <h2>Payload (decoded)</h2>
                      <p>All claims, including custom claims</p>
                    </div>
                    <div className="jwt-decoder__panel-actions">
                      <button type="button" className="jwt-decoder__btn" onClick={() => copyText(decoded.payloadJson, 'Payload')}>
                        <Copy size={16} aria-hidden="true" /> Copy Payload
                      </button>
                      <button type="button" className="jwt-decoder__btn" onClick={handleDownload}>
                        <Download size={16} aria-hidden="true" /> Download JSON
                      </button>
                    </div>
                  </div>
                  <pre className="jwt-decoder__code">{decoded.payloadJson}</pre>
                </div>
              )}
              {activeTab === 'signature' && (
                <div>
                  <div className="jwt-decoder__panel-heading">
                    <div>
                      <h2>Signature (encoded)</h2>
                      <p>{decoded.rawSignature.length} encoded characters</p>
                    </div>
                    <button type="button" className="jwt-decoder__btn" onClick={() => copyText(decoded.rawSignature, 'Signature')}>
                      <Copy size={16} aria-hidden="true" /> Copy Signature
                    </button>
                  </div>
                  <pre className="jwt-decoder__code jwt-decoder__code--wrap">
                    {decoded.rawSignature || '(empty signature)'}
                  </pre>
                  <p className="jwt-decoder__status-note">
                    This is the original encoded signature section. It is not decoded or verified by this tool.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
