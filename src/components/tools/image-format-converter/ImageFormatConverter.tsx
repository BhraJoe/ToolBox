import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  FileImage,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildOutputFilename,
  compareSizes,
  convertImage,
  detectImageFormat,
  formatBytes,
  getOutputFormatInfo,
  getSupportedOutputFormats,
  OUTPUT_FORMATS,
  readImageDimensions,
  type ConversionResult,
  type DetectedInput,
  type OutputFormat,
} from '../../../utils/imageFormatConverter';
import './image-format-converter.css';

type Status = 'idle' | 'reading' | 'ready' | 'converting' | 'done' | 'error';

interface Feedback {
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface LoadedImage {
  file: File;
  previewUrl: string;
  input: DetectedInput;
  dimensions: { width: number; height: number };
}

interface ResultState extends ConversionResult {
  url: string;
  quality: number;
  backgroundColor: string;
  format: OutputFormat;
}

const ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg';

function defaultTargetForInput(input: DetectedInput, supported: OutputFormat[]): OutputFormat {
  const map: Record<string, OutputFormat> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const current = map[input.mimeType] ?? null;
  return supported.find((format) => format !== current) ?? supported[0] ?? 'png';
}

function dimensionsLabel(width: number, height: number): string {
  return `${width.toLocaleString()} × ${height.toLocaleString()} px`;
}

function formatLabelForInput(input: DetectedInput): string {
  return `${input.formatLabel} (${input.mimeType})`;
}

export default function ImageFormatConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<Set<string>>(new Set());
  const requestRef = useRef(0);

