import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Copy,
  Download,
  Link2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  decodeFullUrl,
  decodeUrlComponent,
  encodeFullUrl,
  encodeUrlComponent,
  getQueryParameterRows,
  isFullUrl,
  type UrlToolMode,
} from '../../../utils/urlEncoderDecoder';

type Feedback = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

const modeOptions: Array<{ value: UrlToolMode; label: string }> = [
  { value: 'encode-component', label: 'Encode URL Component' },
  { value: 'decode-component', label: 'Decode URL Component' },
  { value: 'encode-full', label: 'Encode Full URL' },
  { value: 'decode-full', label: 'Decode Full URL' },
];

export default function UrlEncoderDecoder() {
  const [mode, setMode] = useState<UrlToolMode>('encode-component');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [hasValidResult, setHasValidResult] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const validFullUrl = useMemo(() => isFullUrl(input), [input]);
  const queryParameters = useMemo(() => (validFullUrl ? getQueryParameterRows(input) : []), [input, validFullUrl]);

  const clearResult = () => {
    setOutput('');
    setHasValidResult(false);
  };

  const clearState = () => {
    setInput('');
    clearResult();
    setFeedback(null);
  };

  const handleModeChange = (nextMode: UrlToolMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    clearResult();
    setFeedback(null);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    clearResult();
    setFeedback(null);
  };

  const runTransform = () => {
    if (!input.trim()) {
      clearResult();
      setFeedback({ kind: 'error', text: 'Enter some text or a URL before running this action.' });
      return;
    }

    try {
      const nextOutput =
        mode === 'encode-component'
          ? encodeUrlComponent(input)
          : mode === 'decode-component'
            ? decodeUrlComponent(input)
            : mode === 'encode-full'
              ? encodeFullUrl(input)
              : decodeFullUrl(input);

      setOutput(nextOutput);
      setHasValidResult(true);
      setFeedback({
        kind: 'success',
        text:
          mode === 'encode-component'
            ? 'URL component encoded successfully.'
            : mode === 'decode-component'
              ? 'URL component decoded successfully.'
              : mode === 'encode-full'
                ? 'Full URL encoded successfully.'
                : 'Full URL decoded successfully.',
      });
    } catch (error) {
      clearResult();
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Unable to process this URL. Please check your input and try again.',
      });
    }
  };

  const handleSwap = () => {
    if (!output) return;

    setInput(output);
    setOutput(input);
    setHasValidResult(false);
    setFeedback({
      kind: 'info',
      text: 'Values swapped. This action does not run the selected transform again.',
    });
  };

  const handleClear = () => {
    clearState();
  };

  const handleReset = () => {
    setMode('encode-component');
    clearState();
  };

  const handleCopy = async () => {
    if (!hasValidResult || !output) return;

    if (typeof navigator.clipboard?.writeText !== 'function') {
      setFeedback({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setFeedback({ kind: 'success', text: 'Result copied to the clipboard.' });
    } catch {
      setFeedback({ kind: 'error', text: 'Unable to copy the result. Check browser permissions and try again.' });
    }
  };

  const handleDownload = () => {
    if (!hasValidResult || !output) return;

    try {
      const file = new Blob([output], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'url-encoded-output.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setFeedback({ kind: 'success', text: 'Result downloaded as a TXT file.' });
    } catch {
      setFeedback({ kind: 'error', text: 'Unable to download the result in this browser.' });
    }
  };

  const inputLabel =
    mode === 'encode-component'
      ? 'URL Component to Encode'
      : mode === 'decode-component'
        ? 'URL Component to Decode'
        : mode === 'encode-full'
          ? 'Full URL to Encode'
          : 'Full URL to Decode';

  const outputLabel =
    mode === 'encode-component'
      ? 'Encoded URL Component'
      : mode === 'decode-component'
        ? 'Decoded URL Component'
        : mode === 'encode-full'
          ? 'Encoded Full URL'
          : 'Decoded Full URL';

  const placeholderText =
    mode === 'encode-component'
      ? 'Enter text such as hello world & Ghana...'
      : mode === 'decode-component'
        ? 'Paste a percent-encoded component such as hello%20world%20%26%20Ghana...'
        : mode === 'encode-full'
          ? 'Paste a complete URL such as https://example.com/search?q=hello world&lang=en'
          : 'Paste a full URL that contains percent-encoded values';

  const currentInputLength = input.length;
  const currentOutputLength = output.length;

  return (
    <div className="url-tool">
      <div className="url-tool__toolbar">
        <div className="url-tool__modes" role="group" aria-label="URL processing mode">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`url-tool__mode${mode === option.value ? ' url-tool__mode--active' : ''}`}
              aria-pressed={mode === option.value}
              onClick={() => handleModeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="url-tool__toolbar-actions" role="group" aria-label="URL tool actions">
          <button type="button" className="url-tool__button url-tool__button--primary" onClick={runTransform}>
            {mode === 'encode-component'
              ? 'Encode'
              : mode === 'decode-component'
                ? 'Decode'
                : mode === 'encode-full'
                  ? 'Encode URL'
                  : 'Decode URL'}
          </button>
          <button type="button" className="url-tool__button" onClick={handleSwap} disabled={!output}>
            <ArrowLeftRight size={16} aria-hidden="true" /> Swap Input/Output
          </button>
          <button type="button" className="url-tool__button" onClick={handleClear}>
            <Trash2 size={16} aria-hidden="true" /> Clear
          </button>
          <button type="button" className="url-tool__button" onClick={handleReset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="url-tool__panels">
        <section className="url-tool__panel" aria-labelledby="url-input-heading">
          <div className="url-tool__panel-heading">
            <div>
              <h2 id="url-input-heading">{inputLabel}</h2>
              <p>
                {mode === 'encode-component'
                  ? 'Encode characters for safe use in a URL component.'
                  : mode === 'decode-component'
                    ? 'Decode percent-encoded sequences while preserving literal plus signs.'
                    : mode === 'encode-full'
                      ? 'Use a full URL to preserve the structure of the protocol, hostname, path, query, and fragment.'
                      : 'Decode a full URL without altering its structural separators.'}
              </p>
            </div>
            <button type="button" className="url-tool__button" onClick={() => handleInputChange('')} disabled={!input}>
              <Trash2 size={16} aria-hidden="true" /> Clear Input
            </button>
          </div>

          <textarea
            id="url-input"
            className="url-tool__textarea"
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={placeholderText}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />

          <div className="url-tool__meta" aria-live="polite">
            <span>{currentInputLength.toLocaleString()} characters</span>
            {input.trim() && mode === 'encode-component' && <span>Safe for URL components</span>}
          </div>
        </section>

        <section className="url-tool__panel" aria-labelledby="url-output-heading">
          <div className="url-tool__panel-heading">
            <div>
              <h2 id="url-output-heading">{outputLabel}</h2>
              <p>{hasValidResult ? 'Result ready to copy or download.' : 'Run an action to generate a result.'}</p>
            </div>
            <div className="url-tool__panel-actions">
              <button type="button" className="url-tool__button" onClick={handleCopy} disabled={!hasValidResult || !output}>
                <Copy size={16} aria-hidden="true" /> Copy Result
              </button>
              <button type="button" className="url-tool__button" onClick={handleDownload} disabled={!hasValidResult || !output}>
                <Download size={16} aria-hidden="true" /> Download TXT
              </button>
            </div>
          </div>

          <textarea
            id="url-output"
            className="url-tool__textarea url-tool__textarea--output"
            value={output}
            readOnly
            placeholder="Your result will appear here..."
            spellCheck={false}
          />

          <div className="url-tool__meta" aria-live="polite">
            <span>{currentOutputLength.toLocaleString()} characters</span>
            {hasValidResult && <span>Result available</span>}
          </div>
        </section>
      </div>

      {feedback && (
        <div className={`url-tool__feedback url-tool__feedback--${feedback.kind}`} role="status" aria-live="polite">
          {feedback.text}
        </div>
      )}

      {validFullUrl && (
        <section className="url-tool__query-helper" aria-labelledby="query-helper-heading">
          <div className="url-tool__query-header">
            <div>
              <h3 id="query-helper-heading">Query Parameter Helper</h3>
              <p>URL query parsing follows standard URL semantics, where + is interpreted as a space.</p>
            </div>
            <div className="url-tool__helper-badge">
              <Link2 size={14} aria-hidden="true" /> URL query
            </div>
          </div>

          {queryParameters.length > 0 ? (
            <div className="url-tool__table-wrap">
              <table className="url-tool__table">
                <thead>
                  <tr>
                    <th>Parameter Name</th>
                    <th>Value</th>
                    <th>Encoded</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queryParameters.map((parameter, index) => (
                    <tr key={`${parameter.name}-${parameter.value}-${index}`}>
                      <td>{parameter.name || '(empty)'}</td>
                      <td>{parameter.value || '(empty)'}</td>
                      <td>
                        {parameter.encodedName}
                        {parameter.value ? `=${parameter.encodedValue}` : ''}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="url-tool__inline-button"
                          onClick={async () => {
                            const valueToCopy = parameter.value || '';
                            if (typeof navigator.clipboard?.writeText !== 'function') {
                              setFeedback({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
                              return;
                            }

                            try {
                              await navigator.clipboard.writeText(valueToCopy);
                              setFeedback({ kind: 'success', text: `Copied parameter value for "${parameter.name || 'unnamed'}".` });
                            } catch {
                              setFeedback({ kind: 'error', text: 'Unable to copy the selected parameter value.' });
                            }
                          }}
                        >
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="url-tool__empty-state">This URL does not include any query parameters.</div>
          )}
        </section>
      )}
    </div>
  );
}
