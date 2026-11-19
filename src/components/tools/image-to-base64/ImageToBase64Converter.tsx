import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileJson,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildMetadataJson,
  calculateOverheadPercent,
  convertImageFile,
  copyTextToClipboard,
  downloadTextFile,
  formatBytes,
  generateCodeOutput,
  MAX_IMAGE_FILE_BYTES,
  SUPPORTED_FORMAT_LABEL,
  type CodeOutputFormat,
  type ImageBase64Result,
  type OutputMode,
} from '../../../utils/imageToBase64';
import './image-to-base64.css';

type ConversionStatus = 'idle' | 'reading' | 'ready' | 'error';
type PreviewSource = 'file' | 'dataurl';
type SnippetFormat = 'none' | CodeOutputFormat;

interface LoadedImage {
  result: ImageBase64Result;
  previewUrl: string;
}

interface Feedback {
  kind: 'success' | 'error' | 'info';
  text: string;
}

const SNIPPET_OPTIONS: { value: SnippetFormat; label: string }[] = [
  { value: 'none', label: 'Raw output (selected tab)' },
  { value: 'html', label: 'HTML — <img> element' },
  { value: 'css', label: 'CSS — background-image' },
  { value: 'javascript', label: 'JavaScript — const variable' },
  { value: 'json', label: 'JSON — metadata object' },
  { value: 'markdown', label: 'Markdown — image element' },
];

const ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp,image/avif,image/x-icon';

