import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  FileImage,
  FileUp,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { copyTextToClipboard, formatBytes } from '../../../utils/imageToBase64';
import {
  buildDataUrl,
  decodeBase64Image,
  downloadBlobFile,
  FORMAT_OPTIONS,
  IMAGE_FORMATS,
  MAX_BASE64_INPUT_CHARS,
  MAX_DECODED_IMAGE_BYTES,
  normalizeDownloadFilename,
  SUPPORTED_MIME_LABEL,
  type DecodedImageResult,
  type SupportedImageFormat,
} from '../../../utils/base64ToImage';
import './base64-to-image.css';

type DecodeStatus = 'idle' | 'decoding' | 'ready' | 'error';

interface Feedback {
  kind: 'success' | 'error' | 'info';
  text: string;
}

const TXT_ACCEPT = '.txt,.b64,text/plain';
const MAX_TXT_FILE_BYTES = MAX_BASE64_INPUT_CHARS + 1024 * 1024;

export default function Base64ToImageConverter() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  const [input, setInput] = useState('');
  const [rawFormat, setRawFormat] = useState<SupportedImageFormat>('png');
  const [status, setStatus] = useState<DecodeStatus>('idle');
  const [result, setResult] = useState<DecodedImageResult | null>(null);
  const [filename, setFilename] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      revokePreviewUrl();
    };
  }, []);

  const usesDataUrlMime = useMemo(() => {
    const trimmed = input.trim();
    if (!/^data:/i.test(trimmed)) return false;
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) return false;
    const header = trimmed.slice(5, commaIndex);
    const mime = (header.split(';')[0] ?? '').trim().toLowerCase();
    return mime.startsWith('image/');
  }, [input]);

  const showFormatSelector = !usesDataUrlMime;
  const trimmedInput = input.trim();
  const isDecoding = status === 'decoding';
  const expectedFormat = result ? result.formatLabel : IMAGE_FORMATS[rawFormat].label;

  const invalidateResult = () => {
    requestRef.current += 1;
    revokePreviewUrl();
    setResult(null);
    setStatus('idle');
    setFilename('');
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    if (result || status === 'error') {
      invalidateResult();
      setFeedback(null);
    }
  };

  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextFormat = event.target.value as SupportedImageFormat;
    setRawFormat(nextFormat);
    if (result) {
      invalidateResult();
      setFeedback({
        kind: 'info',
        text: `Format changed to ${IMAGE_FORMATS[nextFormat].label}. Decode the image again to refresh the preview.`,
      });
    }
  };

  const handleDecode = async () => {
    if (!trimmedInput || isDecoding) return;

    requestRef.current += 1;
    const requestId = requestRef.current;

    revokePreviewUrl();
    setResult(null);
    setFilename('');
    setStatus('decoding');
    setFeedback(null);

    try {
      const decoded = await decodeBase64Image(input, rawFormat);
      if (requestRef.current !== requestId) {
        URL.revokeObjectURL(decoded.previewUrl);
        return;
      }

      previewUrlRef.current = decoded.previewUrl;
      setResult(decoded);
      setStatus('ready');
      setFilename(`decoded-image.${decoded.extension}`);
      setFeedback({
        kind: 'success',
        text: `${decoded.formatLabel} image decoded successfully — ${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px, ${formatBytes(decoded.sizeBytes)}.`,
      });
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      setStatus('error');
      setFeedback({
        kind: 'error',
        text: caught instanceof Error
          ? caught.message
          : 'The Base64 data could not be decoded into an image. Check the input and try again.',
      });
    }
  };

  const handlePasteFromClipboard = async () => {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function' || !window.isSecureContext) {
      setFeedback({
        kind: 'error',
        text: 'Clipboard reading is unavailable in this browser context. Click inside the text area and press Ctrl+V (or Cmd+V) instead.',
      });
      textareaRef.current?.focus();
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setFeedback({ kind: 'info', text: 'The clipboard is empty or does not contain text.' });
        return;
      }
      setInput(text);
      invalidateResult();
      setFeedback({
        kind: 'success',
        text: `Pasted ${text.trim().length.toLocaleString()} characters from the clipboard. Select Decode Image to continue.`,
      });
      textareaRef.current?.focus();
    } catch {
      setFeedback({
        kind: 'error',
        text: 'Clipboard access was blocked. Allow clipboard permission for this site, or paste manually with Ctrl+V.',
      });
    }
  };

  const handleTxtFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size === 0) {
      setFeedback({ kind: 'error', text: 'That TXT file is empty. Choose a file that contains Base64 image data.' });
      return;
    }
    if (file.size > MAX_TXT_FILE_BYTES) {
      setFeedback({
        kind: 'error',
        text: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_TXT_FILE_BYTES)} so the Base64 text fits safely in browser memory.`,
      });
      return;
    }

    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      if (!text.trim()) {
        setFeedback({ kind: 'error', text: 'The TXT file does not contain any text. Choose a different file.' });
        return;
      }
      setInput(text);
      invalidateResult();
      setFeedback({
        kind: 'success',
        text: `Loaded ${file.name} (${formatBytes(file.size)}). Select Decode Image to preview the image.`,
      });
      textareaRef.current?.focus();
    } catch {
      setFeedback({
        kind: 'error',
        text: 'The TXT file could not be read. It may be corrupted, locked by another app, or inaccessible.',
      });
    }
  };

  const handleClearInput = () => {
    setInput('');
    invalidateResult();
    setFeedback({ kind: 'info', text: 'Input cleared. Paste a Base64 string or Data URL to start again.' });
    textareaRef.current?.focus();
  };

  const handleReset = () => {
    setInput('');
    invalidateResult();
    setRawFormat('png');
    setFeedback({ kind: 'info', text: 'Tool reset. All input, preview and filename settings were cleared.' });
    textareaRef.current?.focus();
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
        text: caught instanceof Error
          ? caught.message
          : 'The clipboard is unavailable. Select the text manually and press Ctrl+C.',
      });
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const safeFilename = normalizeDownloadFilename(filename, result.extension);
    try {
      downloadBlobFile(result.downloadBlob, safeFilename);
      setFilename(safeFilename);
      setFeedback({ kind: 'success', text: `Downloaded ${safeFilename} (${result.formatLabel}, ${formatBytes(result.sizeBytes)}).` });
    } catch {
      setFeedback({
        kind: 'error',
        text: 'The download could not be started. Check that this browser allows downloads and try again.',
      });
    }
  };

  return (
    <div className="base64-to-image">
      <section className="base64-to-image__panel" aria-labelledby="b64i-input-heading">
        <div className="base64-to-image__section-heading">
          <div>
            <span className="base64-to-image__eyebrow">37 / Image tools</span>
            <h2 id="b64i-input-heading">Paste Your Base64 Image</h2>
            <p>Accepts a complete Data URL or raw Base64 data. Everything is decoded locally in your browser.</p>
          </div>
          <span className="base64-to-image__local-badge">
            <ShieldCheck size={14} aria-hidden="true" /> Processed locally
          </span>
        </div>

        <div className="base64-to-image__field">
          <div className="base64-to-image__field-heading">
            <label htmlFor="b64i-input">Base64 or Data URL</label>
            <span>{trimmedInput.length.toLocaleString()} chars</span>
          </div>
          <textarea
            id="b64i-input"
            ref={textareaRef}
            className="base64-to-image__textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...\n\nor raw Base64:\niVBORw0KGgoAAAANSUhEUgAA...'}
            spellCheck={false}
            aria-describedby="b64i-input-hint"
            wrap="soft"
          />
        </div>

        <div className="base64-to-image__input-toolbar">
          <div className="base64-to-image__input-actions">
            <button type="button" className="base64-to-image__button base64-to-image__button--secondary" onClick={() => void handlePasteFromClipboard()}>
              <ClipboardPaste size={15} aria-hidden="true" /> Paste from Clipboard
            </button>
            <button type="button" className="base64-to-image__button base64-to-image__button--secondary" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={15} aria-hidden="true" /> Upload Base64 TXT
            </button>
            <button
              type="button"
              className="base64-to-image__button base64-to-image__button--ghost"
              onClick={handleClearInput}
              disabled={!input && !result}
            >
              <Trash2 size={15} aria-hidden="true" /> Clear Input
            </button>
            <button
              type="button"
              className="base64-to-image__button base64-to-image__button--ghost"
              onClick={handleReset}
            >
              <RotateCcw size={15} aria-hidden="true" /> Reset Tool
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={TXT_ACCEPT}
              className="base64-to-image__file-input"
              onChange={(event) => void handleTxtFile(event)}
              aria-label="Upload a TXT file containing Base64 image data"
            />
          </div>

          <div className="base64-to-image__decode-row">
            {showFormatSelector && (
              <div className="base64-to-image__format-field">
                <label htmlFor="b64i-format">Image format</label>
                <select id="b64i-format" value={rawFormat} onChange={handleFormatChange}>
                  {FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              className="base64-to-image__button base64-to-image__button--primary base64-to-image__decode-button"
              onClick={() => void handleDecode()}
              disabled={!trimmedInput || isDecoding}
            >
              {isDecoding
                ? <><LoaderCircle size={16} className="base64-to-image__spinner" aria-hidden="true" /> Decoding…</>
                : <><RefreshCw size={16} aria-hidden="true" /> Decode Image</>}
            </button>
          </div>
        </div>

        <p className="base64-to-image__hint" id="b64i-input-hint">
          <Info size={13} aria-hidden="true" />
          The format selector is used only when the input has no image MIME type. Data URLs such as
          &nbsp;<code>data:image/png;base64,…</code>&nbsp; set the format automatically. Limit: {formatBytes(MAX_DECODED_IMAGE_BYTES)} decoded.
        </p>

        {isDecoding && (
          <div className="base64-to-image__message base64-to-image__message--info" role="status" aria-live="polite">
            <span><LoaderCircle size={15} className="base64-to-image__spinner" aria-hidden="true" /> Validating and decoding the image locally…</span>
          </div>
        )}

        {feedback && !isDecoding && (
          <div
            className={`base64-to-image__message base64-to-image__message--${feedback.kind}`}
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
      </section>

      {result ? (
        <div className="base64-to-image__workspace">
          <section className="base64-to-image__card" aria-labelledby="b64i-preview-heading">
            <div className="base64-to-image__section-heading base64-to-image__section-heading--compact">
              <div>
                <span className="base64-to-image__eyebrow">02 / Image preview</span>
                <h2 id="b64i-preview-heading">Decoded image</h2>
              </div>
              <span className="base64-to-image__badge">{result.formatLabel}</span>
            </div>

            <div className="base64-to-image__preview">
              <img src={result.previewUrl} alt={`Decoded ${result.formatLabel} image preview`} />
            </div>

            <dl className="base64-to-image__details">
              <div>
                <dt>Image Format</dt>
                <dd>{result.formatLabel}</dd>
              </div>
              <div>
                <dt>MIME Type</dt>
                <dd>{result.mimeType}</dd>
              </div>
              <div>
                <dt>Width</dt>
                <dd>{result.width.toLocaleString()} px</dd>
              </div>
              <div>
                <dt>Height</dt>
                <dd>{result.height.toLocaleString()} px</dd>
              </div>
              <div>
                <dt>File Size</dt>
                <dd>{formatBytes(result.sizeBytes)}</dd>
              </div>
              <div>
                <dt>Extension</dt>
                <dd>.{result.extension}</dd>
              </div>
            </dl>

            {result.warnings.length > 0 && (
              <div className="base64-to-image__warnings" role="note">
                <div className="base64-to-image__warnings-heading">
                  <AlertTriangle size={15} aria-hidden="true" /> Processing notes
                </div>
                <ul>
                  {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            )}
          </section>

          <section className="base64-to-image__card" aria-labelledby="b64i-actions-heading">
            <div className="base64-to-image__section-heading base64-to-image__section-heading--compact">
              <div>
                <span className="base64-to-image__eyebrow">03 / Export &amp; actions</span>
                <h2 id="b64i-actions-heading">Save or copy the result</h2>
              </div>
            </div>

            <div className="base64-to-image__field">
              <label htmlFor="b64i-filename">Filename</label>
              <div className="base64-to-image__filename-row">
                <input
                  id="b64i-filename"
                  type="text"
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  placeholder={`decoded-image.${result.extension}`}
                  spellCheck={false}
                />
                <button type="button" className="base64-to-image__button base64-to-image__button--primary" onClick={handleDownload}>
                  <Download size={15} aria-hidden="true" /> Download Image
                </button>
              </div>
              <p className="base64-to-image__micro-hint">
                The download contains the decoded binary image and uses the .{result.extension} extension automatically.
              </p>
            </div>

            <div className="base64-to-image__action-group">
              <h3>Copy</h3>
              <div className="base64-to-image__action-buttons">
                <button
                  type="button"
                  className="base64-to-image__button base64-to-image__button--secondary"
                  onClick={() => void handleCopy(result.base64, 'Normalized Base64')}
                >
                  <Copy size={15} aria-hidden="true" /> Copy Base64
                </button>
                <button
                  type="button"
                  className="base64-to-image__button base64-to-image__button--secondary"
                  onClick={() => void handleCopy(buildDataUrl(result.base64, result.mimeType), 'Data URL')}
                >
                  <Copy size={15} aria-hidden="true" /> Copy Data URL
                </button>
              </div>
            </div>

            <div className="base64-to-image__summary">
              <div>
                <span>Input type</span>
                <strong>{result.fromDataUrl ? 'Data URL' : 'Raw Base64'}</strong>
              </div>
              <div>
                <span>Normalized chars</span>
                <strong>{result.base64.length.toLocaleString()}</strong>
              </div>
              <div>
                <span>Resolution</span>
                <strong>{result.width.toLocaleString()} × {result.height.toLocaleString()}</strong>
              </div>
            </div>

            <div className="base64-to-image__action-group base64-to-image__action-group--footer">
              <button type="button" className="base64-to-image__button base64-to-image__button--secondary" onClick={() => textareaRef.current?.focus()}>
                <RefreshCw size={15} aria-hidden="true" /> Edit Input
              </button>
              <button type="button" className="base64-to-image__button base64-to-image__button--danger" onClick={handleReset}>
                <Trash2 size={15} aria-hidden="true" /> Reset Tool
              </button>
            </div>
          </section>
        </div>
      ) : (
        !isDecoding && (
          <section className="base64-to-image__empty" aria-labelledby="b64i-empty-heading">
            <span className="base64-to-image__empty-art" aria-hidden="true"><FileImage size={26} /></span>
            <h2 id="b64i-empty-heading">No decoded image yet</h2>
            <p>
              Paste a Data URL or raw Base64 string above, choose the format when needed, and select
              Decode Image. Expected format: {expectedFormat}.
            </p>
            <span className="base64-to-image__empty-formats">
              <ImageIcon size={13} aria-hidden="true" /> {SUPPORTED_MIME_LABEL}
            </span>
          </section>
        )
      )}

      <section className="base64-to-image__help" aria-labelledby="b64i-help-heading">
        <div>
          <span className="base64-to-image__eyebrow">How it works</span>
          <h2 id="b64i-help-heading">Decode Base64 image data safely</h2>
        </div>
        <ol className="base64-to-image__steps">
          <li><span>1</span><p><strong>Paste or upload</strong> a Data URL, raw Base64 text, or a TXT file containing either.</p></li>
          <li><span>2</span><p><strong>Pick the format</strong> for raw input. Data URLs already include their MIME type.</p></li>
          <li><span>3</span><p><strong>Decode</strong> to validate the bytes, preview the image and read its real dimensions.</p></li>
          <li><span>4</span><p><strong>Download or copy</strong> using a custom filename and the correct extension.</p></li>
        </ol>
        <p className="base64-to-image__help-note">
          SVG input is sanitized before preview: scripts, event handlers and external resource references are removed or
          rejected. URL-safe Base64 (<code>-</code> and <code>_</code>) is converted automatically. Nothing is uploaded
          and no image data is stored in local storage.
        </p>
      </section>
    </div>
  );
}
