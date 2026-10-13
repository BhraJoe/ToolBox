import { useMemo, useState } from 'react';
import { ClipboardPaste, Copy, Download, RotateCcw, Trash2 } from 'lucide-react';
import { CASE_FORMATS, convertText, type CaseFormat } from '../../../utils/textCaseConverter';

type ActionMessage = {
  kind: 'success' | 'error';
  text: string;
};

const FORMAT_GROUPS: { title: string; formats: CaseFormat[] }[] = [
  {
    title: 'Basic capitalization',
    formats: ['UPPERCASE', 'lowercase', 'Title Case', 'Sentence case', 'Alternating Case', 'Inverse Case'],
  },
  {
    title: 'Programming & naming',
    formats: [
      'camelCase',
      'PascalCase',
      'snake_case',
      'UPPER_SNAKE_CASE',
      'kebab-case',
      'Train-Case',
      'CONSTANT_CASE',
    ],
  },
];

function countWords(text: string): number {
  return (text.match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu) ?? []).length;
}

function countLines(text: string): number {
  return text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
}

export default function TextCaseConverter() {
  const [input, setInput] = useState('');
  const [format, setFormat] = useState<CaseFormat>(CASE_FORMATS[0]);
  const [message, setMessage] = useState<ActionMessage | null>(null);

  const output = useMemo(() => convertText(input, format), [input, format]);
  const characterCount = Array.from(input).length;
  const wordCount = countWords(input);
  const lineCount = countLines(input);
  const canReadClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.readText === 'function';

  const updateInput = (value: string) => {
    setInput(value);
    setMessage(null);
  };

  const selectFormat = (selectedFormat: CaseFormat) => {
    setFormat(selectedFormat);
    setMessage(null);
  };

  const handlePaste = async () => {
    if (!canReadClipboard) {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      updateInput(await navigator.clipboard.readText());
    } catch {
      setMessage({ kind: 'error', text: 'Unable to read the clipboard. Check your browser permissions and try again.' });
    }
  };

  const handleCopy = async () => {
    if (typeof navigator.clipboard?.writeText !== 'function') {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setMessage({ kind: 'success', text: 'Converted text copied to the clipboard.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to copy the result. Check your browser permissions and try again.' });
    }
  };

  const handleDownload = () => {
    try {
      const file = new Blob([output], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'text-case-converted.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage({ kind: 'success', text: 'Converted text downloaded as a TXT file.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to download the result in this browser.' });
    }
  };

  const handleReset = () => {
    setInput('');
    setFormat(CASE_FORMATS[0]);
    setMessage(null);
  };

  const handleConvert = () => {
    setMessage(input.trim()
      ? { kind: 'success', text: `Text converted to ${format}.` }
      : { kind: 'error', text: 'Enter some text to convert.' });
  };

  return (
    <section className="text-case-converter" aria-label="Text case converter">
      <div className="text-case-converter__card">
        <div className="text-case-converter__section-heading">
          <div>
            <h2>Your text</h2>
            <p>Everything stays in your browser; your text is never uploaded.</p>
          </div>
          <div className="text-case-converter__input-actions">
            <button
              className="text-case-converter__button text-case-converter__button--secondary"
              type="button"
              onClick={handlePaste}
              disabled={!canReadClipboard}
              title={canReadClipboard ? 'Paste from clipboard' : 'Clipboard reading is not supported'}
            >
              <ClipboardPaste size={16} aria-hidden="true" />
              Paste
            </button>
            <button
              className="text-case-converter__button text-case-converter__button--secondary"
              type="button"
              onClick={() => updateInput('')}
              disabled={input.length === 0}
            >
              <Trash2 size={16} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>

        <label className="text-case-converter__sr-only" htmlFor="text-case-input">
          Text to convert
        </label>
        <textarea
          id="text-case-input"
          className="text-case-converter__textarea"
          value={input}
          onChange={(event) => updateInput(event.target.value)}
          placeholder="Enter or paste your text here..."
          spellCheck={false}
        />
        <div className="text-case-converter__stats" aria-live="polite">
          <span>{characterCount.toLocaleString()} characters</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>{lineCount.toLocaleString()} lines</span>
        </div>
      </div>

      <div className="text-case-converter__card">
        <div className="text-case-converter__section-heading">
          <div>
            <h2>Conversion format</h2>
            <p>Choose how your text should be written.</p>
          </div>
        </div>
        <div className="text-case-converter__format-groups">
          {FORMAT_GROUPS.map((group) => (
            <fieldset className="text-case-converter__format-group" key={group.title}>
              <legend>{group.title}</legend>
              <div className="text-case-converter__format-grid">
                {group.formats.map((option) => (
                  <button
                    aria-pressed={format === option}
                    className={`text-case-converter__format-option${format === option ? ' text-case-converter__format-option--selected' : ''}`}
                    key={option}
                    onClick={() => selectFormat(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <p className="text-case-converter__format-note">
          CONSTANT_CASE uses the same conversion rule as UPPER_SNAKE_CASE.
          Title Case capitalizes each letter/number word separated by punctuation or whitespace.
        </p>
      </div>

      <div className="text-case-converter__card text-case-converter__output-card">
        <div className="text-case-converter__section-heading">
          <div>
            <h2>Converted text</h2>
            <p>Format: <strong>{format}</strong></p>
          </div>
          <div className="text-case-converter__input-actions">
            <button
              className="text-case-converter__button text-case-converter__button--secondary"
              type="button"
              onClick={handleCopy}
              disabled={output.length === 0}
            >
              <Copy size={16} aria-hidden="true" />
              Copy Result
            </button>
            <button
              className="text-case-converter__button text-case-converter__button--secondary"
              type="button"
              onClick={handleDownload}
              disabled={output.length === 0}
            >
              <Download size={16} aria-hidden="true" />
              Download TXT
            </button>
          </div>
        </div>
        {output.length > 0 ? (
          <textarea
            aria-label={`Converted text, ${format}`}
            className="text-case-converter__textarea text-case-converter__textarea--output"
            readOnly
            value={output}
          />
        ) : (
          <div className="text-case-converter__empty" role="status">
            <p>Your converted text will appear here.</p>
            <span>Add text above to see the result.</span>
          </div>
        )}
        <div className="text-case-converter__footer">
          <div className="text-case-converter__actions">
            <button
              className="text-case-converter__button text-case-converter__button--primary"
              type="button"
              onClick={handleConvert}
            >
              Convert
            </button>
            <button
              className="text-case-converter__button text-case-converter__button--secondary"
              type="button"
              onClick={handleReset}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
          </div>
          {message && (
            <p
              className={`text-case-converter__message text-case-converter__message--${message.kind}`}
              role={message.kind === 'error' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
