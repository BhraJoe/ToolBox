import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  FileImage,
  Image as ImageIcon,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  compressImage,
  formatFileSize,
  getImageExtension,
  getSupportedImageFormats,
  MAX_BATCH_FILES,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  readImageDimensions,
  type ImageDimensions,
  type ImageOutputFormat,
} from '../../../utils/imageCompressor';
import './image-compressor.css';

type CompressionStatus = 'ready' | 'compressing' | 'done' | 'error';
type Preset = 'maximum' | 'balanced' | 'high' | 'custom';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  dimensions: ImageDimensions | null;
  resultBlob: Blob | null;
  resultUrl: string | null;
  status: CompressionStatus;
  error: string | null;
}

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string; quality: number }[] = [
  { id: 'maximum', label: 'Maximum compression', quality: 35 },
  { id: 'balanced', label: 'Balanced', quality: 72 },
  { id: 'high', label: 'High quality', quality: 90 },
];

const DEFAULT_PRESET: Preset = 'balanced';

function isSupportedFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = /\.(jpe?g|png|webp)$/i;
  return allowedTypes.includes(file.type) || allowedExtensions.test(file.name);
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getOutputDimensions(
  original: ImageDimensions,
  scale: number | null,
  width: number,
  height: number,
  lockAspect: boolean,
  allowUpscale: boolean,
): ImageDimensions {
  if (scale !== null) {
    return {
      width: Math.max(1, Math.round(original.width * scale / 100)),
      height: Math.max(1, Math.round(original.height * scale / 100)),
    };
  }

  let outputWidth = width;
  let outputHeight = height;
  if (lockAspect) {
    const fitScale = Math.min(width / original.width, height / original.height);
    const finalScale = allowUpscale ? fitScale : Math.min(1, fitScale);
    outputWidth = Math.round(original.width * finalScale);
    outputHeight = Math.round(original.height * finalScale);
  } else if (!allowUpscale) {
    outputWidth = Math.min(width, original.width);
    outputHeight = Math.min(height, original.height);
  }

  return { width: Math.max(1, outputWidth), height: Math.max(1, outputHeight) };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function outputFilename(base: string, format: ImageOutputFormat): string {
  const cleaned = base.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\.[^.]+$/, '') || 'image-compressed';
  return `${cleaned}.${getImageExtension(format)}`;
}

function dimensionsLabel(dimensions: ImageDimensions | null): string {
  return dimensions ? `${dimensions.width.toLocaleString()} × ${dimensions.height.toLocaleString()} px` : 'Reading dimensions…';
}

function getReduction(original: number, compressed: number): number {
  return ((original - compressed) / original) * 100;
}