export default function ImageToBase64() {
  const inputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [outputMode, setOutputMode] = useState<OutputMode>('base64');
  const [snippet, setSnippet] = useState<SnippetFormat>('none');
  const [previewSource, setPreviewSource] = useState<PreviewSource>('file');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const revokePreviewUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      readerRef.current?.abort();
      revokePreviewUrl();
    };
  }, []);

  const activeOutput = useMemo(() => {
    if (!loaded) return '';
    if (snippet === 'none') {
      return outputMode === 'base64' ? loaded.result.base64 : loaded.result.dataUrl;
    }
    return generateCodeOutput(snippet, loaded.result);
  }, [loaded, outputMode, snippet]);

  const loadFile = async (file: File) => {
    readerRef.current?.abort();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    revokePreviewUrl();
    setLoaded(null);
    setStatus('reading');
    setError(null);
    setFeedback(null);

    const reader = new FileReader();
    readerRef.current = reader;

    try {
      const result = await convertImageFile(file, reader);
      if (requestRef.current !== requestId) return;

      const previewUrl = URL.createObjectURL(file);
      objectUrlRef.current = previewUrl;

      setLoaded({ result, previewUrl });
      setStatus('ready');
      setPreviewSource('file');
      setOutputMode('base64');
      setSnippet('none');
      setFeedback({ kind: 'success', text: 'Image converted to Base64 locally. Nothing was uploaded.' });
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'The image could not be converted. Try another file.');
    } finally {
      if (readerRef.current === reader) readerRef.current = null;
    }
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void loadFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const cancelReading = () => {
    requestRef.current += 1;
    readerRef.current?.abort();
    readerRef.current = null;
    setStatus('idle');
    setFeedback({ kind: 'info', text: 'Reading the image was cancelled.' });
  };

  const clearConversion = () => {
    requestRef.current += 1;
    readerRef.current?.abort();
    readerRef.current = null;
    revokePreviewUrl();
    setLoaded(null);
    setStatus('idle');
    setError(null);
    setFeedback({ kind: 'info', text: 'Conversion cleared. Choose an image to start again.' });
    setOutputMode('base64');
    setSnippet('none');
  };

  const removeImage = () => {
    clearConversion();
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      const method = await copyTextToClipboard(text);
      setFeedback({
        kind: 'success',
        text: method === 'clipboard' ? `${label} copied to the clipboard.` : `${label} copied using the browser fallback.`,
      });
    } catch (caught) {
      setFeedback({
        kind: 'error',
        text: caught instanceof Error ? caught.message : 'The clipboard is unavailable. Select the output manually and press Ctrl+C.',
      });
    }
  };

  const handleDownloadTxt = () => {
    if (!activeOutput) return;
    try {
      downloadTextFile(activeOutput, 'image-base64.txt', 'text/plain;charset=utf-8');
      setFeedback({ kind: 'success', text: 'image-base64.txt downloaded with the full output.' });
    } catch {
      setFeedback({ kind: 'error', text: 'The text file could not be created. Check that downloads are allowed and try again.' });
    }
  };

  const handleDownloadJson = () => {
    if (!loaded) return;
    try {
      downloadTextFile(buildMetadataJson(loaded.result), 'image-base64.json', 'application/json');
      setFeedback({ kind: 'success', text: 'image-base64.json downloaded with metadata and Base64 data.' });
    } catch {
      setFeedback({ kind: 'error', text: 'The JSON file could not be created. Check that downloads are allowed and try again.' });
    }
  };

  const result = loaded?.result;
  const previewSrc = loaded
    ? (previewSource === 'dataurl' ? loaded.result.dataUrl : loaded.previewUrl)
    : null;
  const outputLabel = snippet !== 'none'
    ? SNIPPET_OPTIONS.find((option) => option.value === snippet)?.label.split(' — ')[0] ?? 'Code'
    : outputMode === 'base64' ? 'Base64 string' : 'Data URL';
  const outputCharacters = activeOutput.length;

  return (
    <div className="image-to-base64">
      <section className="image-to-base64__upload" aria-labelledby="itb-upload-heading">
        <div className="image-to-base64__section-heading">
          <div>
            <span className="image-to-base64__eyebrow">36 / Image tools</span>
            <h2 id="itb-upload-heading">01 / Upload an image</h2>
            <p>Reads the original file bytes in your browser and encodes them without resizing or recompressing.</p>
          </div>
          <span className="image-to-base64__local-badge">
            <ShieldCheck size={14} aria-hidden="true" /> Processed locally
          </span>
        </div>

        <div
            className={`image-to-base64__dropzone${dragging ? ' image-to-base64__dropzone--active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="image-to-base64__upload-icon" aria-hidden="true">
            <Upload size={23} />
          </div>
          <div>
            <strong>Drag &amp; drop an image</strong>
            <span>{SUPPORTED_FORMAT_LABEL} · max {formatBytes(MAX_IMAGE_FILE_BYTES)}</span>
          </div>
          <button
            type="button"
            className="image-to-base64__button image-to-base64__button--secondary"
            onClick={openFilePicker}
          >
            Browse Files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="image-to-base64__file-input"
            onChange={handleInputChange}
            aria-label="Choose an image file"
          />
        </div>

        <p className="image-to-base64__hint" id="itb-upload-hint">
          PNG, JPG/JPEG, WEBP, GIF and SVG are always supported. BMP, AVIF and ICO work when your browser can decode them.
          The {formatBytes(MAX_IMAGE_FILE_BYTES)} limit keeps the roughly 33% larger Base64 result within browser memory.
          Files stay on your device and are never uploaded or stored in local storage.
        </p>

        {status === 'reading' && (
          <div className="image-to-base64__reading" role="status" aria-live="polite">
            <LoaderCircle size={17} className="image-to-base64__spinner" aria-hidden="true" />
            <span>Reading and encoding the image locally…</span>
            <button type="button" className="image-to-base64__link-button" onClick={cancelReading}>Cancel</button>
          </div>
        )}

        {error && (
          <div className="image-to-base64__message image-to-base64__message--error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button>
          </div>
        )}

        {loaded && result && (
          <div className="image-to-base64__file-summary">
            <div className="image-to-base64__file-summary-main">
              <span className="image-to-base64__file-icon" aria-hidden="true"><ImageIcon size={17} /></span>
              <div>
                <strong title={result.filename}>{result.filename}</strong>
                <span>
                  {result.mimeType} · {result.width.toLocaleString()} × {result.height.toLocaleString()} px · {formatBytes(result.sizeBytes)}
                </span>
              </div>
            </div>
            <div className="image-to-base64__file-summary-actions">
              <button type="button" className="image-to-base64__button image-to-base64__button--secondary" onClick={openFilePicker}>
                <RefreshCw size={14} aria-hidden="true" /> Replace
              </button>
              <button type="button" className="image-to-base64__icon-button" onClick={removeImage} aria-label="Remove image">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {loaded && result ? (
        <div className="image-to-base64__workspace">
          <section className="image-to-base64__card" aria-labelledby="itb-preview-heading">
            <div className="image-to-base64__section-heading image-to-base64__section-heading--compact">
              <div>
                <span className="image-to-base64__eyebrow">02 / Image information</span>
                <h2 id="itb-preview-heading">Preview &amp; details</h2>
              </div>
            </div>

            <div className="image-to-base64__preview-toolbar" role="group" aria-label="Preview source">
              <button
                type="button"
                className={`image-to-base64__pill${previewSource === 'file' ? ' image-to-base64__pill--active' : ''}`}
                aria-pressed={previewSource === 'file'}
                onClick={() => setPreviewSource('file')}
              >
                Original file
              </button>
              <button
                type="button"
                className={`image-to-base64__pill${previewSource === 'dataurl' ? ' image-to-base64__pill--active' : ''}`}
                aria-pressed={previewSource === 'dataurl'}
                onClick={() => setPreviewSource('dataurl')}
              >
                Data URL preview
              </button>
            </div>

            <div className="image-to-base64__preview">
              <img src={previewSrc ?? undefined} alt={`Preview of ${result.filename}`} />
            </div>

            <dl className="image-to-base64__details">
              <div>
                <dt>Filename</dt>
                <dd title={result.filename}>{result.filename}</dd>
              </div>
              <div>
                <dt>MIME type</dt>
                <dd>{result.mimeType}</dd>
              </div>
              <div>
                <dt>Dimensions</dt>
                <dd>{result.width.toLocaleString()} × {result.height.toLocaleString()} px</dd>
              </div>
              <div>
                <dt>Original size</dt>
                <dd>{formatBytes(result.sizeBytes)}</dd>
              </div>
              <div>
                <dt>Encoded size</dt>
                <dd>{formatBytes(result.encodedBytes)}</dd>
              </div>
              <div>
                <dt>Encoding</dt>
                <dd>Base64 (RFC 4648)</dd>
              </div>
            </dl>

            {result.warnings.length > 0 && (
              <div className="image-to-base64__warnings" role="note">
                <div className="image-to-base64__warnings-heading">
                  <AlertTriangle size={15} aria-hidden="true" /> Processing notes
                </div>
                <ul>
                  {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            )}
          </section>

          <section className="image-to-base64__card image-to-base64__output-card" aria-labelledby="itb-output-heading">
            <div className="image-to-base64__section-heading image-to-base64__section-heading--compact">
              <div>
                <span className="image-to-base64__eyebrow">03 / Conversion output</span>
                <h2 id="itb-output-heading">Base64 &amp; code output</h2>
              </div>
              <span className="image-to-base64__char-badge">{outputCharacters.toLocaleString()} chars</span>
            </div>

            <div className="image-to-base64__output-controls">
              <div className="image-to-base64__tabs" role="group" aria-label="Encoded output format">
                <button
                  type="button"
                  className={`image-to-base64__tab${outputMode === 'base64' && snippet === 'none' ? ' image-to-base64__tab--active' : ''}`}
                  aria-pressed={outputMode === 'base64' && snippet === 'none'}
                  onClick={() => { setOutputMode('base64'); setSnippet('none'); }}
                >
                  Base64 String
                </button>
                <button
                  type="button"
                  className={`image-to-base64__tab${outputMode === 'dataurl' && snippet === 'none' ? ' image-to-base64__tab--active' : ''}`}
                  aria-pressed={outputMode === 'dataurl' && snippet === 'none'}
                  onClick={() => { setOutputMode('dataurl'); setSnippet('none'); }}
                >
                  Data URL
                </button>
              </div>

              <div className="image-to-base64__field">
                <label htmlFor="itb-snippet">Code-ready format</label>
                <select
                  id="itb-snippet"
                  value={snippet}
                  onChange={(event) => setSnippet(event.target.value as SnippetFormat)}
                >
                  {SNIPPET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="image-to-base64__editor-heading">
              <span>{outputLabel}</span>
              <span>{outputCharacters.toLocaleString()} characters · {formatBytes(outputCharacters)}</span>
            </div>
            <textarea
              className="image-to-base64__editor"
              value={activeOutput}
              readOnly
              spellCheck={false}
              aria-label={`${outputLabel} output`}
              data-format={snippet === 'none' ? outputMode : snippet}
            />

            <div className="image-to-base64__stats">
              <div>
                <span>Base64 characters</span>
                <strong>{result.base64.length.toLocaleString()}</strong>
              </div>
              <div>
                <span>Original size</span>
                <strong>{formatBytes(result.sizeBytes)}</strong>
              </div>
              <div>
                <span>Encoded size</span>
                <strong>{formatBytes(result.encodedBytes)}</strong>
              </div>
              <div>
                <span>Size increase</span>
                <strong>+{calculateOverheadPercent(result).toFixed(1)}%</strong>
              </div>
            </div>

            <p className="image-to-base64__hint">
              <Info size={13} aria-hidden="true" /> Base64 stores binary data as text, so the encoded output is about one third
              larger than the original file. Switching tabs or code formats reuses the same conversion.
            </p>

            {feedback && (
              <div
                className={`image-to-base64__message image-to-base64__message--${feedback.kind}`}
                role={feedback.kind === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                <span>
                  {feedback.kind === 'success' && <Check size={15} aria-hidden="true" />}
                  {feedback.kind === 'error' && <AlertTriangle size={15} aria-hidden="true" />}
                  {feedback.kind === 'info' && <Info size={15} aria-hidden="true" />}
                  {feedback.text}
                </span>
                <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message"><X size={15} /></button>
              </div>
            )}

            <div className="image-to-base64__actions">
              <div className="image-to-base64__action-group">
                <h3>Copy</h3>
                <div className="image-to-base64__action-buttons">
                  <button type="button" className="image-to-base64__button image-to-base64__button--primary" onClick={() => void handleCopy(result.base64, 'Base64 string')}>
                    <Copy size={15} aria-hidden="true" /> Copy Base64 String
                  </button>
                  <button type="button" className="image-to-base64__button image-to-base64__button--secondary" onClick={() => void handleCopy(result.dataUrl, 'Data URL')}>
                    <Copy size={15} aria-hidden="true" /> Copy Data URL
                  </button>
                  <button
                    type="button"
                    className="image-to-base64__button image-to-base64__button--secondary"
                    onClick={() => void handleCopy(activeOutput, 'Current output')}
                    disabled={snippet === 'none'}
                    title={snippet === 'none' ? 'Select an HTML, CSS, JavaScript, JSON or Markdown format first' : undefined}
                  >
                    <Copy size={15} aria-hidden="true" /> Copy generated code
                  </button>
                </div>
              </div>

              <div className="image-to-base64__action-group">
                <h3>Download</h3>
                <div className="image-to-base64__action-buttons">
                  <button type="button" className="image-to-base64__button image-to-base64__button--secondary" onClick={handleDownloadTxt}>
                    <Download size={15} aria-hidden="true" /> Download .txt
                  </button>
                  <button type="button" className="image-to-base64__button image-to-base64__button--secondary" onClick={handleDownloadJson}>
                    <FileJson size={15} aria-hidden="true" /> Download .json
                  </button>
                </div>
              </div>

              <div className="image-to-base64__action-group image-to-base64__action-group--footer">
                <button type="button" className="image-to-base64__button image-to-base64__button--secondary" onClick={openFilePicker}>
                  <RefreshCw size={15} aria-hidden="true" /> Convert another image
                </button>
                <button type="button" className="image-to-base64__button image-to-base64__button--danger" onClick={clearConversion}>
                  <Trash2 size={15} aria-hidden="true" /> Clear conversion
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        status !== 'reading' && (
          <section className="image-to-base64__empty" aria-labelledby="itb-empty-heading">
            <span className="image-to-base64__empty-art" aria-hidden="true"><ImageIcon size={28} /></span>
            <h2 id="itb-empty-heading">No image selected</h2>
            <p>
              Drop an image above or browse your device to generate a Base64 string, a Data URL and code-ready
              snippets for HTML, CSS, JavaScript, JSON and Markdown.
            </p>
            <button type="button" className="image-to-base64__button image-to-base64__button--primary" onClick={openFilePicker}>
              <Upload size={15} aria-hidden="true" /> Select an image
            </button>
          </section>
        )
      )}
    </div>
  );
}
