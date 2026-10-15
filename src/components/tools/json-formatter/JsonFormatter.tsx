import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ClipboardPaste,
  Copy,
  Download,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  getJsonStatistics,
  parseJson,
  stringifyJson,
  type JsonIndentation,
  type JsonStatistics,
} from '../../../utils/jsonFormatter';

type ValidationStatus = {
  kind: 'valid' | 'invalid' | 'error';
  message: string;
};

type ActionMessage = {
  kind: 'success' | 'error';
  text: string;
};

type ResultMode = 'Formatted' | 'Minified';

const EXAMPLE_JSON = `{
  "name": "ToolBox",
  "version": 1,
  "active": true,
  "description": "A helpful collection of browser tools 🌱",
  "settings": {
    "theme": "light",
    "features": ["format", "validate", "minify"]
  },
  "metadata": null
}`;

const INDENTATION_OPTIONS: { value: JsonIndentation; label: string }[] = [
  { value: 2, label: '2 spaces' },
  { value: 4, label: '4 spaces' },
  { value: 'tab', label: 'Tabs' },
];

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentation, setIndentation] = useState<JsonIndentation>(2);
  const [validation, setValidation] = useState<ValidationStatus | null>(null);
  const [statistics, setStatistics] = useState<JsonStatistics | null>(null);
  const [resultMode, setResultMode] = useState<ResultMode | null>(null);
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const canReadClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.readText === 'function';

  useEffect(() => {
    if (!input.trim()) return;

    const timeoutId = window.setTimeout(() => {
      const parsed = parseJson(input);
      if (!parsed.success) return;

      try {
        const formatted = stringifyJson(parsed.value, indentation);
        setOutput(formatted);
        setStatistics(getJsonStatistics(formatted, parsed.value));
        setResultMode('Formatted');
        setValidation({ kind: 'valid', message: 'Valid JSON.' });
      } catch (error) {
        setOutput('');
        setStatistics(null);
        setResultMode(null);
        setValidation({
          kind: 'error',
          message: error instanceof Error
            ? `Unable to process JSON: ${error.message}`
            : 'Unable to process this JSON input.',
        });
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [input, indentation]);

  const updateInput = (value: string) => {
    setInput(value);
    clearResult();
    setValidation(null);
    setMessage(null);
  };

  const clearResult = () => {
    setOutput('');
    setStatistics(null);
    setResultMode(null);
  };

  const handleClearOutput = () => {
    clearResult();
    setMessage(null);
  };

  const showParseError = (error: string) => {
    clearResult();
    setValidation({ kind: 'invalid', message: error });
    setMessage(null);
  };

  const handleValidate = () => {
    const result = parseJson(input);
    if (!result.success) {
      showParseError(result.error);
      return;
    }
    setValidation({ kind: 'valid', message: 'Valid JSON.' });
    setMessage(null);
  };

  const handleTransform = (mode: ResultMode) => {
    const parsed = parseJson(input);
    if (!parsed.success) {
      showParseError(parsed.error);
      return;
    }

    try {
      const formatted = stringifyJson(parsed.value, mode === 'Minified' ? 0 : indentation);
      setOutput(formatted);
      setStatistics(getJsonStatistics(formatted, parsed.value));
      setResultMode(mode);
      setValidation({ kind: 'valid', message: 'Valid JSON.' });
      setMessage(null);
    } catch (error) {
      clearResult();
      setValidation({
        kind: 'error',
        message: error instanceof Error
          ? `Unable to process JSON: ${error.message}`
          : 'Unable to process this JSON input.',
      });
      setMessage(null);
    }
  };

  const handlePaste = async () => {
    if (!canReadClipboard) {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      updateInput(await navigator.clipboard.readText());
      setMessage({ kind: 'success', text: 'JSON pasted from the clipboard.' });
    } catch {
      setMessage({
        kind: 'error',
        text: 'Unable to read the clipboard. Check your browser permissions and try again.',
      });
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    if (typeof navigator.clipboard?.writeText !== 'function') {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setMessage({ kind: 'success', text: 'JSON output copied to the clipboard.' });
    } catch {
      setMessage({
        kind: 'error',
        text: 'Unable to copy the output. Check your browser permissions and try again.',
      });
    }
  };

  const handleDownload = () => {
    if (!output || !statistics) return;

    try {
      const file = new Blob([output], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'formatted.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage({ kind: 'success', text: 'JSON output downloaded.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to download JSON in this browser.' });
    }
  };

  const handleReset = () => {
    setInput('');
    clearResult();
    setIndentation(2);
    setValidation(null);
    setMessage(null);
  };

  const handleSwap = () => {
    if (!output) return;
    setInput(output);
    clearResult();
    setValidation(null);
    setMessage(null);
  };

  return (
    <div className="json-formatter">
      <div className="json-formatter__toolbar">
        <div className="json-formatter__toolbar-actions" role="group" aria-label="JSON actions">
          <button
            type="button"
            className="json-formatter__button json-formatter__button--primary"
            onClick={() => handleTransform('Formatted')}
          >
            Format JSON
          </button>
          <button type="button" className="json-formatter__button" onClick={handleValidate}>
            Validate JSON
          </button>
          <button type="button" className="json-formatter__button" onClick={() => handleTransform('Minified')}>
            Minify JSON
          </button>
          <button type="button" className="json-formatter__button" onClick={handleReset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>

        <label className="json-formatter__indentation">
          <span>Indentation</span>
          <select
            value={indentation}
            onChange={(event) => {
              const selected = INDENTATION_OPTIONS.find((option) => String(option.value) === event.target.value);
              if (selected) setIndentation(selected.value);
            }}
          >
            {INDENTATION_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="json-formatter__panels">
        <section className="json-formatter__card" aria-labelledby="json-formatter-input-heading">
          <div className="json-formatter__section-heading">
            <div>
              <h2 id="json-formatter-input-heading">Input JSON</h2>
              <p>Enter JSON, then choose an action above. Processing stays in your browser.</p>
            </div>
            <div className="json-formatter__panel-actions">
              {canReadClipboard && (
                <button type="button" className="json-formatter__button" onClick={handlePaste}>
                  <ClipboardPaste size={16} aria-hidden="true" /> Paste JSON
                </button>
              )}
              <button
                type="button"
                className="json-formatter__button"
                onClick={() => updateInput(EXAMPLE_JSON)}
              >
                Load Example
              </button>
              <button
                type="button"
                className="json-formatter__button"
                onClick={() => updateInput('')}
                disabled={!input}
              >
                <Trash2 size={16} aria-hidden="true" /> Clear Input
              </button>
            </div>
          </div>
          <label className="json-formatter__sr-only" htmlFor="json-formatter-input">Input JSON</label>
          <textarea
            id="json-formatter-input"
            className="json-formatter__textarea"
            value={input}
            onChange={(event) => updateInput(event.target.value)}
            placeholder={'Paste or type JSON here...\n\n{\n  "hello": "world"\n}'}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
          <div className="json-formatter__input-footer">
            <span aria-live="polite">
              {input.length.toLocaleString()} characters
              {!validation && input.length > 0 && ' · Click Format JSON above to generate output.'}
            </span>
            {validation && (
              <p
                className={`json-formatter__validation json-formatter__validation--${validation.kind}`}
                role="status"
              >
                <strong>{validation.kind === 'valid' ? 'Valid JSON' : validation.kind === 'invalid' ? 'Invalid JSON' : 'Processing error'}</strong>
                <span>{validation.message}</span>
              </p>
            )}
          </div>
        </section>

        <section className="json-formatter__card" aria-labelledby="json-formatter-output-heading">
          <div className="json-formatter__section-heading">
            <div>
              <h2 id="json-formatter-output-heading">Formatted Output</h2>
              <p>{resultMode ? `${resultMode} JSON` : 'Live preview appears when the input is valid JSON.'}</p>
            </div>
            <div className="json-formatter__panel-actions">
              <button
                type="button"
                className="json-formatter__button"
                onClick={handleSwap}
                disabled={!output}
              >
                <ArrowLeftRight size={16} aria-hidden="true" /> Swap to Input
              </button>
              <button
                type="button"
                className="json-formatter__button"
                onClick={handleCopy}
                disabled={!output}
              >
                <Copy size={16} aria-hidden="true" /> Copy Output
              </button>
              <button
                type="button"
                className="json-formatter__button"
                onClick={handleDownload}
                disabled={!output || !statistics}
              >
                <Download size={16} aria-hidden="true" /> Download JSON
              </button>
              <button
                type="button"
                className="json-formatter__button"
                onClick={handleClearOutput}
                disabled={!output}
              >
                <Trash2 size={16} aria-hidden="true" /> Clear Output
              </button>
            </div>
          </div>
          <label className="json-formatter__sr-only" htmlFor="json-formatter-output">Formatted Output</label>
          <textarea
            id="json-formatter-output"
            className="json-formatter__textarea json-formatter__textarea--output"
            value={output}
            placeholder="Formatted or minified JSON will appear here..."
            readOnly
            spellCheck={false}
          />
          {statistics && output && (
            <div className="json-formatter__stats" aria-label="Output statistics">
              <Stat label="Characters" value={statistics.characters} />
              <Stat label="UTF-8 bytes" value={statistics.bytes} />
              <Stat label="Object properties" value={statistics.objectProperties} />
              <Stat label="Array elements" value={statistics.arrayElements} />
              <Stat label="Maximum depth" value={statistics.maximumDepth} />
            </div>
          )}
        </section>
      </div>

      {message && (
        <p className={`json-formatter__message json-formatter__message--${message.kind}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="json-formatter__stat">
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}
