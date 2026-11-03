import { useRef, useState } from 'react';
import { Check, Clipboard, Download, RefreshCw, Trash2 } from 'lucide-react';
import {
  formatUuid,
  generateUuid,
  validateUuid,
  type UuidVersion,
} from '../../../utils/uuidGenerator';
import './uuid-generator.css';

const MAX_UUID_COUNT = 1000;
const QUANTITY_PRESETS = [1, 5, 10, 50, 100];
const MAX_HISTORY_BATCHES = 5;

interface UuidBatch {
  id: number;
  version: UuidVersion;
  uuids: string[];
  createdAt: Date;
}

function downloadUuids(uuids: string[], fileType: 'txt' | 'csv'): void {
  const content = fileType === 'csv'
    ? `uuid\n${uuids.map((uuid) => `"${uuid}"`).join('\n')}`
    : uuids.join('\n');
  const blob = new Blob([content], {
    type: fileType === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  link.href = objectUrl;
  link.download = `uuids-${date}.${fileType}`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function getDisplayTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Timestamp is outside the supported date range.' : date.toLocaleString();
}

export default function UuidGenerator() {
  const [version, setVersion] = useState<UuidVersion>(4);
  const [quantity, setQuantity] = useState('10');
  const [uppercase, setUppercase] = useState(false);
  const [hyphenated, setHyphenated] = useState(true);
  const [uuids, setUuids] = useState<string[]>([]);
  const [history, setHistory] = useState<UuidBatch[]>([]);
  const [message, setMessage] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [validatorInput, setValidatorInput] = useState('');
  const [validation, setValidation] = useState<ReturnType<typeof validateUuid> | null>(null);
  const nextBatchId = useRef(1);

  const displayUuid = (uuid: string) => formatUuid(uuid, uppercase, hyphenated);

  const generate = () => {
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > MAX_UUID_COUNT) {
      setQuantityError(`Enter a whole number between 1 and ${MAX_UUID_COUNT.toLocaleString()}.`);
      setMessage('');
      return;
    }

    try {
      const generated = Array.from({ length: count }, () => generateUuid(version));
      const batch: UuidBatch = {
        id: nextBatchId.current,
        version,
        uuids: generated,
        createdAt: new Date(),
      };
      nextBatchId.current += 1;
      setUuids(generated);
      setHistory((previous) => [batch, ...previous].slice(0, MAX_HISTORY_BATCHES));
      setQuantityError('');
      setMessage(`Generated ${generated.length.toLocaleString()} UUID${generated.length === 1 ? '' : 's'} (v${version}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate UUIDs.');
    }
  };

  const copyUuids = async (values: string[], label: string) => {
    try {
      await navigator.clipboard.writeText(values.map(displayUuid).join('\n'));
      setMessage(`${label} copied to the clipboard.`);
    } catch {
      setMessage('Could not access the clipboard. Check browser permissions and try again.');
    }
  };

  const downloadResults = (fileType: 'txt' | 'csv') => {
    try {
      downloadUuids(uuids.map(displayUuid), fileType);
      setMessage(`Downloaded ${uuids.length.toLocaleString()} UUIDs as ${fileType.toUpperCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to download UUIDs.');
    }
  };

  const validateInput = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidation(validateUuid(validatorInput));
  };

  const restoreBatch = (batch: UuidBatch) => {
    setUuids(batch.uuids);
    setVersion(batch.version);
    setMessage(`Restored batch #${batch.id}.`);
  };

  const timestampResult = uuids.length > 0 && version === 7
    ? validateUuid(uuids[0]).timestamp
    : null;

  return (
    <div className="uuid-generator">
      <div className="uuid-generator__grid">
        <section className="uuid-generator__panel" aria-labelledby="uuid-settings-title">
          <div className="uuid-generator__panel-heading">
            <h2 id="uuid-settings-title">Generation settings</h2>
            <p>Choose the UUID version and output format.</p>
          </div>

          <div className="uuid-generator__field">
            <label htmlFor="uuid-version">UUID version</label>
            <select
              id="uuid-version"
              value={version}
              onChange={(event) => setVersion(event.target.value === '7' ? 7 : 4)}
            >
              <option value={4}>UUID v4 — random</option>
              <option value={7}>UUID v7 — time-ordered</option>
            </select>
            <span className="uuid-generator__hint">
              {version === 4
                ? 'Random identifiers using cryptographically secure randomness.'
                : 'The current Unix timestamp is embedded for time ordering.'}
            </span>
          </div>

          <div className="uuid-generator__field">
            <label htmlFor="uuid-quantity">Number of UUIDs</label>
            <div className="uuid-generator__presets" aria-label="UUID quantity presets">
              {QUANTITY_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={quantity === String(preset) ? 'uuid-generator__preset uuid-generator__preset--active' : 'uuid-generator__preset'}
                  aria-pressed={quantity === String(preset)}
                  onClick={() => {
                    setQuantity(String(preset));
                    setQuantityError('');
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              id="uuid-quantity"
              type="number"
              min="1"
              max={MAX_UUID_COUNT}
              step="1"
              value={quantity}
              aria-invalid={Boolean(quantityError)}
              aria-describedby={quantityError ? 'uuid-quantity-error' : 'uuid-quantity-hint'}
              onChange={(event) => {
                setQuantity(event.target.value);
                setQuantityError('');
              }}
            />
            {quantityError
              ? <span id="uuid-quantity-error" className="uuid-generator__error">{quantityError}</span>
              : <span id="uuid-quantity-hint" className="uuid-generator__hint">Choose 1–{MAX_UUID_COUNT.toLocaleString()} UUIDs.</span>}
          </div>

          <fieldset className="uuid-generator__field uuid-generator__format">
            <legend>Output format</legend>
            <label>
              <input type="checkbox" checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} />
              Uppercase
            </label>
            <label>
              <input type="checkbox" checked={hyphenated} onChange={(event) => setHyphenated(event.target.checked)} />
              Standard hyphenated format
            </label>
          </fieldset>

          <div className="uuid-generator__actions">
            <button type="button" className="uuid-generator__button uuid-generator__button--primary" onClick={generate}>
              <RefreshCw size={17} />
              {uuids.length > 0 ? 'Regenerate UUIDs' : 'Generate UUIDs'}
            </button>
            {uuids.length > 0 && (
              <button
                type="button"
                className="uuid-generator__button uuid-generator__button--secondary"
                onClick={() => {
                  setUuids([]);
                  setMessage('Generated results cleared.');
                }}
              >
                <Trash2 size={16} />
                Clear results
              </button>
            )}
          </div>
        </section>

        <section className="uuid-generator__panel uuid-generator__info" aria-labelledby="uuid-info-title">
          <div className="uuid-generator__panel-heading">
            <h2 id="uuid-info-title">About UUIDs</h2>
            <p>Generated locally in your browser.</p>
          </div>
          <dl>
            <div><dt>Selected version</dt><dd>UUID v{version}</dd></div>
            <div><dt>Variant</dt><dd>RFC variant (10xx)</dd></div>
            {version === 7 && (
              <div>
                <dt>Embedded timestamp</dt>
                <dd>{timestampResult === null ? 'Shown after generation' : getDisplayTimestamp(timestampResult)}</dd>
              </div>
            )}
          </dl>
          <p className="uuid-generator__notice">
            UUIDs are designed to make collisions extremely unlikely, not mathematically impossible.
            They are identifiers—not passwords, secrets, or authentication tokens.
          </p>
        </section>
      </div>

      <section className="uuid-generator__panel uuid-generator__results" aria-labelledby="uuid-results-title">
        <div className="uuid-generator__results-heading">
          <div className="uuid-generator__panel-heading">
            <h2 id="uuid-results-title">Generated UUIDs</h2>
            <p>{uuids.length.toLocaleString()} {uuids.length === 1 ? 'result' : 'results'}</p>
          </div>
          {uuids.length > 0 && (
            <div className="uuid-generator__toolbar">
              <button type="button" onClick={() => void copyUuids(uuids, 'All UUIDs')}><Clipboard size={16} />Copy all</button>
              <button type="button" onClick={() => downloadResults('txt')}><Download size={16} />TXT</button>
              <button type="button" onClick={() => downloadResults('csv')}><Download size={16} />CSV</button>
            </div>
          )}
        </div>

        {uuids.length === 0 ? (
          <div className="uuid-generator__empty">Your generated UUIDs will appear here.</div>
        ) : (
          <ol className="uuid-generator__list" aria-label="Generated UUID results">
            {uuids.map((uuid, index) => (
              <li key={`${uuid}-${index}`}>
                <code>{displayUuid(uuid)}</code>
                <button
                  type="button"
                  className="uuid-generator__copy-one"
                  aria-label={`Copy UUID ${index + 1}`}
                  title={`Copy UUID ${index + 1}`}
                  onClick={() => void copyUuids([uuid], `UUID ${index + 1}`)}
                >
                  <Clipboard size={16} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {history.length > 0 && (
        <section className="uuid-generator__panel" aria-labelledby="uuid-history-title">
          <div className="uuid-generator__panel-heading">
            <h2 id="uuid-history-title">Recent batches</h2>
            <p>Kept in memory for this page session only.</p>
          </div>
          <ul className="uuid-generator__history">
            {history.map((batch) => (
              <li key={batch.id}>
                <div>
                  <strong>Batch #{batch.id} · v{batch.version}</strong>
                  <span>{batch.uuids.length.toLocaleString()} {batch.uuids.length === 1 ? 'UUID' : 'UUIDs'} · {batch.createdAt.toLocaleString()}</span>
                </div>
                <div>
                  <button type="button" onClick={() => restoreBatch(batch)}>Restore</button>
                  <button type="button" onClick={() => void copyUuids(batch.uuids, `Batch #${batch.id}`)}>Copy</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="uuid-generator__panel uuid-generator__validator" aria-labelledby="uuid-validator-title">
        <div className="uuid-generator__panel-heading">
          <h2 id="uuid-validator-title">UUID validator</h2>
          <p>Check structure only; this cannot verify how an identifier was generated or whether it is unique.</p>
        </div>
        <form onSubmit={validateInput}>
          <label htmlFor="uuid-validation-input">UUID to validate</label>
          <div className="uuid-generator__validator-row">
            <input
              id="uuid-validation-input"
              type="text"
              value={validatorInput}
              spellCheck={false}
              autoComplete="off"
              placeholder="Paste a standard or compact UUID"
              onChange={(event) => {
                setValidatorInput(event.target.value);
                setValidation(null);
              }}
            />
            <button type="submit" className="uuid-generator__button uuid-generator__button--primary">Validate UUID</button>
          </div>
        </form>
        {validation && (
          <div className={validation.valid ? 'uuid-generator__validation uuid-generator__validation--valid' : 'uuid-generator__validation uuid-generator__validation--invalid'} role="status">
            <strong>{validation.valid ? 'Valid UUID structure' : 'Invalid UUID structure'}</strong>
            {validation.error && <span>{validation.error}</span>}
            {validation.version !== null && <span>Version: {validation.version}</span>}
            {validation.variant && <span>Variant: {validation.variant}</span>}
            {validation.normalized && <span>Standard format: <code>{validation.normalized}</code></span>}
            {validation.timestamp !== null && (
              <span>UUID v7 timestamp: {getDisplayTimestamp(validation.timestamp)}</span>
            )}
          </div>
        )}
      </section>

      <p className="uuid-generator__feedback" role="status" aria-live="polite">
        {message && (message.startsWith('Could not') || message.startsWith('Secure') || message.startsWith('Unable') ? <span className="uuid-generator__feedback--error">{message}</span> : <span><Check size={15} />{message}</span>)}
      </p>
    </div>
  );
}
