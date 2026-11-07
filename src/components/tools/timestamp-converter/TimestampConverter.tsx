import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';
import {
  formatDateTime,
  formatHumanReadableDate,
  formatRelativeTime,
  getLocalDateTimeInputValue,
  getSupportedTimeZones,
  parseLocalDateTime,
  parseUnixTimestamp,
  type TimestampUnitMode,
} from '../../../utils/timestampConverter';
import './timestamp-converter.css';

type ConversionMode = 'timestamp-to-date' | 'date-to-timestamp';
type CopyStatus = { key: string; message: string } | null;

const TIME_ZONES = getSupportedTimeZones();
const LOCAL_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local timezone';

function getSelectedTimeZoneLabel(timeZone: string): string {
  return timeZone === 'local' ? `Local (${LOCAL_TIME_ZONE})` : timeZone;
}

function formatSelectedDate(date: Date, timeZone: string): string {
  return formatDateTime(date, timeZone === 'local' ? undefined : timeZone);
}

export default function TimestampConverter() {
  const [mode, setMode] = useState<ConversionMode>('timestamp-to-date');
  const [timestampInput, setTimestampInput] = useState('');
  const [timestampTouched, setTimestampTouched] = useState(false);
  const [unitMode, setUnitMode] = useState<TimestampUnitMode>('auto');
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [dateTimeTouched, setDateTimeTouched] = useState(false);
  const [timeZone, setTimeZone] = useState('local');
  const [now, setNow] = useState(() => Date.now());
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const timestampResult = useMemo(
    () => parseUnixTimestamp(timestampInput, unitMode),
    [timestampInput, unitMode],
  );
  const parsedDateTime = useMemo(() => parseLocalDateTime(dateTimeInput), [dateTimeInput]);
  const showTimestampError =
    !timestampResult.success && (Boolean(timestampInput) || timestampTouched);
  const dateTimeError =
    !parsedDateTime && (Boolean(dateTimeInput) || dateTimeTouched)
      ? dateTimeInput
        ? 'Enter a valid local date and time. Times skipped by a daylight-saving change are invalid.'
        : 'Choose a date and time to convert.'
      : '';
  const currentDate = new Date(now);
  const selectedTimeZoneLabel = getSelectedTimeZoneLabel(timeZone);

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus({ key, message: 'Copied to clipboard.' });
    } catch {
      setCopyStatus({
        key,
        message: 'Could not copy. Check your browser clipboard permissions.',
      });
    }
  };

  const getTimestampRows = () => {
    if (!timestampResult.success) return [];
    const { date, epochMilliseconds } = timestampResult.value;
    return [
      { key: 'local', label: 'Local date and time', value: formatDateTime(date) },
      { key: 'utc', label: 'UTC date and time', value: formatDateTime(date, 'UTC') },
      {
        key: 'selected',
        label: `Selected timezone (${selectedTimeZoneLabel})`,
        value: formatSelectedDate(date, timeZone),
      },
      { key: 'iso', label: 'ISO 8601', value: date.toISOString() },
      { key: 'human', label: 'Human-readable date', value: formatHumanReadableDate(date) },
      { key: 'seconds', label: 'Unix timestamp (seconds)', value: String(epochMilliseconds / 1000) },
      { key: 'milliseconds', label: 'Unix timestamp (milliseconds)', value: String(epochMilliseconds) },
    ];
  };

  const getDateTimeRows = () => {
    if (!parsedDateTime) return [];
    return [
      {
        key: 'seconds',
        label: 'Unix timestamp (seconds)',
        value: String(parsedDateTime.getTime() / 1000),
      },
      {
        key: 'milliseconds',
        label: 'Unix timestamp (milliseconds)',
        value: String(parsedDateTime.getTime()),
      },
      { key: 'iso', label: 'ISO 8601', value: parsedDateTime.toISOString() },
      { key: 'utc', label: 'UTC date and time', value: formatDateTime(parsedDateTime, 'UTC') },
      { key: 'local', label: 'Local date and time', value: formatDateTime(parsedDateTime) },
      {
        key: 'selected',
        label: `Selected timezone (${selectedTimeZoneLabel})`,
        value: formatSelectedDate(parsedDateTime, timeZone),
      },
    ];
  };

  const resultRows = mode === 'timestamp-to-date' ? getTimestampRows() : getDateTimeRows();
  const convertedDate =
    mode === 'timestamp-to-date' && timestampResult.success
      ? timestampResult.value.date
      : mode === 'date-to-timestamp'
        ? parsedDateTime
        : null;

  const copyAllResults = () => {
    if (resultRows.length === 0) return;
    void copyValue(
      'all',
      resultRows.map(({ label, value }) => `${label}: ${value}`).join('\n'),
    );
  };

  const clearInputs = () => {
    setTimestampInput('');
    setTimestampTouched(false);
    setDateTimeInput('');
    setDateTimeTouched(false);
    setCopyStatus(null);
  };

  const useCurrentDateTime = () => {
    setDateTimeInput(getLocalDateTimeInputValue(new Date(now)));
    setCopyStatus(null);
  };

  const switchMode = (nextMode: ConversionMode) => {
    if (nextMode === mode) return;
    if (nextMode === 'date-to-timestamp' && timestampResult.success) {
      setDateTimeInput(getLocalDateTimeInputValue(timestampResult.value.date));
    } else if (nextMode === 'timestamp-to-date' && parsedDateTime) {
      setTimestampInput(String(parsedDateTime.getTime() / 1000));
      setUnitMode('seconds');
    }
    setMode(nextMode);
    setCopyStatus(null);
  };

  return (
    <section className="timestamp-converter" aria-label="Timestamp converter">
      <div className="timestamp-converter__panel timestamp-converter__current">
        <div className="timestamp-converter__section-heading">
          <div>
            <h2>Current timestamp</h2>
            <p>Live values update automatically using your device clock.</p>
          </div>
        </div>
        <div className="timestamp-converter__current-grid">
          {[
            { key: 'current-seconds', label: 'Unix timestamp (seconds)', value: String(Math.floor(now / 1000)) },
            { key: 'current-milliseconds', label: 'Unix timestamp (milliseconds)', value: String(now) },
            { key: 'current-utc', label: 'UTC date and time', value: formatDateTime(currentDate, 'UTC') },
            { key: 'current-local', label: 'Local date and time', value: formatDateTime(currentDate) },
          ].map((item) => (
            <ResultItem
              key={item.key}
              item={item}
              copied={copyStatus?.key === item.key}
              onCopy={() => void copyValue(item.key, item.value)}
            />
          ))}
        </div>
      </div>

      <div className="timestamp-converter__panel timestamp-converter__preferences">
        <div className="timestamp-converter__field">
          <label htmlFor="timestamp-timezone">Display timezone</label>
          <select
            id="timestamp-timezone"
            value={timeZone}
            onChange={(event) => {
              setTimeZone(event.target.value);
              setCopyStatus(null);
            }}
          >
            <option value="local">Local — {LOCAL_TIME_ZONE}</option>
            <option value="UTC">UTC</option>
            {TIME_ZONES.filter((zone) => zone !== 'UTC').map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <p className="timestamp-converter__hint">
            Date/time picker values are interpreted in your local timezone. The selected timezone
            controls the additional display result.
          </p>
        </div>
      </div>

      <div className="timestamp-converter__panel">
        <div className="timestamp-converter__mode-switch" role="group" aria-label="Conversion mode">
          <button
            type="button"
            className={mode === 'timestamp-to-date' ? 'is-active' : ''}
            aria-pressed={mode === 'timestamp-to-date'}
            onClick={() => switchMode('timestamp-to-date')}
          >
            Timestamp to date
          </button>
          <button
            type="button"
            className={mode === 'date-to-timestamp' ? 'is-active' : ''}
            aria-pressed={mode === 'date-to-timestamp'}
            onClick={() => switchMode('date-to-timestamp')}
          >
            Date to timestamp
          </button>
        </div>

        {mode === 'timestamp-to-date' ? (
          <div className="timestamp-converter__form">
            <div className="timestamp-converter__input-row">
              <div className="timestamp-converter__field">
                <label htmlFor="timestamp-input">Unix timestamp</label>
                <input
                  id="timestamp-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 1700000000"
                  value={timestampInput}
                  aria-invalid={showTimestampError}
                  aria-describedby={
                    showTimestampError ? 'timestamp-error' : 'timestamp-hint'
                  }
                  onBlur={() => setTimestampTouched(true)}
                  onChange={(event) => {
                    setTimestampInput(event.target.value);
                    setCopyStatus(null);
                  }}
                />
                <p id="timestamp-hint" className="timestamp-converter__hint">
                  Positive or negative Unix timestamps are supported.
                </p>
                {showTimestampError && !timestampResult.success && (
                  <p id="timestamp-error" className="timestamp-converter__error" role="alert">
                    {timestampResult.error}
                  </p>
                )}
              </div>
              <div className="timestamp-converter__field">
                <label htmlFor="timestamp-unit">Timestamp unit</label>
                <select
                  id="timestamp-unit"
                  value={unitMode}
                  onChange={(event) => {
                    setUnitMode(event.target.value as TimestampUnitMode);
                    setCopyStatus(null);
                  }}
                >
                  <option value="auto">Detect automatically</option>
                  <option value="seconds">Seconds</option>
                  <option value="milliseconds">Milliseconds</option>
                </select>
                {timestampResult.success && (
                  <p className="timestamp-converter__hint">
                    {unitMode === 'auto'
                      ? `Detected as ${timestampResult.value.unit}.`
                      : `Interpreted as ${timestampResult.value.unit}.`}
                    {timestampResult.value.unitIsAmbiguous &&
                      ' This value is in an ambiguous range; choose seconds or milliseconds to override.'}
                  </p>
                )}
              </div>
            </div>
            <p className="timestamp-converter__examples">
              Examples:{' '}
              <button type="button" onClick={() => setTimestampInput('1700000000')}>
                1700000000 (seconds)
              </button>
              <button type="button" onClick={() => setTimestampInput('1700000000000')}>
                1700000000000 (milliseconds)
              </button>
              <button type="button" onClick={() => setTimestampInput('-1')}>
                -1 (before the epoch)
              </button>
            </p>
          </div>
        ) : (
          <div className="timestamp-converter__form">
            <div className="timestamp-converter__field">
              <label htmlFor="date-time-input">Date and time (your local timezone)</label>
              <input
                id="date-time-input"
                type="datetime-local"
                step="1"
                value={dateTimeInput}
                aria-invalid={Boolean(dateTimeError)}
                aria-describedby={dateTimeError ? 'date-time-error' : 'date-time-hint'}
                onBlur={() => setDateTimeTouched(true)}
                onChange={(event) => {
                  setDateTimeInput(event.target.value);
                  setCopyStatus(null);
                }}
              />
              <p id="date-time-hint" className="timestamp-converter__hint">
                Your browser applies the correct local timezone and daylight-saving rules.
              </p>
              {dateTimeError && (
                <p id="date-time-error" className="timestamp-converter__error" role="alert">
                  {dateTimeError}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="timestamp-converter__actions">
          <button
            type="button"
            className="timestamp-converter__button timestamp-converter__button--primary"
            onClick={copyAllResults}
            disabled={resultRows.length === 0}
          >
            <Copy size={16} />
            Copy all results
          </button>
          {mode === 'date-to-timestamp' && (
            <button
              type="button"
              className="timestamp-converter__button timestamp-converter__button--secondary"
              onClick={useCurrentDateTime}
            >
              <Check size={16} />
              Use current date and time
            </button>
          )}
          <button
            type="button"
            className="timestamp-converter__button timestamp-converter__button--secondary"
            onClick={clearInputs}
          >
            <RotateCcw size={16} />
            Clear
          </button>
        </div>

        {convertedDate && (
          <p className="timestamp-converter__relative">
            <strong>Relative time:</strong>{' '}
            {formatRelativeTime(convertedDate, now)}
          </p>
        )}
        {resultRows.length > 0 && (
          <div className="timestamp-converter__results" aria-label="Conversion results">
            {resultRows.map((item) => (
              <ResultItem
                key={item.key}
                item={item}
                copied={copyStatus?.key === item.key}
                onCopy={() => void copyValue(item.key, item.value)}
              />
            ))}
          </div>
        )}
        {copyStatus && (
          <p className="timestamp-converter__copy-status" role="status">
            {copyStatus.message}
          </p>
        )}
      </div>
    </section>
  );
}

interface ResultItemProps {
  item: { key: string; label: string; value: string };
  copied: boolean;
  onCopy: () => void;
}

function ResultItem({ item, copied, onCopy }: ResultItemProps) {
  return (
    <div className="timestamp-converter__result">
      <div>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
      </div>
      <button type="button" onClick={onCopy} aria-label={`Copy ${item.label}`} title={`Copy ${item.label}`}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}