export default function ImageCompressor() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [supportedFormats] = useState<ImageOutputFormat[]>(() => getSupportedImageFormats());
  const [format, setFormat] = useState<ImageOutputFormat>(() => {
    const available = getSupportedImageFormats();
    return available.includes('webp') ? 'webp' : available[0] ?? 'jpeg';
  });
  const [quality, setQuality] = useState(72);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [scale, setScale] = useState<number | null>(100);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [lockAspect, setLockAspect] = useState(true);
  const [allowUpscale, setAllowUpscale] = useState(false);
  const [customFilename, setCustomFilename] = useState('image-compressed');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef(new Set<string>());

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
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

  const addFiles = async (fileList: FileList | File[]) => {
    if (processing) return;
    setMessage(null);
    const selected = Array.from(fileList);
    if (images.length + selected.length > MAX_BATCH_FILES) {
      setMessage({ text: `Choose up to ${MAX_BATCH_FILES} images at a time.`, kind: 'error' });
      return;
    }

    for (const file of selected) {
      if (!isSupportedFile(file)) {
        setMessage({ text: `${file.name}: choose a JPEG, PNG or WEBP image.`, kind: 'error' });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setMessage({ text: `${file.name} is larger than the 30 MB per-image limit.`, kind: 'error' });
        continue;
      }

      const previewUrl = createManagedUrl(file);
      try {
        const dimensions = await readImageDimensions(file);
        if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
          revokeManagedUrl(previewUrl);
          setMessage({ text: `${file.name} has more than 80 million pixels and may exceed browser memory limits.`, kind: 'error' });
          continue;
        }
        setImages((current) => [...current, {
          id: newId(),
          file,
          previewUrl,
          dimensions,
          resultBlob: null,
          resultUrl: null,
          status: 'ready',
          error: null,
        }]);
      } catch {
        revokeManagedUrl(previewUrl);
        setMessage({ text: `${file.name} could not be decoded. It may be damaged or unsupported.`, kind: 'error' });
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    const item = images.find((image) => image.id === id);
    if (item) {
      revokeManagedUrl(item.previewUrl);
      revokeManagedUrl(item.resultUrl);
    }
    setImages((current) => current.filter((image) => image.id !== id));
  };

  const clearResults = () => {
    setImages((current) => current.map((image) => {
      revokeManagedUrl(image.resultUrl);
      return { ...image, resultBlob: null, resultUrl: null, status: 'ready', error: null };
    }));
  };

  const compressAll = async () => {
    if (images.length === 0 || processing) return;
    if (scale === null && (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)) {
      setMessage({ text: 'Enter positive whole-number dimensions before compressing.', kind: 'error' });
      return;
    }

    const queue = [...images];
    queue.forEach((image) => revokeManagedUrl(image.resultUrl));
    setImages((current) => current.map((image) => ({
      ...image,
      resultBlob: null,
      resultUrl: null,
      status: 'compressing',
      error: null,
    })));
    setProcessing(true);
    setProgress({ done: 0, total: queue.length });
    setMessage(null);

    let successes = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const image = queue[index];
      try {
        if (!image.dimensions) throw new Error('Image dimensions are unavailable. Remove and add this image again.');
        const dimensions = getOutputDimensions(image.dimensions, scale, width, height, lockAspect, allowUpscale);
        if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
          throw new Error('Output dimensions exceed the 80 million pixel limit. Reduce the size and retry.');
        }
        const resultBlob = await compressImage(image.file, { ...dimensions, format, quality });
        const resultUrl = createManagedUrl(resultBlob);
        setImages((current) => current.map((item) => item.id === image.id
          ? { ...item, resultBlob, resultUrl, status: 'done', error: null }
          : item));
        successes += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Compression failed. Try another image or format.';
        setImages((current) => current.map((item) => item.id === image.id
          ? { ...item, status: 'error', error: errorMessage }
          : item));
      }
      setProgress({ done: index + 1, total: queue.length });
    }

    setProcessing(false);
    setMessage({
      text: successes === queue.length
        ? `${successes} ${successes === 1 ? 'image' : 'images'} compressed successfully.`
        : `${successes} of ${queue.length} images compressed. Review the errors below and retry as needed.`,
      kind: successes > 0 ? 'success' : 'error',
    });
  };

  const downloadImage = (image: ImageItem, index: number) => {
    if (!image.resultBlob) return;
    const base = index === 0 && images.length === 1
      ? customFilename
      : `${image.file.name.replace(/\.[^.]+$/, '')}-compressed`;
    try {
      downloadBlob(image.resultBlob, outputFilename(base, format));
    } catch {
      setMessage({ text: 'The download could not be started. Check browser download permissions and try again.', kind: 'error' });
    }
  };

  const downloadAll = () => {
    const completed = images.filter((image) => image.resultBlob);
    if (completed.length === 0) return;
    try {
      completed.forEach((image) => {
        const base = `${image.file.name.replace(/\.[^.]+$/, '')}-compressed`;
        downloadBlob(image.resultBlob as Blob, outputFilename(base, format));
      });
    } catch {
      setMessage({ text: 'Some downloads could not be started. Check browser download permissions and try again.', kind: 'error' });
    }
  };

  const resetSettings = () => {
    clearResults();
    setQuality(72);
    setPreset(DEFAULT_PRESET);
    setScale(100);
    setWidth(1200);
    setHeight(800);
    setLockAspect(true);
    setAllowUpscale(false);
    setFormat(supportedFormats.includes('webp') ? 'webp' : supportedFormats[0] ?? 'jpeg');
    setCustomFilename('image-compressed');
    setMessage({ text: 'Compression settings reset.', kind: 'success' });
  };

  const firstDimensions = images[0]?.dimensions;
  const completedCount = images.filter((image) => image.resultBlob).length;

  return (
    <div className="image-compressor">
      <section className="image-compressor__upload" aria-labelledby="image-upload-title">
        <div className="image-compressor__section-heading">
          <div>
            <span className="image-compressor__eyebrow">01 / Select images</span>
            <h2 id="image-upload-title">Drop images here</h2>
            <p>JPEG, PNG and WEBP · Up to 30 MB each · Maximum {MAX_BATCH_FILES} images</p>
          </div>
          <span className="image-compressor__local-badge"><Check size={14} /> Local processing</span>
        </div>
        <div
          className={`image-compressor__dropzone${dragging ? ' image-compressor__dropzone--active' : ''}${processing ? ' image-compressor__dropzone--disabled' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!processing) setDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
        >
          <div className="image-compressor__upload-icon"><Upload size={23} /></div>
          <div>
            <strong>Drag and drop images to begin</strong>
            <span>or browse from your device</span>
          </div>
          <button type="button" className="image-compressor__button image-compressor__button--secondary" onClick={() => inputRef.current?.click()} disabled={processing}>
            <FileImage size={16} /> Browse files
          </button>
          <input
            ref={inputRef}
            className="image-compressor__file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            aria-label="Choose images to compress"
            onChange={(event) => { if (event.target.files) void addFiles(event.target.files); }}
          />
        </div>
      </section>

      {message && (
        <div className={`image-compressor__message image-compressor__message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          <span>{message.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={15} /></button>
        </div>
      )}

      <div className="image-compressor__workspace">
        <aside className="image-compressor__settings" aria-labelledby="image-settings-title">
          <div className="image-compressor__section-heading image-compressor__section-heading--compact">
            <div>
              <span className="image-compressor__eyebrow">02 / Adjust</span>
              <h2 id="image-settings-title">Compression settings</h2>
            </div>
          </div>

          <div className="image-compressor__field">
            <label htmlFor="image-output-format">Output format</label>
            <select id="image-output-format" value={format} disabled={processing} onChange={(event) => { clearResults(); setFormat(event.target.value as ImageOutputFormat); }}>
              {supportedFormats.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
            </select>
            {format === 'jpeg' && <p className="image-compressor__hint">JPEG does not support transparency. Transparent areas are filled with white.</p>}
            {format === 'png' && <p className="image-compressor__hint">PNG is lossless; the quality slider does not reduce its size like JPEG or WEBP.</p>}
            {format !== 'png' && <p className="image-compressor__hint">Converting formats may change color, transparency or image detail.</p>}
          </div>

          <div className="image-compressor__field">
            <span className="image-compressor__label">Quality preset</span>
            <div className="image-compressor__presets" role="group" aria-label="Compression quality preset">
              {PRESETS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={preset === item.id ? 'image-compressor__preset image-compressor__preset--active' : 'image-compressor__preset'}
                  aria-pressed={preset === item.id}
                  disabled={processing}
                  onClick={() => { clearResults(); setPreset(item.id); setQuality(item.quality); }}
                >
                  <strong>{item.label}</strong><span>{item.quality}%</span>
                </button>
              ))}
            </div>
            <div className="image-compressor__range-heading">
              <label htmlFor="image-quality">Quality {preset === 'custom' ? '· Custom' : ''}</label>
              <output htmlFor="image-quality">{quality}%</output>
            </div>
            <input id="image-quality" type="range" min="1" max="100" value={quality} disabled={processing} onChange={(event) => { clearResults(); setQuality(Number(event.target.value)); setPreset('custom'); }} />
            <div className="image-compressor__range-labels"><span>Smaller file</span><span>Higher quality</span></div>
          </div>

          <div className="image-compressor__field">
            <div className="image-compressor__field-title">
              <span className="image-compressor__label">Resize</span>
              <span className="image-compressor__original-size">Original: {dimensionsLabel(firstDimensions ?? null)}</span>
            </div>
            <div className="image-compressor__resize-presets" role="group" aria-label="Resize percentage">
              {[25, 50, 75, 100].map((value) => (
                <button type="button" key={value} className={scale === value ? 'image-compressor__scale image-compressor__scale--active' : 'image-compressor__scale'} aria-pressed={scale === value} disabled={processing} onClick={() => { clearResults(); setScale(value); }}>{value}%</button>
              ))}
              <button
                type="button"
                className={scale === null ? 'image-compressor__scale image-compressor__scale--active' : 'image-compressor__scale'}
                aria-pressed={scale === null}
                disabled={processing}
                onClick={() => {
                  clearResults();
                  setScale(null);
                  if (firstDimensions) {
                    setWidth(firstDimensions.width);
                    setHeight(firstDimensions.height);
                  }
                }}
              >Custom</button>
            </div>
            <div className="image-compressor__dimension-grid">
              <div>
                <label htmlFor="image-width">Width (px)</label>
                <input id="image-width" type="number" min="1" max="12000" step="1" value={scale === null ? width : firstDimensions ? Math.round(firstDimensions.width * scale / 100) : ''} disabled={processing || scale !== null} aria-invalid={scale === null && (!Number.isInteger(width) || width < 1)} onChange={(event) => {
                  const nextWidth = Number(event.target.value);
                  clearResults();
                  setScale(null);
                  setWidth(nextWidth);
                  if (lockAspect && firstDimensions && nextWidth > 0) setHeight(Math.max(1, Math.round(nextWidth * firstDimensions.height / firstDimensions.width)));
                }} />
              </div>
              <div>
                <label htmlFor="image-height">Height (px)</label>
                <input id="image-height" type="number" min="1" max="12000" step="1" value={scale === null ? height : firstDimensions ? Math.round(firstDimensions.height * scale / 100) : ''} disabled={processing || scale !== null} aria-invalid={scale === null && (!Number.isInteger(height) || height < 1)} onChange={(event) => {
                  const nextHeight = Number(event.target.value);
                  clearResults();
                  setScale(null);
                  setHeight(nextHeight);
                  if (lockAspect && firstDimensions && nextHeight > 0) setWidth(Math.max(1, Math.round(nextHeight * firstDimensions.width / firstDimensions.height)));
                }} />
              </div>
            </div>
            <label className="image-compressor__check" htmlFor="image-lock-aspect">
              <input id="image-lock-aspect" type="checkbox" checked={lockAspect} disabled={processing} onChange={(event) => { clearResults(); setLockAspect(event.target.checked); }} />
              <span>Maintain aspect ratio</span>
            </label>
            <label className="image-compressor__check" htmlFor="image-allow-upscale">
              <input id="image-allow-upscale" type="checkbox" checked={allowUpscale} disabled={processing} onChange={(event) => { clearResults(); setAllowUpscale(event.target.checked); }} />
              <span>Allow upscaling beyond original size</span>
            </label>
            {scale === null && (width < 1 || height < 1 || width * height > MAX_IMAGE_PIXELS) && (
              <p className="image-compressor__error">Use positive dimensions with no more than 80 million output pixels.</p>
            )}
          </div>

          <div className="image-compressor__field">
            <label htmlFor="image-custom-name">Download filename</label>
            <div className="image-compressor__filename-control">
              <input id="image-custom-name" type="text" value={customFilename} disabled={processing} onChange={(event) => setCustomFilename(event.target.value)} aria-describedby="image-filename-hint" />
              <span>.{getImageExtension(format)}</span>
            </div>
            <p id="image-filename-hint" className="image-compressor__hint">Used when downloading one image. Batch downloads use each original name.</p>
          </div>

          <div className="image-compressor__settings-actions">
            <button type="button" className="image-compressor__button image-compressor__button--primary" onClick={() => void compressAll()} disabled={!images.length || processing || supportedFormats.length === 0 || (scale === null && (width < 1 || height < 1 || width * height > MAX_IMAGE_PIXELS))}>
              {processing ? <LoaderCircle className="image-compressor__spinner" size={17} /> : <ImageIcon size={17} />}
              {processing ? 'Compressing…' : `Compress ${images.length || 'images'}`}
            </button>
            <button type="button" className="image-compressor__reset" onClick={resetSettings} disabled={processing}><RotateCcw size={15} /> Reset settings</button>
          </div>
        </aside>

        <section className="image-compressor__results" aria-labelledby="image-results-title">
          <div className="image-compressor__results-heading">
            <div>
              <span className="image-compressor__eyebrow">03 / Compare</span>
              <h2 id="image-results-title">Before and after</h2>
            </div>
            {completedCount > 1 && <button type="button" className="image-compressor__button image-compressor__button--secondary" onClick={downloadAll}><ArrowDownToLine size={15} /> Download all</button>}
          </div>

          {processing && (
            <div className="image-compressor__progress" role="status" aria-live="polite">
              <div><LoaderCircle className="image-compressor__spinner" size={16} /><span>Processing image {progress.done + 1} of {progress.total}</span><strong>{progress.done}/{progress.total}</strong></div>
              <progress max={progress.total} value={progress.done} aria-label="Compression progress" />
            </div>
          )}

          {images.length === 0 ? (
            <div className="image-compressor__empty">
              <div className="image-compressor__empty-art"><ImageIcon size={30} /></div>
              <strong>Your comparison appears here</strong>
              <p>Add one or more images to see their size, dimensions and compressed result.</p>
            </div>
          ) : (
            <div className="image-compressor__image-list">
              {images.map((image, index) => {
                const reduction = image.resultBlob ? getReduction(image.file.size, image.resultBlob.size) : null;
                const outputDimensions = image.dimensions ? getOutputDimensions(image.dimensions, scale, width, height, lockAspect, allowUpscale) : null;
                return (
                  <article className="image-compressor__image-result" key={image.id}>
                    <div className="image-compressor__file-heading">
                      <div className="image-compressor__file-icon"><FileImage size={18} /></div>
                      <div className="image-compressor__file-name"><strong title={image.file.name}>{image.file.name}</strong><span>{formatFileSize(image.file.size)} · {dimensionsLabel(image.dimensions)}</span></div>
                      <span className={`image-compressor__status image-compressor__status--${image.status}`}>
                        {image.status === 'compressing' ? <LoaderCircle className="image-compressor__spinner" size={13} /> : image.status === 'done' ? <Check size={13} /> : null}
                        {image.status === 'ready' ? 'Ready' : image.status === 'compressing' ? 'Working' : image.status === 'done' ? 'Complete' : 'Error'}
                      </span>
                      <button type="button" className="image-compressor__icon-button" aria-label={`Remove ${image.file.name}`} disabled={processing} onClick={() => removeImage(image.id)}><Trash2 size={16} /></button>
                    </div>

                    {image.error && <p className="image-compressor__error" role="alert">{image.error}</p>}

                    {image.resultUrl && image.resultBlob ? (
                      <>
                        <div className="image-compressor__comparison">
                          <div className="image-compressor__image-panel">
                            <div className="image-compressor__panel-label"><span>Original</span><span>{formatFileSize(image.file.size)}</span></div>
                            <div className="image-compressor__preview"><img src={image.previewUrl} alt={`Original ${image.file.name}`} /></div>
                            <span className="image-compressor__dimensions">{dimensionsLabel(image.dimensions)} · {(image.file.type.split('/')[1] || image.file.name.split('.').pop() || '').toUpperCase()}</span>
                          </div>
                          <div className="image-compressor__image-panel">
                            <div className="image-compressor__panel-label"><span>Compressed</span><span>{formatFileSize(image.resultBlob.size)}</span></div>
                            <div className="image-compressor__preview"><img src={image.resultUrl} alt={`Compressed ${image.file.name}`} /></div>
                            <span className="image-compressor__dimensions">{dimensionsLabel(outputDimensions)} · {format.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className={`image-compressor__saving${reduction !== null && reduction < 0 ? ' image-compressor__saving--larger' : ''}`}>
                          <div><span className="image-compressor__saving-mark">{reduction !== null && reduction < 0 ? '↑' : '↓'}</span><strong>{reduction !== null && reduction < 0 ? `${Math.abs(reduction).toFixed(1)}% larger` : `${(reduction ?? 0).toFixed(1)}% smaller`}</strong><span>{reduction !== null && reduction < 0 ? `${formatFileSize(image.resultBlob.size - image.file.size)} added` : `${formatFileSize(image.file.size - image.resultBlob.size)} saved`}</span></div>
                          <button type="button" className="image-compressor__button image-compressor__button--secondary" onClick={() => downloadImage(image, index)}><ArrowDownToLine size={15} /> Download</button>
                        </div>
                      </>
                    ) : (
                      <div className="image-compressor__queued-preview">
                        <img src={image.previewUrl} alt={`Preview of ${image.file.name}`} />
                        <div><strong>{image.status === 'error' ? 'Compression needs attention' : 'Ready to compress'}</strong><span>Output will be {format.toUpperCase()} at {quality}% quality.</span></div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}