import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpToLine,
  Clock,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  ImageDown,
  ImagePlus,
  LoaderCircle,
  Palette,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  computePlacement,
  determineOrientation,
  downloadBlob,
  ensurePdfExtension,
  formatBytes,
  generatePdf,
  getMarginById,
  getPageSizeById,
  isSupportedFile,
  MAX_BATCH_FILES,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  PDF_MARGINS,
  PDF_PAGE_SIZES,
  PDF_PLACEMENTS,
  validateAndReadImage,
  type PdfGenerationOptions,
  type PdfImageEntry,
  type PdfMarginId,
  type PdfPageSizeId,
  type PdfPlacement,
  type PdfOrientation,
} from '../../../utils/imageToPdf';
import './image-to-pdf.css';

type Status = 'idle' | 'adding' | 'converting' | 'done' | 'error';

interface Message {
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface ImageItem extends PdfImageEntry {
  previewUrl: string;
  warnings: string[];
}

const DEFAULT_OPTIONS: PdfGenerationOptions = {
  pageSizeId: 'a4',
  orientation: 'auto',
  marginId: 'medium',
  customMarginMm: 10,
  placement: 'fit',
  backgroundColor: '#ffffff',
};

const MM_PER_PX = 25.4 / 96;

function dimensionsLabel(width: number, height: number): string {
  return `${width.toLocaleString()} × ${height.toLocaleString()} px`;
}

export default function ImageToPdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef(new Set<string>());
  const requestRef = useRef(0);

