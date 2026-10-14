import { useState } from 'react';
import {
  ArrowLeftRight,
  ClipboardPaste,
  Copy,
  Download,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  compareLines,
  compareWords,
  countCharacters,
  countLines,
  DiffLimitError,
  getDiffCounts,
  type DiffKind,
  type DiffSection,
} from '../../../utils/textDiff';

type ComparisonMode = 'lines' | 'words';
type ResultView = 'side-by-side' | 'unified';

interface ComparisonResult {
  mode: ComparisonMode;
  lineSections: DiffSection<string>[];
  wordSections: DiffSection<string>[] | null;
}

type ActionMessage = {
  kind: 'success' | 'error';
  text: string;
};

interface AlignedRow {
  original: { kind: DiffKind | 'empty'; value: string };
  modified: { kind: DiffKind | 'empty'; value: string };
}

const MAX_TEXT_CHARACTERS = 200_000;

function buildAlignedRows(sections: DiffSection<string>[]): AlignedRow[] {
  const rows: AlignedRow[] = [];
  let index = 0;

  while (index < sections.length) {
    const section = sections[index];
    if (section.kind === 'equal') {
      for (const value of section.values) {
        rows.push({
          original: { kind: 'equal', value },
          modified: { kind: 'equal', value },
        });
      }
      index += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (index < sections.length && sections[index].kind !== 'equal') {
      const changedSection = sections[index];
      if (changedSection.kind === 'remove') removed.push(...changedSection.values);
      if (changedSection.kind === 'add') added.push(...changedSection.values);
      index += 1;
    }

    const rowCount = Math.max(removed.length, added.length);
    for (let row = 0; row < rowCount; row += 1) {
      rows.push({
        original: row < removed.length
          ? { kind: 'remove', value: removed[row] }
          : { kind: 'empty', value: '' },
        modified: row < added.length
          ? { kind: 'add', value: added[row] }
          : { kind: 'empty', value: '' },
      });
    }
  }

  return rows;
}

function renderWhitespace(value: string): string {
  return value
    .replace(/ /g, '·')
    .replace(/\t/g, '⇥')
    .replace(/\n/g, '↵\n');
}

function getReport(result: ComparisonResult): string {
  const sections = result.mode === 'lines'
    ? result.lineSections
    : result.wordSections ?? [];
  const counts = getDiffCounts(result.lineSections, sections);
  const lines = [
    'Text Diff Checker Report',
    `Comparison mode: ${result.mode === 'lines' ? 'Line-by-line' : 'Word-by-word'}`,
    `Original lines: ${countLinesFromSections(result.lineSections, 'original')}`,
    `Modified lines: ${countLinesFromSections(result.lineSections, 'modified')}`,
    `Added lines: ${counts.addedLines}`,
    `Removed lines: ${counts.removedLines}`,
    `Unchanged lines: ${counts.unchangedLines}`,
    `Characters added: ${counts.addedCharacters}`,
    `Characters removed: ${counts.removedCharacters}`,
  ];

  if (result.mode === 'words') {
    lines.push(`Words added: ${counts.addedWords}`, `Words removed: ${counts.removedWords}`);
  }

  lines.push('', 'Unified differences:');
  if (!sections.some((section) => section.kind !== 'equal')) {
    lines.push('No differences found.');
  } else {
    for (const section of sections) {
      const prefix = section.kind === 'add' ? '+ ' : section.kind === 'remove' ? '- ' : '  ';
      const content = section.values.join('');
      if (result.mode === 'lines') {
        for (const value of section.values) {
          lines.push(`${prefix}${value}`);
        }
      } else {
        lines.push(`${prefix}${content.replace(/\n/g, '↵\n')}`);
      }
    }
  }
  return lines.join('\n');
}

function countLinesFromSections(
  sections: DiffSection<string>[],
  side: 'original' | 'modified',
): number {
  return sections
    .filter((section) => side === 'original' ? section.kind !== 'add' : section.kind !== 'remove')
    .reduce((total, section) => total + section.values.length, 0);
}

export default function TextDiffChecker() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [mode, setMode] = useState<ComparisonMode>('lines');
  const [view, setView] = useState<ResultView>('side-by-side');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const canReadClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.readText === 'function';

  const updateText = (side: 'original' | 'modified', value: string) => {
    if (side === 'original') setOriginal(value);
    else setModified(value);
    setResult(null);
    setMessage(null);
  };

  const handlePaste = async (side: 'original' | 'modified') => {
    if (!canReadClipboard) {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      updateText(side, await navigator.clipboard.readText());
    } catch {
      setMessage({
        kind: 'error',
        text: 'Unable to read the clipboard. Check your browser permissions and try again.',
      });
    }
  };

  const handleCompare = () => {
    if (!original && !modified) {
      setResult(null);
      setMessage({ kind: 'error', text: 'Enter text in at least one field to compare.' });
      return;
    }

    if (countCharacters(original) + countCharacters(modified) > MAX_TEXT_CHARACTERS) {
      setResult(null);
      setMessage({
        kind: 'error',
        text: 'The combined text is too large to compare. Try comparing smaller sections (up to 200,000 characters total).',
      });
      return;
    }

    try {
      const lineSections = compareLines(original, modified);
      const wordSections = mode === 'words' ? compareWords(original, modified) : null;
      setResult({ mode, lineSections, wordSections });
      setMessage(null);
    } catch (error) {
      if (error instanceof DiffLimitError) {
        setResult(null);
        setMessage({ kind: 'error', text: error.message });
        return;
      }
      throw error;
    }
  };

  const handleSwap = () => {
    setOriginal(modified);
    setModified(original);
    setResult(null);
    setMessage(null);
  };

  const handleReset = () => {
    setOriginal('');
    setModified('');
    setMode('lines');
    setView('side-by-side');
    setResult(null);
    setMessage(null);
  };

  const handleCopy = async () => {
    if (!result) return;
    if (typeof navigator.clipboard?.writeText !== 'function') {
      setMessage({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }

    try {
      await navigator.clipboard.writeText(getReport(result));
      setMessage({ kind: 'success', text: 'Comparison results copied to the clipboard.' });
    } catch {
      setMessage({
        kind: 'error',
        text: 'Unable to copy the results. Check your browser permissions and try again.',
      });
    }
  };

  const handleDownload = () => {
    if (!result) return;
    try {
      const file = new Blob([getReport(result)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'text-diff-report.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage({ kind: 'success', text: 'Comparison report downloaded.' });
    } catch {
      setMessage({ kind: 'error', text: 'Unable to download the report in this browser.' });
    }
  };

  const activeSections = result?.mode === 'words'
    ? result.wordSections ?? []
    : result?.lineSections ?? [];
  const counts = result ? getDiffCounts(result.lineSections, activeSections) : null;
  const hasDifferences = activeSections.some((section) => section.kind !== 'equal');

  return (
    <section className="text-diff" aria-label="Text diff checker">
      <div className="text-diff__input-grid">
        <TextInputPanel
          side="original"
          label="Original Text"
          value={original}
          onChange={(value) => updateText('original', value)}
          onPaste={() => handlePaste('original')}
          onClear={() => updateText('original', '')}
          canReadClipboard={canReadClipboard}
        />
        <TextInputPanel
          side="modified"
          label="Modified Text"
          value={modified}
          onChange={(value) => updateText('modified', value)}
          onPaste={() => handlePaste('modified')}
          onClear={() => updateText('modified', '')}
          canReadClipboard={canReadClipboard}
        />
      </div>

      <div className="text-diff__toolbar">
        <div className="text-diff__toolbar-actions">
          <button className="text-diff__button text-diff__button--primary" type="button" onClick={handleCompare}>
            Compare Text
          </button>
          <button className="text-diff__button" type="button" onClick={handleSwap}>
            <ArrowLeftRight size={16} aria-hidden="true" /> Swap Texts
          </button>
          <button className="text-diff__button" type="button" onClick={handleReset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
        <div className="text-diff__mode-control" role="group" aria-label="Comparison mode">
          <span>Compare by</span>
          <button
            type="button"
            aria-pressed={mode === 'lines'}
            className={mode === 'lines' ? 'text-diff__option text-diff__option--selected' : 'text-diff__option'}
            onClick={() => {
              setMode('lines');
              setResult(null);
              setMessage(null);
            }}
          >
            Lines
          </button>
          <button
            type="button"
            aria-pressed={mode === 'words'}
            className={mode === 'words' ? 'text-diff__option text-diff__option--selected' : 'text-diff__option'}
            onClick={() => {
              setMode('words');
              setResult(null);
              setMessage(null);
            }}
          >
            Words
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-diff__message text-diff__message--${message.kind}`} role="status">
          {message.text}
        </p>
      )}

      {result && counts && (
        <>
          <section className="text-diff__card" aria-labelledby="text-diff-summary-title">
            <div className="text-diff__section-heading">
              <div>
                <h2 id="text-diff-summary-title">Comparison summary</h2>
                <p>
                  {result.mode === 'lines'
                    ? 'Line endings are normalized; character totals count changed line content, excluding line separators.'
                    : 'Line endings are normalized; character totals include changed whitespace and punctuation.'}
                  {' '}A trailing newline counts as a final blank line.
                </p>
              </div>
            </div>
            <div className="text-diff__stats">
              <Stat label="Original lines" value={countLinesFromSections(result.lineSections, 'original')} />
              <Stat label="Modified lines" value={countLinesFromSections(result.lineSections, 'modified')} />
              <Stat label="Added lines" value={counts.addedLines} kind="add" />
              <Stat label="Removed lines" value={counts.removedLines} kind="remove" />
              <Stat label="Unchanged lines" value={counts.unchangedLines} />
              <Stat label="Characters added" value={counts.addedCharacters} kind="add" />
              <Stat label="Characters removed" value={counts.removedCharacters} kind="remove" />
              {result.mode === 'words' && (
                <>
                  <Stat label="Words added" value={counts.addedWords} kind="add" />
                  <Stat label="Words removed" value={counts.removedWords} kind="remove" />
                </>
              )}
            </div>
          </section>

          <section className="text-diff__card text-diff__results" aria-labelledby="text-diff-results-title">
            <div className="text-diff__section-heading">
              <div>
                <h2 id="text-diff-results-title">Differences</h2>
                <p>{result.mode === 'lines' ? 'Line-by-line comparison' : 'Word-by-word comparison'}</p>
              </div>
              <div className="text-diff__result-actions">
                <button
                  type="button"
                  className="text-diff__button"
                  onClick={handleCopy}
                  disabled={!result}
                >
                  <Copy size={16} aria-hidden="true" /> Copy Results
                </button>
                <button
                  type="button"
                  className="text-diff__button"
                  onClick={handleDownload}
                  disabled={!result}
                >
                  <Download size={16} aria-hidden="true" /> Download Report
                </button>
              </div>
            </div>

            {!hasDifferences ? (
              <div className="text-diff__empty-result" role="status">
                <strong>No differences found.</strong>
                <span>The two text versions are identical.</span>
              </div>
            ) : (
              <>
                <div className="text-diff__view-control" role="group" aria-label="Difference view">
                  <button
                    type="button"
                    aria-pressed={view === 'side-by-side'}
                    className={view === 'side-by-side' ? 'text-diff__option text-diff__option--selected' : 'text-diff__option'}
                    onClick={() => setView('side-by-side')}
                  >
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    aria-pressed={view === 'unified'}
                    className={view === 'unified' ? 'text-diff__option text-diff__option--selected' : 'text-diff__option'}
                    onClick={() => setView('unified')}
                  >
                    Unified
                  </button>
                </div>
                {view === 'side-by-side' ? (
                  result.mode === 'lines'
                    ? <LineSideBySide sections={result.lineSections} />
                    : <WordSideBySide sections={result.wordSections ?? []} />
                ) : (
                  <UnifiedDiff sections={activeSections} mode={result.mode} />
                )}
                {result.mode === 'words' && (
                  <p className="text-diff__legend">
                    Changed whitespace is shown as · (space), ⇥ (tab), or ↵ (line break).
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}

interface TextInputPanelProps {
  side: 'original' | 'modified';
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPaste: () => void;
  onClear: () => void;
  canReadClipboard: boolean;
}

function TextInputPanel({
  side,
  label,
  value,
  onChange,
  onPaste,
  onClear,
  canReadClipboard,
}: TextInputPanelProps) {
  const id = `text-diff-${side}`;
  const characterCount = countCharacters(value);
  const lineCount = countLines(value);

  return (
    <section className="text-diff__card text-diff__input-card" aria-labelledby={`${id}-heading`}>
      <div className="text-diff__section-heading">
        <div>
          <h2 id={`${id}-heading`}>{label}</h2>
          <p>{side === 'original' ? 'The starting version of your text.' : 'The version you want to compare against.'}</p>
        </div>
        <div className="text-diff__input-actions">
          {canReadClipboard && (
            <button type="button" className="text-diff__button" onClick={onPaste}>
              <ClipboardPaste size={16} aria-hidden="true" /> Paste
            </button>
          )}
          <button type="button" className="text-diff__button" onClick={onClear} disabled={!value}>
            <Trash2 size={16} aria-hidden="true" /> Clear
          </button>
        </div>
      </div>
      <label className="text-diff__sr-only" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className="text-diff__textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={side === 'original' ? 'Paste or type the original text here...' : 'Paste or type the modified text here...'}
        spellCheck={false}
      />
      <div className="text-diff__input-counts" aria-live="polite">
        <span>{characterCount.toLocaleString()} characters</span>
        <span>{lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'}</span>
      </div>
    </section>
  );
}

function Stat({ label, value, kind }: { label: string; value: number; kind?: 'add' | 'remove' }) {
  return (
    <article className={`text-diff__stat${kind ? ` text-diff__stat--${kind}` : ''}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </article>
  );
}

function LineSideBySide({ sections }: { sections: DiffSection<string>[] }) {
  const rows = buildAlignedRows(sections);

  return (
    <div className="text-diff__side-by-side text-diff__side-by-side--lines">
      {(['original', 'modified'] as const).map((side) => (
        <div className="text-diff__column" key={side}>
          <h3>{side === 'original' ? 'Original Text' : 'Modified Text'}</h3>
          <div className="text-diff__line-list">
            {rows.map((row, index) => {
              const cell = row[side];
              return (
                <div
                  className={`text-diff__line text-diff__line--${cell.kind}`}
                  key={`${side}-${index}`}
                  aria-label={`${cell.kind === 'empty' ? 'No corresponding line' : cell.kind === 'equal' ? 'Unchanged line' : cell.kind === 'add' ? 'Added line' : 'Removed line'} ${index + 1}`}
                >
                  <span className="text-diff__line-label">
                    {cell.kind === 'add' ? '+' : cell.kind === 'remove' ? '−' : cell.kind === 'equal' ? '=' : ' '}
                  </span>
                  <code>{cell.kind === 'empty'
                    ? ''
                    : cell.value || <span className="text-diff__blank">(blank line)</span>}</code>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function WordSideBySide({ sections }: { sections: DiffSection<string>[] }) {
  return (
    <div className="text-diff__side-by-side">
      {(['original', 'modified'] as const).map((side) => (
        <div className="text-diff__column" key={side}>
          <h3>{side === 'original' ? 'Original Text' : 'Modified Text'}</h3>
          <div className="text-diff__word-text">
            {sections.map((section, index) => {
              const included = section.kind === 'equal'
                || (side === 'original' && section.kind === 'remove')
                || (side === 'modified' && section.kind === 'add');
              if (!included) return null;
              const kind = section.kind === 'equal' ? 'equal' : section.kind;
              return (
                <span
                  aria-label={kind === 'equal'
                    ? undefined
                    : `${kind === 'add' ? 'Added' : 'Removed'} text: ${section.values.join('')}`}
                  className={`text-diff__word text-diff__word--${kind}`}
                  key={`${side}-${index}`}
                >
                  {kind !== 'equal' && (
                    <span className="text-diff__word-prefix" aria-hidden="true">
                      {kind === 'add' ? '+' : '−'}
                    </span>
                  )}
                  {kind === 'equal'
                    ? section.values.join('')
                    : section.values.map(renderWhitespace).join('')}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function UnifiedDiff({ sections, mode }: { sections: DiffSection<string>[]; mode: ComparisonMode }) {
  if (mode === 'words') {
    return (
      <div className="text-diff__unified text-diff__unified--words">
        {sections.map((section, index) => (
          <div className={`text-diff__unified-word text-diff__unified-word--${section.kind}`} key={index}>
            {section.kind !== 'equal' && (
              <span className="text-diff__unified-prefix" aria-label={section.kind === 'add' ? 'Added' : 'Removed'}>
                {section.kind === 'add' ? '+' : '−'}
              </span>
            )}
            <code>
              {section.kind === 'equal'
                ? section.values.join('')
                : section.values.map(renderWhitespace).join('')}
            </code>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-diff__unified">
      {sections.map((section, sectionIndex) => section.values.map((value, valueIndex) => (
        <div
          className={`text-diff__unified-line text-diff__unified-line--${section.kind}`}
          key={`${sectionIndex}-${valueIndex}`}
        >
          <span className="text-diff__unified-prefix" aria-label={section.kind === 'add' ? 'Added' : section.kind === 'remove' ? 'Removed' : 'Unchanged'}>
            {section.kind === 'add' ? '+' : section.kind === 'remove' ? '-' : ' '}
          </span>
          <code>{value || <span className="text-diff__blank">(blank line)</span>}</code>
        </div>
      )))}
    </div>
  );
}
