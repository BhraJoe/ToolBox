import { useEffect, useRef, useState } from 'react';
import { Copy, RotateCcw, Trash2 } from 'lucide-react';
import type {
  RegexAnalysis,
  RegexMatch,
  RegexWorkerRequest,
  RegexWorkerResponse,
} from '../../../utils/regexTester';

const MAX_TEXT_LENGTH = 50_000;
const WORKER_TIMEOUT_MS = 1500;

const FLAGS = [
  { value: 'g', label: 'Global', description: 'Find every match instead of only the first.' },
  { value: 'i', label: 'Ignore case', description: 'Match uppercase and lowercase letters equally.' },
  { value: 'm', label: 'Multiline', description: 'Make ^ and $ match the start and end of each line.' },
  { value: 's', label: 'DotAll', description: 'Let . match line terminators as well as other characters.' },
  { value: 'u', label: 'Unicode', description: 'Use Unicode-aware matching and code point advancement.' },
  { value: 'y', label: 'Sticky', description: 'Only match at the current position (initially index 0).' },
] as const;

const EXAMPLES = [
  {
    name: 'Email',
    description: 'Find email-like text.',
    pattern: String.raw`[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}`,
    text: 'Write to support@example.com or hello+tools@toolbox.dev.',
  },
  {
    name: 'Digits',
    description: 'Find numbers.',
    pattern: String.raw`\d+`,
    text: 'There are 24 tools, 3 categories, and 2026 reasons to explore.',
  },
  {
    name: 'Words',
    description: 'Find English alphabetic words.',
    pattern: '[A-Za-z]+',
    text: 'Build useful tools with simple, readable patterns.',
  },
  {
    name: 'Phone-like number',
    description: 'Find phone-like sequences.',
    pattern: String.raw`\+?\d[\d\s-]{7,}`,
    text: 'Call +1 555-123-4567 or 020 1234 5678.',
  },
  {
    name: 'URL',
    description: 'Find HTTP and HTTPS URLs.',
    pattern: String.raw`https?://[^\s]+`,
    text: 'Visit https://example.com/docs and http://toolbox.dev.',
  },
  {
    name: 'Whitespace',
    description: 'Find whitespace sequences.',
    pattern: String.raw`\s+`,
    text: 'Tabs, spaces,\nand line breaks are whitespace.',
  },
  {
    name: 'Date',
    description: 'Find YYYY-MM-DD date patterns.',
    pattern: String.raw`\d{4}-\d{2}-\d{2}`,
    text: 'Release dates: 2026-11-01 and 2025-03-08.',
  },
  {
    name: 'Hex color',
    description: 'Find hexadecimal color codes.',
    pattern: String.raw`#(?:[0-9a-fA-F]{3}){1,2}\b`,
    text: 'Brand colors: #2563eb, #fff, and #0f172a.',
  },
];

const DEFAULT_PATTERN = String.raw`\b\w+\b`;
const DEFAULT_TEXT = 'ToolBox makes it easy to test regular expressions.\nTry matching words, numbers like 42, or a date such as 2026-11-01.';

type MatchState =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'timeout' }
  | { kind: 'error'; message: string }
  | {
    kind: 'ready';
    analysis: RegexAnalysis;
    source: { pattern: string; flags: string; text: string };
  };

type ExplanationToken = { token: string; explanation: string };