  const [supportedFormats] = useState<OutputFormat[]>(() => getSupportedOutputFormats());
  const [targetFormat, setTargetFormat] = useState<OutputFormat>(() => {
    const supported = getSupportedOutputFormats();
    return supported.includes('webp') ? 'webp' : supported[0] ?? 'png';
  });
  const [quality, setQuality] = useState(90);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [customName, setCustomName] = useState('converted-image');
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    };
  }, []);

  const createManagedUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  };

  const revokeManagedUrl = (url: string | null) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  };

  const resetResult = () => {
    if (result) {
      revokeManagedUrl(result.url);
      setResult(null);
    }
  };

  const clearResult = () => {
    if (result) {
      revokeManagedUrl(result.url);
      setResult(null);
    }
  };

  const resetFile = () => {
    requestRef.current += 1;
    if (loaded) {
      revokeManagedUrl(loaded.previewUrl);
    }
    clearResult();
    setLoaded(null);
    setStatus('idle');
    setError(null);
    setFeedback(null);
    setQuality(90);
    setBackgroundColor('#ffffff');
    setCustomName('converted-image');
  };

  const loadFile = async (file: File) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (loaded) {
      revokeManagedUrl(loaded.previewUrl);
    }
    clearResult();
    setLoaded(null);
    setError(null);
    setFeedback(null);
    setStatus('reading');

    try {
      const input = await detectImageFormat(file);
      if (requestRef.current !== requestId) return;

      const dimensions = await readImageDimensions(file, input);
      if (requestRef.current !== requestId) return;

      if (dimensions.width * dimensions.height > 80_000_000) {
        throw new Error('This image has more than 80 million pixels and may exceed browser memory limits.');
      }

      const previewUrl = createManagedUrl(file);
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'converted-image';
      setCustomName(baseName);
      setLoaded({ file, previewUrl, input, dimensions });
      setTargetFormat(defaultTargetForInput(input, supportedFormats));
      setStatus('ready');

      const notes: string[] = [];
      if (input.isGif) {
        notes.push('GIF input: Canvas conversion exports a still frame (usually the first frame). Animation is not preserved.');
      }
      if (input.isSvg) {
        notes.push(...input.warnings);
      }
      if (notes.length > 0) {
        setFeedback({ kind: 'info', text: notes.join(' ') });
      } else {
        setFeedback(null);
      }
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      setLoaded(null);
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'The image could not be read. Try another file.');
      setFeedback(null);
    }
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

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleConvert = async () => {
    if (!loaded || status === 'converting') return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setStatus('converting');
    setError(null);
    setFeedback(null);
    resetResult();

    try {
      const conversion = await convertImage(loaded.file, loaded.input, {
        format: targetFormat,
        quality,
        backgroundColor,
      });
      if (requestRef.current !== requestId) return;

      const url = createManagedUrl(conversion.blob);
      setResult({
        ...conversion,
        url,
        quality,
        backgroundColor,
        format: targetFormat,
      });
      setStatus('done');
      setFeedback({ kind: 'success', text: `${targetFormat.toUpperCase()} conversion completed locally. Nothing was uploaded.` });
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      setStatus('error');
      const message = caught instanceof Error ? caught.message : 'The conversion failed. Try another format or image.';
      setError(message);
      setFeedback({ kind: 'error', text: message });
    }
  };

  const handleDownload = () => {
    if (!result) return;
    try {
      const filename = buildOutputFilename(customName, result.format);
      const link = document.createElement('a');
      link.href = result.url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({ kind: 'success', text: `${filename} is ready to download.` });
    } catch {
      setFeedback({ kind: 'error', text: 'The download could not be started. Check browser download permissions and try again.' });
    }
  };

  const handleReset = () => {
    resetFile();
    setFeedback({ kind: 'info', text: 'Tool reset. Upload an image to start again.' });
  };

  const handleFormatChange = (format: OutputFormat) => {
    clearResult();
    setTargetFormat(format);
  };

  const handleQualityChange = (value: number) => {
    clearResult();
    setQuality(value);
  };

  const handleBackgroundChange = (value: string) => {
    clearResult();
    setBackgroundColor(value);
  };

  const targetInfo = getOutputFormatInfo(targetFormat);
  const comparison = loaded && result
    ? compareSizes(loaded.file.size, result.blob.size)
    : null;

  return (
    <div className="image-format-converter">
      <section className="image-format-converter__upload" aria-labelledby="ifc-upload-heading">
        <div className="image-format-converter__section-heading">
          <div>
            <span className="image-format-converter__eyebrow">01 / Select image</span>
            <h2 id="ifc-upload-heading">Upload Your Image</h2>
            <p>Drag and drop an image or browse your device. Files are processed locally.</p>
          </div>
          <span className="image-format-converter__local-badge">
            <ShieldCheck size={14} aria-hidden="true" /> Processed locally
          </span>
        </div>

        <div
          className={`image-format-converter__dropzone${dragging ? ' image-format-converter__dropzone--active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={handleDrop}
        >
          <div className="image-format-converter__upload-icon" aria-hidden="true">
            <Upload size={23} />
          </div>
          <div>
            <strong>Drag and drop an image</strong>
            <span>PNG, JPG, JPEG, WEBP, GIF, BMP, SVG · max {formatBytes(30 * 1024 * 1024)}</span>
          </div>
          <button
            type="button"
            className="image-format-converter__button image-format-converter__button--secondary"
            onClick={openFilePicker}
          >
            <FileImage size={16} /> Browse Files
          </button>
          <input
            ref={inputRef}
            className="image-format-converter__file-input"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            aria-label="Choose an image file"
            onChange={handleInputChange}
          />
        </div>

        {status === 'reading' && (
          <div className="image-format-converter__reading" role="status" aria-live="polite">
            <LoaderCircle size={16} className="image-format-converter__spinner" aria-hidden="true" />
            <span>Reading and validating the image…</span>
          </div>
        )}

        {error && (
          <div className="image-format-converter__message image-format-converter__message--error" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X size={15} /></button>
          </div>
        )}

        {loaded && (
          <div className="image-format-converter__file-summary">
            <div className="image-format-converter__file-summary-main">
              <span className="image-format-converter__file-icon" aria-hidden="true"><ImageIcon size={17} /></span>
              <div>
                <strong title={loaded.file.name}>{loaded.file.name}</strong>
                <span>{formatLabelForInput(loaded.input)} · {dimensionsLabel(loaded.dimensions.width, loaded.dimensions.height)} · {formatBytes(loaded.file.size)}</span>
              </div>
            </div>
            <div className="image-format-converter__file-summary-actions">
              <button type="button" className="image-format-converter__button image-format-converter__button--secondary" onClick={openFilePicker}>
                <RefreshCw size={14} /> Replace
              </button>
              <button type="button" className="image-format-converter__icon-button" onClick={resetFile} aria-label="Remove image">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {loaded && (
        <div className="image-format-converter__workspace">
          <section className="image-format-converter__card" aria-labelledby="ifc-original-heading">
            <div className="image-format-converter__section-heading image-format-converter__section-heading--compact">
              <div>
                <span className="image-format-converter__eyebrow">02 / Original</span>
                <h2 id="ifc-original-heading">Original image</h2>
              </div>
            </div>

            <div className="image-format-converter__preview">
              <img src={loaded.previewUrl} alt={`Original ${loaded.file.name}`} />
            </div>

            <dl className="image-format-converter__details">
              <div>
                <dt>Filename</dt>
                <dd title={loaded.file.name}>{loaded.file.name}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{loaded.input.formatLabel}</dd>
              </div>
              <div>
                <dt>MIME type</dt>
                <dd>{loaded.input.mimeType}</dd>
              </div>
              <div>
                <dt>Dimensions</dt>
                <dd>{dimensionsLabel(loaded.dimensions.width, loaded.dimensions.height)}</dd>
              </div>
              <div>
                <dt>File size</dt>
                <dd>{formatBytes(loaded.file.size)}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>Local file</dd>
              </div>
            </dl>
          </section>

          <aside className="image-format-converter__settings" aria-labelledby="ifc-settings-heading">
            <div className="image-format-converter__section-heading image-format-converter__section-heading--compact">
              <div>
                <span className="image-format-converter__eyebrow">03 / Adjust</span>
                <h2 id="ifc-settings-heading">Conversion settings</h2>
              </div>
            </div>

            <div className="image-format-converter__field">
              <label htmlFor="ifc-format">Target format</label>
              <select id="ifc-format" value={targetFormat} onChange={(event) => handleFormatChange(event.target.value as OutputFormat)}>
                {OUTPUT_FORMATS.map((info) => {
                  const available = supportedFormats.includes(info.value);
                  return (
                    <option key={info.value} value={info.value} disabled={!available}>
                      {info.label}{available ? '' : ' (unavailable in this browser)'}
                    </option>
                  );
                })}
              </select>
              {targetFormat === 'png' && (
                <p className="image-format-converter__hint">
                  PNG is lossless. The browser's standard Canvas PNG export does not use the same lossy quality setting as JPEG or WEBP.
                </p>
              )}
              {targetFormat === 'jpeg' && (
                <p className="image-format-converter__hint">
                  JPEG does not support transparency. Transparent areas are filled with the background color below.
                </p>
              )}
              {targetFormat === 'webp' && (
                <p className="image-format-converter__hint">
                  WEBP supports transparency and lossy quality. Values are encoded locally by your browser.
                </p>
              )}
            </div>

            <div className="image-format-converter__field">
              <div className="image-format-converter__range-heading">
                <label htmlFor="ifc-quality" className={!targetInfo.supportsQuality ? 'image-format-converter__label--muted' : ''}>
                  Quality{targetInfo.supportsQuality ? '' : ' (PNG ignores quality)'}
                </label>
                <output htmlFor="ifc-quality" className={!targetInfo.supportsQuality ? 'image-format-converter__output--muted' : ''}>
                  {targetInfo.supportsQuality ? `${quality}%` : 'N/A'}
                </output>
              </div>
              <input
                id="ifc-quality"
                type="range"
                min="1"
                max="100"
                value={quality}
                disabled={!targetInfo.supportsQuality}
                onChange={(event) => handleQualityChange(Number(event.target.value))}
              />
              <div className="image-format-converter__range-labels">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
            </div>

            {targetFormat === 'jpeg' && (
              <div className="image-format-converter__field">
                <label htmlFor="ifc-background">Background color</label>
                <div className="image-format-converter__color-control">
                  <input
                    id="ifc-background"
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => handleBackgroundChange(event.target.value)}
                  />
                  <span>{backgroundColor.toUpperCase()}</span>
                </div>
                <p className="image-format-converter__hint">
                  This color fills transparent pixels when converting to JPEG. The default is white.
                </p>
              </div>
            )}

            <div className="image-format-converter__field">
              <label htmlFor="ifc-filename">Output filename</label>
              <div className="image-format-converter__filename-control">
                <input
                  id="ifc-filename"
                  type="text"
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  aria-describedby="ifc-filename-hint"
                />
                <span>.{targetInfo.extension}</span>
              </div>
              <p id="ifc-filename-hint" className="image-format-converter__hint">
                The file extension is added automatically. A duplicate extension is not added.
              </p>
            </div>

            <div className="image-format-converter__settings-actions">
              <button
                type="button"
                className="image-format-converter__button image-format-converter__button--primary"
                onClick={() => void handleConvert()}
                disabled={status === 'converting'}
              >
                {status === 'converting'
                  ? <LoaderCircle size={17} className="image-format-converter__spinner" />
                  : <RefreshCw size={17} />}
                {status === 'converting' ? 'Converting…' : 'Convert Image'}
              </button>
              <button type="button" className="image-format-converter__reset" onClick={handleReset}>
                <RotateCcw size={15} /> Reset Tool
              </button>
            </div>

            {feedback && (
              <div
                className={`image-format-converter__message image-format-converter__message--${feedback.kind}`}
                role={feedback.kind === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                <span>
                  {feedback.kind === 'success' && <Check size={15} aria-hidden="true" />}
                  {feedback.kind === 'info' && <Info size={15} aria-hidden="true" />}
                  {feedback.text}
                </span>
                <button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}><X size={15} /></button>
              </div>
            )}
          </aside>

          <section className="image-format-converter__results" aria-labelledby="ifc-result-heading">
            <div className="image-format-converter__results-heading">
              <div>
                <span className="image-format-converter__eyebrow">04 / Compare</span>
                <h2 id="ifc-result-heading">Converted result</h2>
              </div>
            </div>

            <div className="image-format-converter__comparison">
              <div className="image-format-converter__image-panel">
                <div className="image-format-converter__panel-label">
                  <span>Original</span>
                  <span>{formatBytes(loaded.file.size)}</span>
                </div>
                <div className="image-format-converter__preview">
                  <img src={loaded.previewUrl} alt={`Original ${loaded.file.name}`} />
                </div>
                <span className="image-format-converter__dimensions">{dimensionsLabel(loaded.dimensions.width, loaded.dimensions.height)} · {loaded.input.formatLabel}</span>
              </div>
              <div className="image-format-converter__image-panel">
                <div className="image-format-converter__panel-label">
                  <span>Converted</span>
                  <span>{result ? formatBytes(result.blob.size) : '—'}</span>
                </div>
                <div className="image-format-converter__preview">
                  {result ? (
                    <img src={result.url} alt={`Converted ${customName}`} />
                  ) : (
                    <div className="image-format-converter__preview-empty">
                      {status === 'converting'
                        ? <LoaderCircle size={22} className="image-format-converter__spinner" />
                        : <ImageIcon size={22} />}
                      <span>{status === 'converting' ? 'Converting…' : 'No result yet'}</span>
                    </div>
                  )}
                </div>
                <span className="image-format-converter__dimensions">
                  {result ? `${dimensionsLabel(result.width, result.height)} · ${result.format.toUpperCase()}` : `Target: ${targetFormat.toUpperCase()}`}
                </span>
              </div>
            </div>

            {result && comparison && (
              <>
                <div className={`image-format-converter__saving${comparison.isLarger ? ' image-format-converter__saving--larger' : ''}`}>
                  <div>
                    <span className="image-format-converter__saving-mark">{comparison.isLarger ? '↑' : '↓'}</span>
                    <strong>
                      {comparison.isLarger
                        ? `${comparison.percent.toFixed(1)}% larger`
                        : `${comparison.percent.toFixed(1)}% smaller`}
                    </strong>
                    <span>
                      {comparison.isLarger
                        ? `${formatBytes(Math.abs(comparison.difference))} added`
                        : `${formatBytes(Math.abs(comparison.difference))} saved`}
                    </span>
                  </div>
                  <span className="image-format-converter__saving-detail">
                    {formatBytes(loaded.file.size)} → {formatBytes(result.blob.size)}
                  </span>
                </div>

                <div className="image-format-converter__result-details">
                  <div>
                    <dt>Target format</dt>
                    <dd>{result.format.toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt>MIME type</dt>
                    <dd>{result.mimeType}</dd>
                  </div>
                  <div>
                    <dt>Quality</dt>
                    <dd>{getOutputFormatInfo(result.format).supportsQuality ? `${result.quality}%` : 'Not used'}</dd>
                  </div>
                  <div>
                    <dt>Background</dt>
                    <dd>{result.format === 'jpeg' ? result.backgroundColor.toUpperCase() : 'Preserved'}</dd>
                  </div>
                </div>

                <button
                  type="button"
                  className="image-format-converter__button image-format-converter__button--primary"
                  onClick={handleDownload}
                >
                  <ArrowDownToLine size={16} /> Download Converted Image
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}