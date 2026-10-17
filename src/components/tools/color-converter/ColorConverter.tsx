import { useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';
import {
  formatHsl,
  formatRgb,
  getContrastingTextColor,
  parseColor,
  rgbToHex,
  type RgbColor,
} from '../../../utils/colorConverter';

const INITIAL_HEX = '#3498db';

type Feedback = { kind: 'success' | 'error'; text: string };

export default function ColorConverter() {
  const [input, setInput] = useState(INITIAL_HEX);
  const [color, setColor] = useState<RgbColor | null>(() => parseColor(INITIAL_HEX));
  const [validationMessage, setValidationMessage] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const hex = color ? rgbToHex(color) : '';
  const rgb = color ? formatRgb(color) : '';
  const hsl = color ? formatHsl(color) : '';
  const contrastColor = color ? getContrastingTextColor(color) : '';
  const cssOutput = color
    ? `/* Selected color */\nbackground-color: ${hex};\ncolor: ${contrastColor};`
    : '';

  const updateFromInput = (value: string) => {
    setInput(value);
    setFeedback(null);
    if (!value.trim()) {
      setColor(null);
      setValidationMessage('');
      return;
    }

    try {
      setColor(parseColor(value));
      setValidationMessage('');
    } catch (error) {
      setColor(null);
      setValidationMessage(
        error instanceof Error ? error.message : 'Enter a valid HEX, RGB, or HSL color.',
      );
    }
  };

  const convertInput = () => {
    try {
      setColor(parseColor(input));
      setValidationMessage('');
      setFeedback(null);
    } catch (error) {
      setColor(null);
      setValidationMessage(
        error instanceof Error ? error.message : 'Enter a valid HEX, RGB, or HSL color.',
      );
    }
  };

  const chooseColor = (value: string) => {
    updateFromInput(value);
  };

  const reset = () => {
    setInput(INITIAL_HEX);
    setColor(parseColor(INITIAL_HEX));
    setValidationMessage('');
    setFeedback(null);
  };

  const copyValue = async (value: string, label: string) => {
    if (!color) return;
    if (typeof navigator.clipboard?.writeText !== 'function') {
      setFeedback({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ kind: 'success', text: `${label} copied to the clipboard.` });
    } catch {
      setFeedback({
        kind: 'error',
        text: `Unable to copy ${label.toLowerCase()}. Check browser permissions and try again.`,
      });
    }
  };

  const resultCards = [
    { label: 'HEX', value: hex, copyLabel: 'HEX value' },
    { label: 'RGB', value: rgb, copyLabel: 'RGB value' },
    { label: 'HSL', value: hsl, copyLabel: 'HSL value' },
  ];

  return (
    <div className="color-tool">
      <section className="color-tool__preview-card" aria-labelledby="color-preview-heading">
        <div className="color-tool__section-heading">
          <div>
            <h2 id="color-preview-heading">Live preview</h2>
            <p>See your selected color and a readable text contrast.</p>
          </div>
          <span className={`color-tool__status${color ? '' : ' color-tool__status--invalid'}`}>
            {color ? 'Valid color' : 'Invalid input'}
          </span>
        </div>
        <div
          className={`color-tool__swatch${color ? '' : ' color-tool__swatch--invalid'}`}
          style={color ? { backgroundColor: hex, color: contrastColor } : undefined}
          role="img"
          aria-label={color ? `Preview of ${hex}` : 'Preview unavailable because the input is invalid'}
        >
          {color ? (
            <div className="color-tool__sample">
              <span>Text sample</span>
              <strong>{contrastColor}</strong>
            </div>
          ) : (
            <span className="color-tool__invalid-label">Enter a valid color to preview it</span>
          )}
        </div>
        <div className="color-tool__preview-value">
          <span>Normalized HEX</span>
          <code>{hex || '—'}</code>
        </div>
      </section>

      <section className="color-tool__input-card" aria-labelledby="color-input-heading">
        <div className="color-tool__section-heading">
          <div>
            <h2 id="color-input-heading">Color input</h2>
            <p>Enter a HEX, RGB, or HSL value, or choose one with the color picker.</p>
          </div>
        </div>
        <div className="color-tool__input-row">
          <div className="color-tool__text-field">
            <label htmlFor="color-value">Color value</label>
            <input
              id="color-value"
              type="text"
              value={input}
              onChange={(event) => updateFromInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') convertInput();
              }}
              placeholder="#3498db, rgb(52, 152, 219), or hsl(204, 70%, 53%)"
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={validationMessage ? 'color-validation' : undefined}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="color-tool__picker-field">
            <label htmlFor="color-picker">Color picker</label>
            <input
              id="color-picker"
              className="color-tool__picker"
              type="color"
              value={hex || INITIAL_HEX}
              onChange={(event) => chooseColor(event.target.value)}
              aria-label="Choose a color"
            />
          </div>
        </div>
        {validationMessage && (
          <p className="color-tool__validation" id="color-validation" role="alert">
            {validationMessage}
          </p>
        )}
        <div className="color-tool__input-actions">
          <button type="button" className="color-tool__button color-tool__button--primary" onClick={convertInput}>
            Convert
          </button>
          <button type="button" className="color-tool__button" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </section>

      <section className="color-tool__results" aria-labelledby="color-results-heading">
        <div className="color-tool__section-heading">
          <div>
            <h2 id="color-results-heading">Conversion results</h2>
            <p>{color ? 'All formats are synchronized with the current color.' : 'Results are unavailable until the input is valid.'}</p>
          </div>
        </div>
        <div className="color-tool__result-grid" aria-live="polite">
          {resultCards.map((result) => (
            <article className="color-tool__result-card" key={result.label}>
              <div className="color-tool__result-heading">
                <h3>{result.label}</h3>
                {color && <Check size={16} aria-label="Current result" />}
              </div>
              <code>{result.value || '—'}</code>
              <button
                type="button"
                className="color-tool__button color-tool__button--copy"
                onClick={() => copyValue(result.value, result.copyLabel)}
                disabled={!color}
              >
                <Copy size={15} aria-hidden="true" /> Copy {result.label}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="color-tool__css-card" aria-labelledby="color-css-heading">
        <div className="color-tool__section-heading">
          <div>
            <h2 id="color-css-heading">CSS output</h2>
            <p>Ready-to-use declarations with the best-contrast text color.</p>
          </div>
          <div className="color-tool__css-actions">
            <button
              type="button"
              className="color-tool__button"
              onClick={() => copyValue(`background-color: ${hex};`, 'Background declaration')}
              disabled={!color}
            >
              <Copy size={15} aria-hidden="true" /> Copy background
            </button>
            <button
              type="button"
              className="color-tool__button color-tool__button--primary"
              onClick={() => copyValue(cssOutput, 'CSS')}
              disabled={!color}
            >
              <Copy size={15} aria-hidden="true" /> Copy CSS
            </button>
          </div>
        </div>
        <pre className={`color-tool__code${color ? '' : ' color-tool__code--empty'}`}>
          <code>{cssOutput || 'CSS declarations appear when the input is valid.'}</code>
        </pre>
      </section>

      {feedback && (
        <p className={`color-tool__feedback color-tool__feedback--${feedback.kind}`} role="status">
          {feedback.text}
        </p>
      )}
    </div>
  );
}