  const [options, setOptions] = useState<PdfGenerationOptions>(() => ({ ...DEFAULT_OPTIONS }));
  const [customFilename, setCustomFilename] = useState('converted-images');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Message | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generationMeta, setGenerationMeta] = useState<{ filename: string; pageCount: number; fileSize: number } | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    return () => {
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

  const addFiles = async (fileList: File[] | FileList) => {
    if (status === 'converting') return;
    setError(null);

    const selected = Array.from(fileList);

    if (images.length + selected.length > MAX_BATCH_FILES) {
      setMessage({ kind: 'error', text: `Choose up to ${MAX_BATCH_FILES} images in total.` });
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    for (const file of selected) {
      if (requestRef.current !== requestId) return;

      if (!isSupportedFile(file)) {
        setMessage({ kind: 'error', text: `${file.name}: unsupported format.` });
        continue;
      }

      if (file.size === 0) {
        setMessage({ kind: 'error', text: `${file.name} is empty.` });
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setMessage({ kind: 'error', text: `${file.name} exceeds size limit.` });
        continue;
      }

      const previewUrl = createManagedUrl(file);
      let result: { mimeType: string; width: number; height: number; warnings: string[] };

      try {
        result = await validateAndReadImage(file);
        if (requestRef.current !== requestId) return;
      } catch (caught) {
        revokeManagedUrl(previewUrl);
        const msg = caught instanceof Error ? caught.message : 'Could not decode.';
        setMessage({ kind: 'error', text: `${file.name}: ${msg}` });
        continue;
      }

      if (result.width * result.height > MAX_IMAGE_PIXELS) {
        revokeManagedUrl(previewUrl);
        setMessage({ kind: 'error', text: `${file.name} may exceed memory limits.` });
        continue;
      }

      setImages((current) => [...current, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
        previewUrl,
        warnings: result.warnings,
      }]);

      if (result.warnings.length > 0) {
        setMessage({ kind: 'info', text: `${file.name}: ${result.warnings.join(' ')}` });
      }
    }

    if (inputRef.current) inputRef.current.value = '';
    setGeneratedBlob(null);
    setGenerationMeta(null);
    setPreviewPage(1);
  };

  const removeImage = (id: string) => {
    const item = images.find((img) => img.id === id);
    if (item) revokeManagedUrl(item.previewUrl);
    setImages((current) => current.filter((img) => img.id !== id));
    setGeneratedBlob(null);
    setGenerationMeta(null);
    setPreviewPage(1);
    if (images.length === 1) setMessage({ kind: 'success', text: 'Image removed.' });
  };

  const clearAllImages = () => {
    images.forEach((img) => revokeManagedUrl(img.previewUrl));
    setImages([]);
    setGeneratedBlob(null);
    setGenerationMeta(null);
    setPreviewPage(1);
    setError(null);
    setMessage({ kind: 'success', text: 'All images cleared.' });
  };

  const moveImage = (id: string, direction: -1 | 1) => {
    const index = images.findIndex((img) => img.id === id);
    if (index === -1) return;
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    const moved = next.splice(index, 1)[0];
    next.splice(target, 0, moved);
    setImages(next);
    setGeneratedBlob(null);
    setGenerationMeta(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length > 0) void addFiles(files);
  };

  const addMore = () => inputRef.current?.click();

  const isMarginCustom = options.marginId === 'custom';
  const marginOption = getMarginById(options.marginId);
  const marginMm = isMarginCustom ? options.customMarginMm : marginOption.mm;

  const totalSize = images.reduce((sum, img) => sum + img.file.size, 0);

  let previewLayout: {
    pageWidth: number;
    pageHeight: number;
    placements: Array<{ x: number; y: number; width: number; height: number }>;
    orientation: 'portrait' | 'landscape';
  } | null = null;
  let previewError: string | null = null;

  if (images.length > 0) {
    try {
      const validatedMargin = marginMm >= 0 && Number.isFinite(marginMm);
      if (!validatedMargin) throw new Error('Invalid custom margin.');

      const refs = images.map((img) => {
        const imageWidthMm = img.width * MM_PER_PX;
        const imageHeightMm = img.height * MM_PER_PX;
        const basePage = getPageSizeById(options.pageSizeId);
        if (options.pageSizeId === 'fit') {
          return { width: imageWidthMm, height: imageHeightMm, orientation: 'portrait' as const };
        }
        let w = basePage.width;
        let h = basePage.height;
        if (options.orientation === 'auto') {
          const orientation = determineOrientation('auto', basePage.width, basePage.height, imageWidthMm, imageHeightMm);
          if (orientation === 'landscape') { [w, h] = [h, w]; }
          return { width: w, height: h, orientation };
        } else {
          if (options.orientation === 'landscape') { [w, h] = [h, w]; }
          return { width: w, height: h, orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait' };
        }
      });

      const ref = refs[0];
      const pageWidth = ref.width;
      const pageHeight = ref.height;
      const orientation = ref.orientation as 'portrait' | 'landscape';

      const placements = images.map((img) => {
        const imageWidthMm = img.width * MM_PER_PX;
        const imageHeightMm = img.height * MM_PER_PX;
        return computePlacement(pageWidth, pageHeight, imageWidthMm, imageHeightMm, options.placement, marginMm);
      });

      previewLayout = { pageWidth, pageHeight, placements, orientation };
    } catch (caught) {
      previewError = caught instanceof Error ? caught.message : 'Invalid page settings.';
    }
  }

  const visiblePlacements = previewLayout?.placements.slice(previewPage - 1, previewPage) ?? [];

  const convertToPdf = async () => {
    if (images.length === 0) {
      setError('Add at least one image before converting.');
      return;
    }
    if (status === 'converting') return;

    const marginValidated = marginMm >= 0 && Number.isFinite(marginMm);
    if (!marginValidated) {
      setError('Custom margin must be a non-negative number.');
      return;
    }

    setStatus('converting');
    setError(null);
    setFeedback(null);
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      const result = await generatePdf(images, options);
      if (requestRef.current !== requestId) return;
      const filename = ensurePdfExtension(customFilename || 'converted-images');
      setGeneratedBlob(result.blob);
      setGenerationMeta({ filename, pageCount: result.pageCount, fileSize: result.fileSize });
      setStatus('done');
      setFeedback({ kind: 'success', text: `PDF created with ${result.pageCount} page(s).` });
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'PDF generation failed.');
    }
  };

  const downloadPdf = () => {
    if (!generatedBlob || !generationMeta) return;
    try {
      downloadBlob(generatedBlob, generationMeta.filename);
      setFeedback({ kind: 'success', text: `${generationMeta.filename} is ready to download.` });
    } catch {
      setError('Download could not be started. Check browser permissions.');
    }
  };

  const resetTool = () => {
    clearAllImages();
    setOptions({ ...DEFAULT_OPTIONS });
    setCustomFilename('converted-images');
    setPreviewPage(1);
    setStatus('idle');
    setError(null);
    setMessage(null);
    setFeedback({ kind: 'info', text: 'Tool reset. Upload images to start again.' });
  };

  const previewPageCount = images.length;
  const pageLabel = previewPageCount > 0 ? `Page ${previewPage} of ${previewPageCount}` : '';

  const convertButtonDisabled = images.length === 0 || status === 'converting';

  const setOption = <K extends keyof PdfGenerationOptions>(key: K, value: PdfGenerationOptions[K]) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setGeneratedBlob(null);
    setGenerationMeta(null);
  };

  const previewImage = (image: ImageItem) => {
    const link = document.createElement('a');
    link.href = image.previewUrl;
    link.download = image.file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="image-to-pdf">
      <section className="image-to-pdf__upload" aria-labelledby="upload-heading">
        <div className="image-to-pdf__section-heading">
          <div>
            <span className="image-to-pdf__eyebrow">01 / Upload images</span>
            <h2 id="upload-heading">Upload Images</h2>
            <p>PNG, JPG, JPEG, WEBP, GIF, BMP · Up to {formatBytes(MAX_IMAGE_SIZE_BYTES)} each · Maximum {MAX_BATCH_FILES} images</p>
          </div>
          <span className="image-to-pdf__local-badge">
            <ImageIcon size={13} aria-hidden="true" /> Local processing
          </span>
        </div>

        <div
          className={`image-to-pdf__dropzone${dragging ? ' image-to-pdf__dropzone--active' : ''}${status === 'converting' ? ' image-to-pdf__dropzone--disabled' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={handleDrop}
        >
          <div className="image-to-pdf__upload-icon" aria-hidden="true"><Upload size={23} /></div>
          <div>
            <strong>Drag and drop images</strong>
            <span>or browse from your device</span>
          </div>
          <button type="button" className="image-to-pdf__button image-to-pdf__button--secondary" onClick={addMore} disabled={status === 'converting'}>
            <FileImage size={16} /> Browse Files
          </button>
          <input
            ref={inputRef}
            className="image-to-pdf__file-input"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg"
            multiple
            aria-label="Choose images to convert"
            onChange={handleInputChange}
          />
        </div>

        {error && (
          <div className="image-to-pdf__message image-to-pdf__message--error" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X size={15} /></button>
          </div>
        )}

        {message && (
          <div className={`image-to-pdf__message image-to-pdf__message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            <span>{message.text}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={15} /></button>
          </div>
        )}

        {images.length > 0 && (
          <div className="image-to-pdf__file-summary">
            <span>{images.length} image{images.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatBytes(totalSize)}</span>
          </div>
        )}
      </section>

      <div className="image-to-pdf__workspace">
        <aside className="image-to-pdf__settings" aria-labelledby="settings-heading">
          <div className="image-to-pdf__section-heading image-to-pdf__section-heading--compact">
            <div>
              <span className="image-to-pdf__eyebrow">02 / PDF settings</span>
              <h2 id="settings-heading">Page settings</h2>
            </div>
          </div>

          <div className="image-to-pdf__field">
            <label htmlFor="pdf-page-size">Page size</label>
            <select id="pdf-page-size" value={options.pageSizeId} onChange={(event) => setOption('pageSizeId', event.target.value as PdfPageSizeId)}>
              {PDF_PAGE_SIZES.map((size) => (
                <option key={size.id} value={size.id}>{size.label}</option>
              ))}
            </select>
            {options.pageSizeId === 'fit' && (
              <p className="image-to-pdf__hint">Page size matches each image dimensions.</p>
            )}
          </div>

          <div className="image-to-pdf__field">
            <label htmlFor="pdf-orientation">Page orientation</label>
            <select id="pdf-orientation" value={options.orientation} onChange={(event) => setOption('orientation', event.target.value as PdfOrientation)}>
              <option value="auto">Auto</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
            <p className="image-to-pdf__hint">Auto picks portrait or landscape based on image aspect ratio.</p>
          </div>

          <div className="image-to-pdf__field">
            <label htmlFor="pdf-margin">Page margins</label>
            <select id="pdf-margin" value={options.marginId} onChange={(event) => setOption('marginId', event.target.value as PdfMarginId)}>
              {PDF_MARGINS.map((margin) => (
                <option key={margin.id} value={margin.id}>{margin.label}</option>
              ))}
            </select>
            {options.marginId === 'custom' && (
              <div className="image-to-pdf__custom-margin">
                <label htmlFor="pdf-custom-margin">Custom margin (mm)</label>
                <input
                  id="pdf-custom-margin"
                  type="number"
                  min="0"
                  step="0.1"
                  value={options.customMarginMm}
                  onChange={(event) => setOption('customMarginMm', Number(event.target.value))}
                  aria-invalid={marginMm < 0 || !Number.isFinite(marginMm)}
                />
                {marginMm < 0 || !Number.isFinite(marginMm) && (
                  <p className="image-to-pdf__hint">Margin must be a valid number.</p>
                )}
              </div>
            )}
            <p className="image-to-pdf__hint">The margin applies around each page.</p>
          </div>

          <div className="image-to-pdf__field">
            <label htmlFor="pdf-placement">Image placement</label>
            <select id="pdf-placement" value={options.placement} onChange={(event) => setOption('placement', event.target.value as PdfPlacement)}>
              {PDF_PLACEMENTS.map((placement) => (
                <option key={placement.id} value={placement.id}>{placement.label}</option>
              ))}
            </select>
            {options.placement === 'fill' && (
              <p className="image-to-pdf__hint">Fill Page may crop parts of an image when its aspect ratio differs from the page.</p>
            )}
          </div>

          <div className="image-to-pdf__field">
            <label htmlFor="pdf-background">Background color</label>
            <div className="image-to-pdf__color-control">
              <input
                id="pdf-background"
                type="color"
                value={options.backgroundColor}
                onChange={(event) => setOption('backgroundColor', event.target.value)}
              />
              <span>{options.backgroundColor.toUpperCase()}</span>
            </div>
            <p className="image-to-pdf__hint">Applied to page areas not covered by the image.</p>
          </div>

          <div className="image-to-pdf__field">
            <label htmlFor="pdf-filename">Output filename</label>
            <div className="image-to-pdf__filename-control">
              <input
                id="pdf-filename"
                type="text"
                value={customFilename}
                onChange={(event) => setCustomFilename(event.target.value)}
                aria-describedby="pdf-filename-hint"
              />
              <span>.pdf</span>
            </div>
            <p id="pdf-filename-hint" className="image-to-pdf__hint">The .pdf extension is added automatically. Duplicate extensions are removed.</p>
          </div>

          <div className="image-to-pdf__settings-actions">
            <button type="button" className="image-to-pdf__button image-to-pdf__button--primary" onClick={() => void convertToPdf()} disabled={convertButtonDisabled}>
              {status === 'converting' ? <LoaderCircle size={17} className="image-to-pdf__spinner" /> : <ImageDown size={17} />}
              {status === 'converting' ? 'Converting…' : `Convert to PDF (${images.length})`}
            </button>
            <button type="button" className="image-to-pdf__reset" onClick={resetTool}><RotateCcw size={15} /> Reset Tool</button>
          </div>
        </aside>

        <main className="image-to-pdf__content">
          {images.length === 0 ? (
            <div className="image-to-pdf__empty">
              <div className="image-to-pdf__empty-art"><ImageIcon size={48} /></div>
              <strong>Your images appear here</strong>
              <p>Upload one or more images to see a list, reorder them, and configure PDF page settings.</p>
            </div>
          ) : (
            <>
              <div className="image-to-pdf__file-list">
                {images.map((image, index) => (
                  <article className="image-to-pdf__image-item" key={image.id}>
                    <div className="image-to-pdf__item-thumb">
                      <img src={image.previewUrl} alt={`Preview ${image.file.name}`} />
                      <span className="image-to-pdf__position">{index + 1}</span>
                    </div>
                    <div className="image-to-pdf__item-info">
                      <strong title={image.file.name}>{image.file.name}</strong>
                      <div className="image-to-pdf__item-meta">
                        <span>{image.mimeType.split('/')[1].toUpperCase()}</span>
                        <span>·</span>
                        <span>{formatBytes(image.file.size)}</span>
                        <span>·</span>
                        <span>{dimensionsLabel(image.width, image.height)}</span>
                      </div>
                    </div>
                    <div className="image-to-pdf__item-actions">
                      <button type="button" className="image-to-pdf__icon-button" aria-label="Move up" disabled={index === 0} onClick={() => moveImage(image.id, -1)}>
                        <ArrowUpToLine size={14} />
                      </button>
                      <button type="button" className="image-to-pdf__icon-button" aria-label="Move down" disabled={index === images.length - 1} onClick={() => moveImage(image.id, 1)}>
                        <ArrowDownToLine size={14} />
                      </button>
                      <button type="button" className="image-to-pdf__icon-button" aria-label="Preview" onClick={() => previewImage(image)}>
                        <ImageIcon size={14} />
                      </button>
                      <button type="button" className="image-to-pdf__icon-button image-to-pdf__icon-button--danger" aria-label="Remove" onClick={() => removeImage(image.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="image-to-pdf__actions-bar">
                <button type="button" className="image-to-pdf__button image-to-pdf__button--secondary" onClick={addMore}><ImagePlus size={15} /> Add More</button>
                <button type="button" className="image-to-pdf__button image-to-pdf__button--secondary" onClick={clearAllImages}><Trash2 size={15} /> Clear All</button>
              </div>

              <section className="image-to-pdf__preview" aria-labelledby="preview-heading">
                <div className="image-to-pdf__preview-heading">
                  <div>
                    <span className="image-to-pdf__eyebrow">03 / Preview</span>
                    <h2 id="preview-heading">PDF page preview</h2>
                  </div>
                  <span className="image-to-pdf__local-badge"><Palette size={13} aria-hidden="true" /> Layout</span>
                </div>

                {previewError && (
                  <div className="image-to-pdf__message image-to-pdf__message--error" role="alert">{previewError}</div>
                )}

                {previewLayout && (
                  <>
                    <div className="image-to-pdf__preview-canvas">
                      <div className="image-to-pdf__page-frame" style={{ width: `${previewLayout.pageWidth * 3}px`, height: `${previewLayout.pageHeight * 3}px`, background: options.backgroundColor }}>
                        <div className="image-to-pdf__page-content" style={{ width: `${previewLayout.pageWidth * 3}px`, height: `${previewLayout.pageHeight * 3}px` }}>
                          {visiblePlacements.map((placement, i) => {
                            const image = images[previewPage - 1 + i];
                            if (!image) return null;
                            return (
                              <div
                                className="image-to-pdf__preview-placement"
                                key={image.id}
                                style={{
                                  left: `${placement.x * 3}px`,
                                  top: `${placement.y * 3}px`,
                                  width: `${placement.width * 3}px`,
                                  height: `${placement.height * 3}px`,
                                }}
                              >
                                <img src={image.previewUrl} alt={`Preview page ${previewPage}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="image-to-pdf__page-info">{pageLabel}</div>
                    </div>

                    {previewPageCount > 1 && (
                      <div className="image-to-pdf__preview-nav">
                        <button type="button" className="image-to-pdf__nav-button" disabled={previewPage <= 1} onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}>
                          <ArrowLeft size={16} />
                        </button>
                        <span className="image-to-pdf__page-label">{pageLabel}</span>
                        <button type="button" className="image-to-pdf__nav-button" disabled={previewPage >= previewPageCount} onClick={() => setPreviewPage((p) => Math.min(previewPageCount, p + 1))}>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {status === 'done' && generationMeta && generatedBlob && (
                <section className="image-to-pdf__success" role="status" aria-live="polite">
                  <div className="image-to-pdf__success-icon"><FileText size={32} /></div>
                  <strong>PDF generated</strong>
                  <div className="image-to-pdf__success-details">
                    <span>{generationMeta.filename}</span>
                    <span>·</span>
                    <span>{generationMeta.pageCount} page{generationMeta.pageCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{formatBytes(generationMeta.fileSize)}</span>
                  </div>
                  <div className="image-to-pdf__success-actions">
                    <button type="button" className="image-to-pdf__button image-to-pdf__button--primary" onClick={downloadPdf}>
                      <Download size={16} /> Download PDF
                    </button>
                    <button type="button" className="image-to-pdf__button image-to-pdf__button--secondary" onClick={() => {
                      setGeneratedBlob(null);
                      setGenerationMeta(null);
                      setStatus('idle');
                      setPreviewPage(1);
                    }}><Clock size={15} /> Generate Another</button>
                  </div>
                </section>
              )}
            </>
          )}

          {feedback && (
            <div className={`image-to-pdf__message image-to-pdf__message--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
              <span>{feedback.text}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}><X size={15} /></button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}