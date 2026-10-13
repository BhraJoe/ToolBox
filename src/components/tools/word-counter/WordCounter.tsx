import { useMemo, useState } from 'react';
import { ClipboardPaste, Copy, Download, Trash2 } from 'lucide-react';
import { analyzeText, formatReadingTime } from '../../../utils/wordCounter';

type ActionMessage = {
  kind: 'success' | 'error';
  text: string;
};

const STAT_LABELS: { label: string; key: 'characters' | 'charactersWithoutWhitespace' | 'letters' | 'digits' | 'spaces' | 'lines' | 'sentences' | 'paragraphs' }[] = [
  { label: 'Characters', key: 'characters' },
  { label: 'Characters without whitespace', key: 'charactersWithoutWhitespace' },
  { label: 'Letters', key: 'letters' },
  { label: 'Digits', key: 'digits' },
  { label: 'Spaces', key: 'spaces' },
  { label: 'Lines', key: 'lines' },
  { label: 'Sentences (estimate)', key: 'sentences' },
  { label: 'Paragraphs', key: 'paragraphs' },
];

export default function WordCounter() {
  const [text, setText] = useState('');
  const [readingSpeed, setReadingSpeed] = useState(200);
  const [speakingSpeed, setSpeakingSpeed] = useState(130);
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const analysis = useMemo(() => analyzeText(text), [text]);
  const canReadClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.readText === 'function';

  const updateText = (value: string) => {
    setText(value);
    setMessage(null);
  };

  const handlePaste = async () => {
    if (typeof navigator.clipboard?.readText !== 'function') {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      updateText(await navigator.clipboard.readText());
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
      await navigator.clipboard.writeText(text);
      setMessage({ kind: 'success', text: 'Text copied to the clipboard.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to copy the text. Check your browser permissions and try again.' });
    }
  };

  const handleDownload = () => {
    try {
      const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'word-counter-text.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage({ kind: 'success', text: 'Text downloaded as a TXT file.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to download the text in this browser.' });
    }
  };

  return (
    <div className="word-counter">
      <section className="word-counter__card" aria-labelledby="word-counter-input-heading">
        <div className="word-counter__section-heading">
          <div>
            <h2 id="word-counter-input-heading">Your text</h2>
            <p>All analysis happens locally in your browser.</p>
          </div>
          <div className="word-counter__actions">
            {canReadClipboard && (
              <button type="button" className="word-counter__button word-counter__button--secondary" onClick={handlePaste}>
                <ClipboardPaste size={16} aria-hidden="true" /> Paste
              </button>
            )}
            <button type="button" className="word-counter__button word-counter__button--secondary" onClick={handleCopy} disabled={!text}>
              <Copy size={16} aria-hidden="true" /> Copy Text
            </button>
            <button type="button" className="word-counter__button word-counter__button--secondary" onClick={handleDownload} disabled={!text}>
              <Download size={16} aria-hidden="true" /> Download TXT
            </button>
            <button type="button" className="word-counter__button word-counter__button--secondary" onClick={() => updateText('')} disabled={!text}>
              <Trash2 size={16} aria-hidden="true" /> Clear
            </button>
          </div>
        </div>
        <label className="word-counter__sr-only" htmlFor="word-counter-text">Text to analyze</label>
        <textarea
          id="word-counter-text"
          className="word-counter__textarea"
          value={text}
          onChange={(event) => updateText(event.target.value)}
          placeholder="Paste or type your text here..."
          spellCheck
        />
        <div className="word-counter__live-count" aria-live="polite">
          <span>{analysis.wordCount.toLocaleString()} {analysis.wordCount === 1 ? 'word' : 'words'}</span>
          <span>{analysis.characters.toLocaleString()} {analysis.characters === 1 ? 'character' : 'characters'}</span>
        </div>
        {message && (
          <p className={`word-counter__message word-counter__message--${message.kind}`} role="status">
            {message.text}
          </p>
        )}
      </section>

      <section className="word-counter__section" aria-labelledby="word-counter-stats-heading">
        <div className="word-counter__section-title">
          <div>
            <h2 id="word-counter-stats-heading">Text statistics</h2>
            <p>Characters are counted as Unicode code points, not UTF-16 code units.</p>
          </div>
        </div>
        <div className="word-counter__stats">
          <article className="word-counter__stat word-counter__stat--featured">
            <span>Words</span>
            <strong>{analysis.wordCount.toLocaleString()}</strong>
            <small>Whitespace-separated words</small>
          </article>
          {STAT_LABELS.map(({ label, key }) => (
            <article className="word-counter__stat" key={key}>
              <span>{label}</span>
              <strong>{analysis[key].toLocaleString()}</strong>
            </article>
          ))}
          <article className="word-counter__stat">
            <span>Reading time (estimate)</span>
            <strong>{formatReadingTime(analysis.wordCount, readingSpeed)}</strong>
            <small>{readingSpeed} words per minute</small>
          </article>
          <article className="word-counter__stat">
            <span>Speaking time (estimate)</span>
            <strong>{formatReadingTime(analysis.wordCount, speakingSpeed)}</strong>
            <small>{speakingSpeed} words per minute</small>
          </article>
        </div>
        <div className="word-counter__speed-controls">
          <label htmlFor="word-counter-reading-speed">
            <span>Reading speed</span>
            <strong>{readingSpeed} WPM</strong>
            <input
              id="word-counter-reading-speed"
              type="range"
              min="100"
              max="500"
              step="10"
              value={readingSpeed}
              onChange={(event) => setReadingSpeed(Number(event.target.value))}
            />
            <span className="word-counter__range-labels"><span>100 WPM</span><span>500 WPM</span></span>
          </label>
          <label htmlFor="word-counter-speaking-speed">
            <span>Speaking speed</span>
            <strong>{speakingSpeed} WPM</strong>
            <input
              id="word-counter-speaking-speed"
              type="range"
              min="80"
              max="250"
              step="5"
              value={speakingSpeed}
              onChange={(event) => setSpeakingSpeed(Number(event.target.value))}
            />
            <span className="word-counter__range-labels"><span>80 WPM</span><span>250 WPM</span></span>
          </label>
        </div>
      </section>

      <section className="word-counter__section" aria-labelledby="word-counter-analysis-heading">
        <div className="word-counter__section-title">
          <div>
            <h2 id="word-counter-analysis-heading">Additional analysis</h2>
            <p>Explore word lengths and the most frequently used keywords.</p>
          </div>
        </div>
        <div className="word-counter__analysis-grid">
          <article className="word-counter__analysis-card">
            <h3>Word lengths</h3>
            <div className="word-counter__word-detail">
              <span>Average word length</span>
              <strong>{analysis.averageWordLength.toFixed(1)} characters</strong>
            </div>
            <div className="word-counter__word-detail">
              <span>Longest word</span>
              <strong>{analysis.longestWord
                ? <>{analysis.longestWord} <small>({Array.from(analysis.longestWord).length} characters)</small></>
                : '—'}
              </strong>
            </div>
            <div className="word-counter__word-detail">
              <span>Shortest word</span>
              <strong>{analysis.shortestWord
                ? <>{analysis.shortestWord} <small>({Array.from(analysis.shortestWord).length} characters)</small></>
                : '—'}
              </strong>
            </div>
            <p className="word-counter__note">Word lengths exclude punctuation at the start or end of each whitespace-separated word. Ties use the first word in the text.</p>
          </article>
          <article className="word-counter__analysis-card">
            <h3>Top keywords</h3>
            {analysis.keywords.length > 0 ? (
              <ol className="word-counter__keywords">
                {analysis.keywords.map(({ word, count }) => (
                  <li key={word}>
                    <span>{word}</span>
                    <strong>{count.toLocaleString()}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="word-counter__empty">No meaningful keywords yet. Add text with words beyond common stop words to see a ranking.</p>
            )}
            <p className="word-counter__note">Common English stop words are excluded. Punctuation is ignored when comparing keywords; ties are alphabetical.</p>
          </article>
        </div>
      </section>
      <p className="word-counter__conventions">
        Word counts use whitespace-delimited tokens containing at least one letter or number. Punctuation-only tokens are ignored; hyphenated words count as one. Sentence counts are estimates based on groups of periods, exclamation marks, and question marks, so abbreviations and unusual writing styles may affect accuracy.
      </p>
    </div>
  );
}