function explainPattern(pattern: string, dotAll: boolean): ExplanationToken[] {
  const tokenPattern = /\\[dDwWsSbB]|\\.|(?:\(\?<[^>]+>|\(\?:)|\[[^\]]*\]|\{\d+(?:,\d*)?\}|\(\)|[()[\].*+?^$|]/g;
  const explanations: Record<string, string> = {
    '^': 'Beginning of input (or line with the m flag).',
    '$': 'End of input (or line with the m flag).',
    '.': dotAll ? 'Any character, including line terminators (s flag).' : 'Any character except a line terminator.',
    '\\d': 'A digit from 0 to 9.',
    '\\D': 'A character that is not a digit.',
    '\\w': 'A word character: a-z, A-Z, 0-9, or underscore.',
    '\\W': 'A character that is not a word character.',
    '\\s': 'A whitespace character.',
    '\\S': 'A character that is not whitespace.',
    '\\b': 'A word boundary.',
    '*': 'Zero or more repetitions of the preceding token.',
    '+': 'One or more repetitions of the preceding token.',
    '?': 'Zero or one repetition of the preceding token.',
    '(': 'Starts a capture group.',
    ')': 'Ends a group.',
    '[': 'Character set: matches one character from the set.',
    ']': 'Ends a character set.',
    '|': 'Alternation: matches the expression on either side.',
    '(?:': 'Starts a non-capturing group.',
    '()': 'An empty capture group.',
  };
  const tokens: ExplanationToken[] = [];

  for (const match of pattern.matchAll(tokenPattern)) {
    const token = match[0];
    let explanation = explanations[token];
    if (/^\{\d+(?:,\d*)?\}$/.test(token)) {
      explanation = `Repetition count: ${token.slice(1, -1)}.`;
    } else if (token.startsWith('(?<')) {
      explanation = `Starts a named capture group${token.slice(3, -1) ? ` named "${token.slice(3, -1)}"` : ''}.`;
    } else if (!explanation && token === '\\.') {
      explanation = 'A literal period.';
    }
    if (explanation) tokens.push({ token, explanation });
  }

  return tokens;
}

function makeWorkerRequest(
  request: RegexWorkerRequest,
  onResponse: (response: RegexWorkerResponse) => void,
  onTimeout: () => void,
  onError: (message: string) => void,
): () => void {
  let worker: Worker;
  try {
    worker = new Worker(new URL('../../../workers/regexWorker.ts', import.meta.url), { type: 'module' });
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unable to start the regex worker.');
    return () => {};
  }
  const timeoutId = window.setTimeout(() => {
    worker.terminate();
    onTimeout();
  }, WORKER_TIMEOUT_MS);

  worker.onmessage = (event: MessageEvent<RegexWorkerResponse>) => {
    window.clearTimeout(timeoutId);
    worker.terminate();
    onResponse(event.data);
  };
  worker.onerror = (event) => {
    window.clearTimeout(timeoutId);
    worker.terminate();
    onError(event.message || 'The regex worker failed to run.');
  };
  worker.postMessage(request);

  return () => {
    window.clearTimeout(timeoutId);
    worker.terminate();
  };
}

function renderPreview(text: string, matches: RegexMatch[], selectedIndex: number | null) {
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.index > cursor) {
      segments.push(<span key={`text-${cursor}`}>{text.slice(cursor, match.index)}</span>);
    }

    if (match.end === match.index) {
      segments.push(
        <span
          key={`empty-${match.index}`}
          id={`regex-match-${index}`}
          className={`regex-tester__zero-width${selectedIndex === index ? ' regex-tester__zero-width--selected' : ''}`}
          aria-label={`Zero-width match at index ${match.index}`}
        />,
      );
    } else {
      segments.push(
        <mark
          key={`match-${match.index}`}
          id={`regex-match-${index}`}
          className={`regex-tester__highlight${selectedIndex === index ? ' regex-tester__highlight--selected' : ''}`}
        >
          {text.slice(match.index, match.end)}
        </mark>,
      );
    }
    cursor = Math.max(cursor, match.end);
  });

  if (cursor < text.length) segments.push(<span key={`text-${cursor}`}>{text.slice(cursor)}</span>);
  return segments;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [matchState, setMatchState] = useState<MatchState>({ kind: 'loading' });
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [replacement, setReplacement] = useState('');
  const [replaceResult, setReplaceResult] = useState<string | null>(null);
  const [replaceSource, setReplaceSource] = useState<{
    pattern: string;
    flags: string;
    text: string;
    replacement: string;
  } | null>(null);
  const [replaceMessage, setReplaceMessage] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const workerCleanup = useRef<(() => void) | null>(null);
  const replacementCleanup = useRef<(() => void) | null>(null);
  const nextRequestId = useRef(0);
  const replacementRequestId = useRef(0);

  const clearReplacement = () => {
    replacementRequestId.current += 1;
    replacementCleanup.current?.();
    replacementCleanup.current = null;
    setReplaceResult(null);
    setReplaceSource(null);
    setReplaceMessage('');
    setIsReplacing(false);
  };

  useEffect(() => {
    if (!pattern || !text) return;

    const debounceId = window.setTimeout(() => {
      setMatchState({ kind: 'loading' });
      const request: RegexWorkerRequest = {
        id: ++nextRequestId.current,
        operation: 'match',
        pattern,
        flags,
        text,
      };

      workerCleanup.current = makeWorkerRequest(
        request,
        (response) => {
          if (!response.success) {
            setMatchState({ kind: 'invalid', message: response.error });
          } else if (response.operation === 'match') {
            setSelectedMatch(null);
            setMatchState({
              kind: 'ready',
              analysis: response.result,
              source: { pattern, flags, text },
            });
          }
        },
        () => setMatchState({ kind: 'timeout' }),
        (message) => setMatchState({ kind: 'error', message }),
      );
    }, 180);

    return () => {
      window.clearTimeout(debounceId);
      workerCleanup.current?.();
    };
  }, [pattern, flags, text]);

  useEffect(() => () => {
    workerCleanup.current?.();
    replacementCleanup.current?.();
  }, []);

  const matchResultIsCurrent = matchState.kind === 'ready'
    && matchState.source.pattern === pattern
    && matchState.source.flags === flags
    && matchState.source.text === text;
  const activeMatches = matchResultIsCurrent && matchState.kind === 'ready'
    ? matchState.analysis.matches
    : [];
  const replaceResultIsCurrent = replaceSource !== null
    && replaceSource.pattern === pattern
    && replaceSource.flags === flags
    && replaceSource.text === text
    && replaceSource.replacement === replacement;
  const currentReplaceResult = replaceResultIsCurrent ? replaceResult : null;
  const explanationTokens = explainPattern(pattern, flags.includes('s'));

  const updatePattern = (value: string) => {
    clearReplacement();
    setPattern(value);
    setActionMessage('');
  };

  const updateText = (value: string) => {
    clearReplacement();
    setText(value.slice(0, MAX_TEXT_LENGTH));
    setActionMessage('');
  };

  const toggleFlag = (flag: string) => {
    clearReplacement();
    setFlags((current) => current.includes(flag)
      ? current.replace(flag, '')
      : `${current}${flag}`);
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setActionMessage(`${label} copied to clipboard.`);
    } catch {
      setActionMessage(`Could not copy ${label.toLowerCase()}. Clipboard access may be unavailable.`);
    }
  };

  const loadExample = (example: (typeof EXAMPLES)[number]) => {
    clearReplacement();
    setPattern(example.pattern);
    setText(example.text);
    setFlags('g');
    setSelectedMatch(null);
    setActionMessage(`${example.name} example loaded.`);
  };

  const runReplacement = (all: boolean) => {
    const requestId = ++replacementRequestId.current;
    setReplaceResult(null);
    setReplaceSource(null);
    setReplaceSource(null);
    setReplaceMessage('');
    if (!pattern) {
      setReplaceMessage('Enter a regular expression before replacing text.');
      return;
    }
    if (!text) {
      setReplaceMessage('Enter test text before replacing text.');
      return;
    }

    setIsReplacing(true);
    const request: RegexWorkerRequest = {
      id: ++nextRequestId.current,
      operation: 'replace',
      pattern,
      flags,
      text,
      replacement,
      all,
    };

    replacementCleanup.current = makeWorkerRequest(
      request,
      (response) => {
        if (requestId !== replacementRequestId.current) return;
        replacementCleanup.current = null;
        setIsReplacing(false);
        if (!response.success) {
          setReplaceMessage(`Pattern error: ${response.error}`);
        } else if (response.operation === 'replace') {
          setReplaceResult(response.result);
          setReplaceSource({ pattern, flags, text, replacement });
        }
      },
      () => {
        if (requestId !== replacementRequestId.current) return;
        replacementCleanup.current = null;
        setIsReplacing(false);
        setReplaceMessage('This pattern took too long to evaluate. Try a simpler pattern or shorter text.');
      },
      (message) => {
        if (requestId !== replacementRequestId.current) return;
        replacementCleanup.current = null;
        setIsReplacing(false);
        setReplaceMessage(message);
      },
    );
  };

  const selectMatch = (index: number) => {
    setSelectedMatch(index);
    window.requestAnimationFrame(() => {
      document.getElementById(`regex-match-${index}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  };

  const matchStatus = (() => {
    switch (matchState.kind) {
      case 'loading':
        return 'Matching…';
      case 'invalid':
        return `Pattern error: ${matchState.message}`;
      case 'timeout':
        return 'This pattern took too long to evaluate. Try a simpler pattern or shorter text.';
      case 'error':
        return matchState.message;
      case 'ready':
        if (!matchResultIsCurrent) return 'Matching…';
        return matchState.analysis.matches.length
          ? `${matchState.analysis.matches.length.toLocaleString()} match${matchState.analysis.matches.length === 1 ? '' : 'es'} found.`
          : 'No matches found. Try changing the pattern, text, or flags.';
    }
  })();
  const displayedMatchStatus = !pattern
    ? 'Enter a pattern to begin matching.'
    : !text
      ? 'Add test text to see matches.'
      : matchStatus;

  return (
    <div className="regex-tester">
      <section className="regex-tester__card" aria-labelledby="regex-pattern-heading">
        <div className="regex-tester__section-heading">
          <div>
            <h2 id="regex-pattern-heading">Regular expression</h2>
            <p>Enter a JavaScript pattern without the surrounding slashes.</p>
          </div>
          <div className="regex-tester__actions">
            <button type="button" className="regex-tester__button" onClick={() => void copyText(pattern, 'Pattern')} disabled={!pattern}>
              <Copy size={15} aria-hidden="true" /> Copy pattern
            </button>
            <button type="button" className="regex-tester__button" onClick={() => updatePattern('')} disabled={!pattern}>
              <Trash2 size={15} aria-hidden="true" /> Clear
            </button>
          </div>
        </div>

        <div className="regex-tester__pattern-field">
          <span aria-hidden="true">/</span>
          <label className="regex-tester__sr-only" htmlFor="regex-pattern">Regular expression pattern</label>
          <input
            id="regex-pattern"
            className="regex-tester__input regex-tester__pattern-input"
            value={pattern}
            onChange={(event) => updatePattern(event.target.value)}
            placeholder="[A-Za-z]+"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
          <span aria-hidden="true">/</span>
          <code className="regex-tester__active-flags" aria-label={`Active flags: ${flags || 'none'}`}>{flags || 'no flags'}</code>
        </div>

        <fieldset className="regex-tester__flags">
          <legend>Flags</legend>
          {FLAGS.map((flag) => (
            <label key={flag.value} className="regex-tester__flag" title={flag.description}>
              <input
                type="checkbox"
                checked={flags.includes(flag.value)}
                onChange={() => toggleFlag(flag.value)}
              />
              <code>{flag.value}</code>
              <span>{flag.label}</span>
              <span className="regex-tester__sr-only">{flag.description}</span>
            </label>
          ))}
        </fieldset>
        <p className="regex-tester__hint" role="status">{displayedMatchStatus}</p>
      </section>

      <section className="regex-tester__card" aria-labelledby="regex-text-heading">
        <div className="regex-tester__section-heading">
          <div>
            <h2 id="regex-text-heading">Test text</h2>
            <p>All matching runs locally in an isolated worker. Text is limited to {MAX_TEXT_LENGTH.toLocaleString()} characters.</p>
          </div>
          <div className="regex-tester__actions">
            <button type="button" className="regex-tester__button" onClick={() => loadExample(EXAMPLES[1])}>
              Load example
            </button>
            <button type="button" className="regex-tester__button" onClick={() => updateText('')} disabled={!text}>
              <Trash2 size={15} aria-hidden="true" /> Clear text
            </button>
          </div>
        </div>
        <label className="regex-tester__sr-only" htmlFor="regex-test-text">Text to test against the pattern</label>
        <textarea
          id="regex-test-text"
          className="regex-tester__textarea"
          value={text}
          onChange={(event) => updateText(event.target.value)}
          placeholder={'Paste or type text to test…\nMatches will appear highlighted below.'}
          maxLength={MAX_TEXT_LENGTH}
          spellCheck={false}
        />
        <div className="regex-tester__meta">
          <span>{text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters</span>
          <span>{text ? text.split(/\r\n|\r|\n/).length.toLocaleString() : 0} lines</span>
          <span>JavaScript indexes count UTF-16 code units.</span>
        </div>
      </section>

      <div className="regex-tester__results-grid">
        <section className="regex-tester__card" aria-labelledby="regex-preview-heading">
          <div className="regex-tester__section-heading">
            <div>
              <h2 id="regex-preview-heading">Match preview</h2>
              <p>Matched text is highlighted below.</p>
            </div>
            {matchResultIsCurrent && matchState.kind === 'ready' && (
              <span className="regex-tester__count">{matchState.analysis.matches.length} matches</span>
            )}
          </div>
          <pre className="regex-tester__preview" aria-label="Test text with matching sections highlighted">
            {text
              ? renderPreview(text, activeMatches, selectedMatch)
              : <span className="regex-tester__placeholder">Preview will appear when test text is added.</span>}
          </pre>
          {matchResultIsCurrent && matchState.kind === 'ready' && matchState.analysis.truncated && (
            <p className="regex-tester__notice" role="status">Showing the first 1,000 matches to keep the results responsive.</p>
          )}
          <p className="regex-tester__notice" role="note">Regex patterns can take a long time on certain inputs. Evaluation stops after 1.5 seconds; use patterns you trust.</p>
        </section>

        <section className="regex-tester__card" aria-labelledby="regex-matches-heading">
          <div className="regex-tester__section-heading">
            <div>
              <h2 id="regex-matches-heading">Matches &amp; capture groups</h2>
              <p>Positions are zero-based UTF-16 indexes.</p>
            </div>
          </div>
          <p className="regex-tester__status" role="status" aria-live="polite">{displayedMatchStatus}</p>
          {matchResultIsCurrent && activeMatches.length > 0 ? (
            <ol className="regex-tester__match-list">
              {activeMatches.map((match, index) => (
                <li key={`${match.index}-${index}`}>
                  <button
                    type="button"
                    className={`regex-tester__match-item${selectedMatch === index ? ' regex-tester__match-item--selected' : ''}`}
                    onClick={() => selectMatch(index)}
                    aria-label={`Select match ${index + 1} at index ${match.index}`}
                  >
                    <span className="regex-tester__match-title">Match {index + 1}</span>
                    <code className="regex-tester__match-value">{match.value || '(empty match)'}</code>
                    <span className="regex-tester__match-meta">
                      Index {match.index.toLocaleString()} · Length {(match.end - match.index).toLocaleString()}
                    </span>
                    {(match.captures.length > 0 || match.namedCaptures.length > 0) && (
                      <span className="regex-tester__captures">
                        {match.captures.map((value, groupIndex) => (
                          <span key={`group-${groupIndex}`}>
                            <strong>Group {groupIndex + 1}:</strong> {value === null ? '(did not participate)' : value || '(empty)'}
                          </span>
                        ))}
                        {match.namedCaptures.map(({ name, value }) => (
                          <span key={`named-${name}`}>
                            <strong>{name}:</strong> {value === null ? '(did not participate)' : value || '(empty)'}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          ) : matchResultIsCurrent ? (
            <p className="regex-tester__empty">No matches found for this pattern and text.</p>
          ) : null}
        </section>
      </div>

      <section className="regex-tester__card" aria-labelledby="regex-replace-heading">
        <div className="regex-tester__section-heading">
          <div>
            <h2 id="regex-replace-heading">Replace</h2>
            <p>Replacement references such as $1 and $&lt;name&gt; use capture groups from your pattern.</p>
          </div>
        </div>
        <label className="regex-tester__label" htmlFor="regex-replacement">Replacement text</label>
        <input
          id="regex-replacement"
          className="regex-tester__input"
          value={replacement}
          onChange={(event) => {
            clearReplacement();
            setReplacement(event.target.value);
          }}
          placeholder="Replacement text (e.g. $1)"
        />
        <div className="regex-tester__actions">
          <button type="button" className="regex-tester__button regex-tester__button--primary" onClick={() => runReplacement(false)} disabled={isReplacing}>
            Replace first
          </button>
          <button type="button" className="regex-tester__button" onClick={() => runReplacement(true)} disabled={isReplacing}>
            Replace all
          </button>
          <button type="button" className="regex-tester__button" onClick={() => void copyText(currentReplaceResult ?? '', 'Replacement result')} disabled={currentReplaceResult === null}>
            <Copy size={15} aria-hidden="true" /> Copy result
          </button>
          {currentReplaceResult !== null && (
            <button type="button" className="regex-tester__button" onClick={() => setReplaceResult(null)}>
              <RotateCcw size={15} aria-hidden="true" /> Clear result
            </button>
          )}
        </div>
        {replaceMessage && <p className="regex-tester__validation" role="alert">{replaceMessage}</p>}
        {currentReplaceResult !== null && (
          <pre className="regex-tester__preview regex-tester__replace-preview" aria-label="Replacement result">{currentReplaceResult || '(empty result)'}</pre>
        )}
      </section>

      <section className="regex-tester__card" aria-labelledby="regex-examples-heading">
        <div className="regex-tester__section-heading">
          <div>
            <h2 id="regex-examples-heading">Common examples</h2>
            <p>Practical matching patterns, not complete validation rules for every real-world format.</p>
          </div>
        </div>
        <div className="regex-tester__examples">
          {EXAMPLES.map((example) => (
            <article key={example.name} className="regex-tester__example">
              <div>
                <h3>{example.name}</h3>
                <p>{example.description}</p>
              </div>
              <code>{example.pattern}</code>
              <button type="button" className="regex-tester__button" onClick={() => loadExample(example)}>
                Load example
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="regex-tester__card" aria-labelledby="regex-explanation-heading">
        <div className="regex-tester__section-heading">
          <div>
            <h2 id="regex-explanation-heading">Pattern notes</h2>
            <p>A compact guide to common tokens detected in the current pattern, not a complete parser.</p>
          </div>
        </div>
        {explanationTokens.length ? (
          <ul className="regex-tester__explanations">
            {explanationTokens.map(({ token, explanation }, index) => (
              <li key={`${token}-${index}`}><code>{token}</code><span>{explanation}</span></li>
            ))}
          </ul>
        ) : (
          <p className="regex-tester__empty">No common tokens recognized in this pattern.</p>
        )}
      </section>

      {(actionMessage || isReplacing) && (
        <p className="regex-tester__announcement" role="status">
          {isReplacing ? 'Calculating replacement…' : actionMessage}
        </p>
      )}
    </div>
  );
}
