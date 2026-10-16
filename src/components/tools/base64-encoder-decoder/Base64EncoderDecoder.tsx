import { useState } from 'react';
import {
  ArrowLeftRight,
  Copy,
  Download,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { decodeBase64, encodeBase64 } from '../../../utils/base64';

type Mode = 'encode' | 'decode';
type Feedback = { kind: 'info' | 'success' | 'error'; text: string };

export default function Base64EncoderDecoder() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [hasValidResult, setHasValidResult] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const clearResult = () => {
    setOutput('');
    setHasValidResult(false);
  };

  const updateInput = (value: string) => {
    setInput(value);
    clearResult();
    setFeedback(null);
  };

  const selectMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    clearResult();
    setFeedback(null);
  };

  const handleTransform = () => {
    if (!input) {
      clearResult();
      setFeedback({ kind: 'error', text: 'Enter some text before running this action.' });
      return;
    }

    try {
      setOutput(mode === 'encode' ? encodeBase64(input) : decodeBase64(input));
      setHasValidResult(true);
      setFeedback({
        kind: 'success',
        text: mode === 'encode' ? 'Text encoded successfully.' : 'Base64 decoded successfully.',
      });
    } catch (error) {
      clearResult();
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Unable to process this input.',
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
      text: 'Values swapped. Swapping does not encode or decode; choose a mode and run it again.',
    });
  };

  const handleClear = () => {
    setInput('');
    clearResult();
    setFeedback(null);
  };

  const handleReset = () => {
    setMode('encode');
    setInput('');
    clearResult();
    setFeedback(null);
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
      setFeedback({
        kind: 'error',
        text: 'Unable to copy the result. Check browser permissions and try again.',
      });
    }
  };

  const handleDownload = () => {
    if (!hasValidResult || !output) return;

    try {
      const file = new Blob([output], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = mode === 'encode' ? 'base64-encoded.txt' : 'base64-decoded.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setFeedback({ kind: 'success', text: 'Result downloaded as a text file.' });
    } catch {
      setFeedback({ kind: 'error', text: 'Unable to download the result in this browser.' });
    }
  };

  const inputLabel = mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode';
  const outputLabel = mode === 'encode' ? 'Base64 Output' : 'Decoded Text';

  return (
    <div className="base64-tool">
      <div className="base64-tool__toolbar">
        <div className="base64-tool__modes" role="group" aria-label="Base64 mode">
          <button
            type="button"
            className={`base64-tool__mode${mode === 'encode' ? ' base64-tool__mode--active' : ''}`}
            aria-pressed={mode === 'encode'}
            onClick={() => selectMode('encode')}
          >
            Encode to Base64
          </button>
          <button
            type="button"
            className={`base64-tool__mode${mode === 'decode' ? ' base64-tool__mode--active' : ''}`}
            aria-pressed={mode === 'decode'}
            onClick={() => selectMode('decode')}
          >
            Decode from Base64
          </button>
        </div>
        <div className="base64-tool__toolbar-actions" role="group" aria-label="Base64 actions">
          <button type="button" className="base64-tool__button base64-tool__button--primary" onClick={handleTransform}>
            {mode === 'encode' ? 'Encode' : 'Decode'}
          </button>
          <button type="button" className="base64-tool__button" onClick={handleSwap} disabled={!output}>
            <ArrowLeftRight size={16} aria-hidden="true" /> Swap Input/Output
          </button>
          <button type="button" className="base64-tool__button" onClick={handleClear}>
            <Trash2 size={16} aria-hidden="true" /> Clear
          </button>
          <button type="button" className="base64-tool__button" onClick={handleReset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="base64-tool__panels">
        <section className="base64-tool__panel" aria-labelledby="base64-input-heading">
          <div className="base64-tool__panel-heading">
            <div>
              <h2 id="base64-input-heading">{inputLabel}</h2>
              <p>{mode === 'encode' ? 'Enter any text, including Unicode and line breaks.' : 'Standard Base64 only; URL-safe characters and whitespace are not accepted.'}</p>
            </div>
            <button
              type="button"
              className="base64-tool__button"
              onClick={() => updateInput('')}
              disabled={!input}
            >
              <Trash2 size={16} aria-hidden="true" /> Clear Input
            </button>
          </div>
          <label className="base64-tool__sr-only" htmlFor="base64-input">{inputLabel}</label>
          <textarea
            id="base64-input"
            className="base64-tool__textarea"
            value={input}
            onChange={(event) => updateInput(event.target.value)}
            placeholder={mode === 'encode' ? 'Type or paste text here...' : 'Paste standard Base64 text here...'}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
          <div className="base64-tool__count" aria-live="polite">
            {input.length.toLocaleString()} characters
          </div>
        </section>

        <section className="base64-tool__panel" aria-labelledby="base64-output-heading">
          <div className="base64-tool__panel-heading">
            <div>
              <h2 id="base64-output-heading">{outputLabel}</h2>
              <p>{hasValidResult ? 'Result is ready.' : 'Run the selected action to generate a result.'}</p>
            </div>
            <div className="base64-tool__panel-actions">
              <button type="button" className="base64-tool__button" onClick={handleCopy} disabled={!hasValidResult || !output}>
                <Copy size={16} aria-hidden="true" /> Copy Result
              </button>
              <button type="button" className="base64-tool__button" onClick={handleDownload} disabled={!hasValidResult || !output}>
                <Download size={16} aria-hidden="true" /> Download TXT
              </button>
            </div>
          </div>
          <label className="base64-tool__sr-only" htmlFor="base64-output">{outputLabel}</label>
          <textarea
            id="base64-output"
            className="base64-tool__textarea base64-tool__textarea--output"
            value={output}
            placeholder="Your result will appear here..."
            readOnly
            spellCheck={false}
          />
          <div className="base64-tool__count" aria-live="polite">
            {output.length.toLocaleString()} characters
          </div>
        </section>
      </div>

      {feedback && (
        <p className={`base64-tool__feedback base64-tool__feedback--${feedback.kind}`} role="status">
          {feedback.text}
        </p>
      )}

      <p className="base64-tool__security-note">
        Base64 is an encoding format, not encryption. It does not protect sensitive information or make it secret.
        Optional missing padding is accepted when valid; URL-safe Base64 is not supported.
      </p>
    </div>
  );
}