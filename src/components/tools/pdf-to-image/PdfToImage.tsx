import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  ImageDown,
  Info,
  LayoutGrid,
  LoaderCircle,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { type PDFDocumentProxy } from 'pdfjs-dist';
import {
  PDF_TO_IMAGE,
  getDpiForResolution,
  getQualityForFormat,
  validatePdfFile,
  renderPageToImage,
  formatBytes,
  sanitizeFilename,
  generateImageFilename,
  downloadBlob,
  type ImageOutputFormat,
  type ResolutionPreset,
  type BackgroundColor,
  type ConversionProgress,
  type ImageExportOptions,
} from '../../../utils/pdfToImage';
import './pdf-to-image.css';

type Status = 'idle' | 'loading' | 'pdf-ready' | 'converting' | 'converted' | 'error';

interface Message {
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface ImageResult {
  pageNumber: number;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

interface PdfPagePreview {
  pageNumber: number;
  thumbnailUrl?: string;
}

interface LoadedPdfInfo {
  fileName: string;
  fileSize: number;
  pageCount: number;
}

const DEFAULT_OUTPUT_FORMAT: ImageOutputFormat = 'PNG';
const DEFAULT_RESOLUTION: ResolutionPreset = 'MEDIUM';
const DEFAULT_BACKGROUND: BackgroundColor = 'white';
const DEFAULT_FILENAME_PREFIX = 'document';

const EMPTY_PROGRESS: ConversionProgress = {
  total: 0,
  completed: 0,
  currentPage: 0,
  status: 'idle',
  errors: [],
};

export default function PdfToImage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [, setPdfFile] = useState<File | null>(null);
  const [pdfInfo, setPdfInfo] = useState<LoadedPdfInfo | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [pageSelection, setPageSelection] = useState<number[]>([]);
  const [pagePreviews, setPagePreviews] = useState<PdfPagePreview[]>([]);
  const [pageRangeInput, setPageRangeInput] = useState('');
  const [pageRangeError, setPageRangeError] = useState<string | null>(null);

  const [outputFormat, setOutputFormat] = useState<ImageOutputFormat>(DEFAULT_OUTPUT_FORMAT);
  const [resolution, setResolution] = useState<ResolutionPreset>(DEFAULT_RESOLUTION);
  const [customDpi, setCustomDpi] = useState(300);
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [background, setBackground] = useState<BackgroundColor>(DEFAULT_BACKGROUND);
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [filenamePrefix, setFilenamePrefix] = useState(DEFAULT_FILENAME_PREFIX);

  const [conversionResults, setConversionResults] = useState<ImageResult[]>([]);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress>(EMPTY_PROGRESS);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Message | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        void pdfDoc.cleanup();
      }
    };
  }, [pdfDoc]);

  const resetPdfState = useCallback(() => {
    setPdfDoc(null);
    setPdfInfo(null);
    setPageSelection([]);
    setPagePreviews([]);
    setPageRangeInput('');
    setPageRangeError(null);
    setConversionResults([]);
    setConversionProgress(EMPTY_PROGRESS);
    setPdfError(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const requestId = ++requestRef.current;
      setPdfError(null);
      setError(null);
      setFeedback(null);
      setStatus('loading');
      setPdfLoading(true);

      const validation = await validatePdfFile(file);

      if (!validation.valid) {
        setPdfError(validation.error ?? 'The file is not a valid PDF.');
        setPdfLoading(false);
        setStatus('error');
        return;
      }

      resetPdfState();
      setPdfLoading(false);

      try {
        const pdfjs = await import('pdfjs-dist');
        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        if (requestRef.current !== requestId) {
          await doc.cleanup();
          return;
        }

        const pageCount = doc.numPages;
        if (pageCount === 0) {
          await doc.cleanup();
          setPdfError('The PDF document is empty.');
          setStatus('error');
          return;
        }

        setPdfDoc(doc);
        setPdfFile(file);
        setPdfInfo({ fileName: file.name, fileSize: file.size, pageCount });

        const previews: PdfPagePreview[] = [];
        const previewLimit = Math.min(pageCount, 50);
        for (let i = 1; i <= previewLimit; i++) {
          if (requestRef.current !== requestId) break;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = Math.floor(viewport.width * 0.5);
          thumbCanvas.height = Math.floor(viewport.height * 0.5);
          const ctx = thumbCanvas.getContext('2d');
          if (ctx) {
            const renderCtx = { canvas: thumbCanvas, ctx, viewport };
            try {
              await page.render(renderCtx).promise;
              previews.push({ pageNumber: i, thumbnailUrl: thumbCanvas.toDataURL('image/png') });
            } catch {
              previews.push({ pageNumber: i });
            }
          } else {
            previews.push({ pageNumber: i });
          }
          await page.cleanup();
        }

        if (requestRef.current === requestId) {
          setPagePreviews(previews);
        }

        setStatus('pdf-ready');
        setFeedback({ kind: 'success', text: `PDF loaded: ${pageCount} pages, ${formatBytes(file.size)}` });
      } catch (caught) {
        if (requestRef.current !== requestId) return;
        const msg = caught instanceof Error ? caught.message : 'Failed to load PDF.';
        const lower = msg.toLowerCase();
        if (lower.includes('password') || lower.includes('encrypt')) {
          setPdfError('The PDF is password-protected or encrypted. Please upload an unlocked PDF.');
        } else {
          setPdfError(`Failed to load PDF: ${msg}`);
        }
        setStatus('error');
      } finally {
        if (requestRef.current === requestId) {
          setPdfLoading(false);
        }
      }
    },
    [resetPdfState]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = '';
  }, [handleFile]);

  const clearPdf = useCallback(() => {
    if (pdfDoc) {
      void pdfDoc.cleanup();
    }
    resetPdfState();
    setStatus('idle');
    setError(null);
    setFeedback({ kind: 'info', text: 'PDF cleared. Ready to upload a new document.' });
  }, [pdfDoc, resetPdfState]);

  const togglePageSelection = useCallback((pageNum: number) => {
    setPageSelection((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  }, []);

  const selectAllPages = useCallback(() => {
    if (!pdfDoc) return;
    const allPages: number[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      allPages.push(i);
    }
    setPageSelection(allPages);
    setPageRangeInput('');
    setPageRangeError(null);
  }, [pdfDoc]);

  const deselectAllPages = useCallback(() => {
    setPageSelection([]);
    setPageRangeInput('');
    setPageRangeError(null);
  }, []);

  const selectPageRange = useCallback(
    (range: string) => {
      setPageRangeInput(range);
      setPageRangeError(null);
      if (!pdfDoc) {
        setPageRangeError('Load a PDF first.');
        return;
      }

      const maxPages = pdfDoc.numPages;
      const selected: number[] = [];
      const parts = range.split(',');
      let hasError = false;

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
        const singleMatch = trimmed.match(/^(\d+)$/);

        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          if (start < 1 || end > maxPages || start > end) {
            hasError = true;
            break;
          }
          for (let i = start; i <= end; i++) {
            if (!selected.includes(i)) selected.push(i);
          }
        } else if (singleMatch) {
          const num = parseInt(singleMatch[1], 10);
          if (num < 1 || num > maxPages) {
            hasError = true;
            break;
          }
          if (!selected.includes(num)) selected.push(num);
        } else {
          hasError = true;
          break;
        }
      }

      if (hasError) {
        setPageRangeError(`Invalid range. Enter page numbers between 1 and ${maxPages}.`);
        return;
      }

      setPageSelection(selected.sort((a, b) => a - b));
    },
    [pdfDoc]
  );

  const convertSelectedPages = useCallback(async () => {
    if (!pdfDoc) {
      setError('No PDF is loaded.');
      return;
    }
    if (pageSelection.length === 0) {
      setError('Select at least one page to convert.');
      return;
    }
    if (status === 'converting') return;

    const options: ImageExportOptions = {
      format: outputFormat,
      resolution,
      customDpi: getDpiForResolution(resolution, customDpi),
      quality: getQualityForFormat(outputFormat, jpegQuality),
      background,
    };

    setStatus('converting');
    setError(null);
    setFeedback(null);
    setConversionProgress({ ...EMPTY_PROGRESS, status: 'processing', total: pageSelection.length });

    const results: ImageResult[] = [];
    const sortedPages = [...pageSelection].sort((a, b) => a - b);

    for (const pageNum of sortedPages) {
      setConversionProgress((prev) => ({ ...prev, currentPage: pageNum, status: 'processing' }));
      try {
        const result = await renderPageToImage(pdfDoc, pageNum, options);
        results.push({
          pageNumber: pageNum,
          blob: result.blob,
          dataUrl: result.dataUrl,
          width: result.width,
          height: result.height,
          fileSize: result.fileSize,
        });
        setConversionProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      } catch (caught) {
        const msg = caught instanceof Error ? caught.message : `Failed to convert page ${pageNum}.`;
        setConversionProgress((prev) => ({
          ...prev,
          completed: prev.completed + 1,
          errors: [...prev.errors, `Page ${pageNum}: ${msg}`],
        }));
        results.push({ pageNumber: pageNum, blob: new Blob(), dataUrl: '', width: 0, height: 0, fileSize: 0 });
      }
    }

    const successful = results.filter((r) => r.fileSize > 0);
    setConversionResults(successful);
    setConversionProgress((prev) => ({ ...prev, status: successful.length > 0 ? 'completed' : 'failed' }));
    setStatus('converted');

    const successText = successful.length > 0
      ? `${successful.length} of ${sortedPages.length} page(s) converted successfully.`
      : 'All conversions failed. See errors below.';
    setFeedback({ kind: successful.length > 0 ? 'success' : 'error', text: successText });
  }, [pdfDoc, pageSelection, outputFormat, resolution, customDpi, jpegQuality, background, status]);

  const downloadImage = useCallback(
    (result: ImageResult) => {
      const filename = generateImageFilename(filenamePrefix, result.pageNumber, outputFormat);
      downloadBlob(result.blob, filename);
    },
    [filenamePrefix, outputFormat]
  );

  const downloadAllAsZip = useCallback(async () => {
    if (conversionResults.length === 0) return;
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const result of conversionResults) {
        const filename = generateImageFilename(filenamePrefix, result.pageNumber, outputFormat);
        zip.file(filename, result.blob);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${sanitizeFilename(filenamePrefix)}-pages.zip`);
      setFeedback({ kind: 'success', text: 'ZIP file downloaded successfully.' });
    } catch {
      setError('Failed to create ZIP file. Please try again.');
    }
  }, [conversionResults, filenamePrefix, outputFormat]);

  const isConverting = status === 'converting';
  const canConvert = pdfDoc !== null && pageSelection.length > 0 && !isConverting;
  const selectedCount = pageSelection.length;
  const totalPages = pdfInfo?.pageCount ?? 0;
  const progressPercent =
    conversionProgress.total > 0
      ? Math.round((conversionProgress.completed / conversionProgress.total) * 100)
      : 0;

  const handleDropzoneKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="pdf-to-image">
      {/* Upload */}
      <section className="pdf-to-image__upload">
        <div className="pdf-to-image__upload-heading">
          <div className="pdf-to-image__upload-icon">
            <Upload size={24} />
          </div>
          <div>
            <h2>Upload Your PDF</h2>
            <p>Select a PDF document to convert its pages into images.</p>
          </div>
        </div>

        <div
          className={`pdf-to-image__dropzone${dragging ? ' pdf-to-image__dropzone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleDropzoneKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Upload PDF"
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleInputChange}
            className="pdf-to-image__file-input"
          />
          <div className="pdf-to-image__upload-icon-wrap">
            <Upload size={28} />
          </div>
          {pdfLoading ? (
            <div className="pdf-to-image__upload-content">
              <LoaderCircle size={40} className="pdf-to-image__spinner" />
              <p>Loading PDF…</p>
            </div>
          ) : pdfDoc && pdfInfo ? (
            <div className="pdf-to-image__upload-content">
              <FileText size={40} />
              <strong>{pdfInfo.fileName}</strong>
              <span>{pdfInfo.pageCount} pages · {formatBytes(pdfInfo.fileSize)}</span>
              <span className="pdf-to-image__hint">Click or drop to replace</span>
            </div>
          ) : (
            <div className="pdf-to-image__upload-content">
              <Upload size={40} />
              <strong>Drag and drop your PDF here</strong>
              <span>or click to browse files</span>
              <span className="pdf-to-image__badge">PDF only · Max {formatBytes(PDF_TO_IMAGE.MAX_FILE_SIZE)} · All processing is local</span>
            </div>
          )}
        </div>

        <div className="pdf-to-image__actions-row">
          <button type="button" className="pdf-to-image__button pdf-to-image__button--primary" onClick={() => inputRef.current?.click()} disabled={pdfLoading}>
            <Upload size={16} /> {pdfDoc ? 'Replace PDF' : 'Browse Files'}
          </button>
          {pdfDoc && (
            <button type="button" className="pdf-to-image__button pdf-to-image__button--secondary" onClick={clearPdf}>
              <Trash2 size={16} /> Clear PDF
            </button>
          )}
        </div>
      </section>

      {/* Error / Feedback */}
      {error && (
        <div className="pdf-to-image__message pdf-to-image__message--error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {pdfError && (
        <div className="pdf-to-image__message pdf-to-image__message--error" role="alert">
          <AlertCircle size={16} />
          <span>{pdfError}</span>
          <button type="button" onClick={() => setPdfError(null)} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {feedback && (
        <div className={`pdf-to-image__message pdf-to-image__message--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
          {feedback.kind === 'success' && <CheckCircle2 size={16} />}
          {feedback.kind === 'info' && <Info size={16} />}
          {feedback.kind === 'error' && <AlertCircle size={16} />}
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Workspace */}
      {pdfDoc && pdfInfo && (
        <div className="pdf-to-image__workspace">
          <aside className="pdf-to-image__settings">
            <div className="pdf-to-image__settings-header">
              <h2>Conversion Settings</h2>
            </div>

            <div className="pdf-to-image__field">
              <label id="pdf-output-format-label">Output Format</label>
              <div className="pdf-to-image__format-group" role="radiogroup" aria-labelledby="pdf-output-format-label">
                {(['PNG', 'JPEG'] as ImageOutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    role="radio"
                    aria-checked={outputFormat === fmt}
                    className={`pdf-to-image__pill ${outputFormat === fmt ? 'pdf-to-image__pill--active' : ''}`}
                    onClick={() => { setOutputFormat(fmt); setConversionResults([]); }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <p className="pdf-to-image__hint">
                {outputFormat === 'PNG'
                  ? 'PNG preserves transparency where supported by the rendering pipeline.'
                  : 'JPEG uses a configurable background color because it does not support transparency.'}
              </p>
            </div>

            <div className="pdf-to-image__field">
              <label htmlFor="pdf-resolution">Resolution</label>
              <div className="pdf-to-image__resolution-group">
                {(['LOW', 'MEDIUM', 'HIGH', 'CUSTOM'] as ResolutionPreset[]).map((res) => (
                  <button
                    key={res}
                    type="button"
                    className={`pdf-to-image__pill ${resolution === res ? 'pdf-to-image__pill--active' : ''}`}
                    onClick={() => setResolution(res)}
                  >
                    {res === 'LOW' && '96 DPI'}
                    {res === 'MEDIUM' && '150 DPI'}
                    {res === 'HIGH' && '300 DPI'}
                    {res === 'CUSTOM' && 'Custom'}
                  </button>
                ))}
              </div>
              {resolution === 'CUSTOM' && (
                <div className="pdf-to-image__custom-dpi">
                  <label htmlFor="pdf-custom-dpi">Custom DPI (72 – 600)</label>
                  <input
                    id="pdf-custom-dpi"
                    type="number"
                    min={72}
                    max={600}
                    value={customDpi}
                    onChange={(e) => setCustomDpi(Number(e.target.value))}
                  />
                </div>
              )}
              <p className="pdf-to-image__hint">Higher DPI produces larger pixel dimensions and better quality.</p>
            </div>

            {outputFormat === 'JPEG' && (
              <div className="pdf-to-image__field">
                <label htmlFor="pdf-quality">Quality</label>
                <input
                  id="pdf-quality"
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(jpegQuality * 100)}
                  onChange={(e) => setJpegQuality(Number(e.target.value) / 100)}
                />
                <span className="pdf-to-image__hint">{Math.round(jpegQuality * 100)}%</span>
              </div>
            )}

            {outputFormat === 'JPEG' && (
              <div className="pdf-to-image__field">
                <label>Background</label>
                <div className="pdf-to-image__bg-group">
                  <button type="button" className={`pdf-to-image__pill ${background === 'white' ? 'pdf-to-image__pill--active' : ''}`} onClick={() => { setBackground('white'); setCustomBgColor('#ffffff'); }}>
                    <span className="pdf-to-image__bg-swatch pdf-to-image__bg-swatch--white" /> White
                  </button>
                  <button type="button" className={`pdf-to-image__pill ${background === 'black' ? 'pdf-to-image__pill--active' : ''}`} onClick={() => { setBackground('black'); setCustomBgColor('#000000'); }}>
                    <span className="pdf-to-image__bg-swatch pdf-to-image__bg-swatch--black" /> Black
                  </button>
                  <button type="button" className={`pdf-to-image__pill ${background === 'custom' ? 'pdf-to-image__pill--active' : ''}`} onClick={() => setBackground('custom')}>
                    <span className="pdf-to-image__bg-swatch pdf-to-image__bg-swatch--custom" /> Custom
                  </button>
                </div>
                {background === 'custom' && (
                  <div className="pdf-to-image__custom-dpi">
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      aria-label="Custom background color"
                    />
                    <input
                      type="text"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      placeholder="#ffffff"
                      className="pdf-to-image__bg-color-input"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="pdf-to-image__field">
              <label htmlFor="pdf-filename-prefix">Filename Prefix</label>
              <input
                id="pdf-filename-prefix"
                type="text"
                value={filenamePrefix}
                onChange={(e) => setFilenamePrefix(e.target.value)}
                placeholder={DEFAULT_FILENAME_PREFIX}
              />
              <p className="pdf-to-image__hint">Example: my-document-page-1.png</p>
            </div>

            <button
              type="button"
              className="pdf-to-image__button pdf-to-image__button--primary pdf-to-image__convert-button"
              onClick={() => void convertSelectedPages()}
              disabled={!canConvert}
            >
              {isConverting ? (
                <><LoaderCircle size={18} className="pdf-to-image__spinner" /> Converting…</>
              ) : (
                <><ImageDown size={18} /> Convert Selected Pages</>
              )}
            </button>

            {status === 'converted' && conversionResults.length > 0 && (
              <button type="button" className="pdf-to-image__button pdf-to-image__button--secondary" onClick={() => void downloadAllAsZip()}>
                <Download size={18} /> Download All as ZIP
              </button>
            )}
          </aside>

          <main className="pdf-to-image__content">
            <section className="pdf-to-image__section">
              <div className="pdf-to-image__section-header">
                <h2>Pages ({totalPages})</h2>
                <span className="pdf-to-image__selected-count">{selectedCount} selected</span>
              </div>

              <div className="pdf-to-image__select-controls">
                <button type="button" className="pdf-to-image__select-control" onClick={selectAllPages}>
                  <Check size={16} /> Select All
                </button>
                <button type="button" className="pdf-to-image__select-control" onClick={deselectAllPages}>
                  <Square size={16} /> Deselect All
                </button>
                <div className="pdf-to-image__range-group">
                  <input
                    type="text"
                    className="pdf-to-image__range-input"
                    value={pageRangeInput}
                    onChange={(e) => {
                      setPageRangeInput(e.target.value);
                      setPageRangeError(null);
                    }}
                    placeholder="1-5, 1,3,5"
                    aria-label="Select page range"
                  />
                  <button type="button" className="pdf-to-image__range-apply" onClick={() => selectPageRange(pageRangeInput)}>
                    Apply
                  </button>
                </div>
              </div>

              {pageRangeError && (
                <div className="pdf-to-image__range-error" role="alert">
                  <AlertCircle size={14} /> {pageRangeError}
                </div>
              )}

              <div className="pdf-to-image__page-grid">
                {pagePreviews.length > 0 ? (
                  pagePreviews.map((page) => (
                    <div
                      key={page.pageNumber}
                      className={`pdf-to-image__page-card ${pageSelection.includes(page.pageNumber) ? 'pdf-to-image__page-card--selected' : ''}`}
                      onClick={() => togglePageSelection(page.pageNumber)}
                      role="checkbox"
                      aria-checked={pageSelection.includes(page.pageNumber)}
                      tabIndex={0}
                      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          togglePageSelection(page.pageNumber);
                        }
                      }}
                    >
                      <div className="pdf-to-image__page-card-top">
                        <span className="pdf-to-image__page-number">Page {page.pageNumber}</span>
                        {pageSelection.includes(page.pageNumber) ? (
                          <Check size={14} />
                        ) : (
                          <Square size={14} />
                        )}
                      </div>
                      <div className="pdf-to-image__page-thumb">
                        {page.thumbnailUrl ? (
                          <img src={page.thumbnailUrl} alt={`Page ${page.pageNumber}`} />
                        ) : (
                          <div className="pdf-to-image__page-thumb-placeholder">
                            <FileImage size={32} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pdf-to-image__empty-state">
                    <LayoutGrid size={40} />
                    <p>Generating page previews…</p>
                  </div>
                )}
              </div>
            </section>

            {isConverting && (
              <section className="pdf-to-image__progress" aria-live="polite">
                <div className="pdf-to-image__progress-header">
                  <LoaderCircle size={20} className="pdf-to-image__spinner" />
                  <span>Converting page {conversionProgress.currentPage || '…'} of {conversionProgress.total || '…'}</span>
                </div>
                <div className="pdf-to-image__progress-bar">
                  <div className="pdf-to-image__progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="pdf-to-image__progress-meta">{progressPercent}% complete</div>
              </section>
            )}

            {status === 'converted' && conversionResults.length > 0 && (
              <section className="pdf-to-image__section">
                <div className="pdf-to-image__section-header">
                  <h2>Converted Images ({conversionResults.length})</h2>
                  <span className="pdf-to-image__converted-count">{conversionResults.length} image(s) generated</span>
                </div>

                {conversionProgress.errors.length > 0 && (
                  <div className="pdf-to-image__errors" role="alert">
                    <h3>Conversion Issues</h3>
                    {conversionProgress.errors.map((err, idx) => (
                      <p key={idx}><AlertCircle size={12} /> {err}</p>
                    ))}
                  </div>
                )}

                <div className="pdf-to-image__results-grid">
                  {conversionResults.map((result) => (
                    <div key={result.pageNumber} className="pdf-to-image__result-card">
                      <div className="pdf-to-image__result-image">
                        {result.dataUrl ? (
                          <img src={result.dataUrl} alt={`Page ${result.pageNumber} ${outputFormat}`} />
                        ) : (
                          <div className="pdf-to-image__result-placeholder"><ImageDown size={32} /></div>
                        )}
                      </div>
                      <div className="pdf-to-image__result-info">
                        <h3>Page {result.pageNumber}</h3>
                        <p>{outputFormat} · {result.width}×{result.height}</p>
                        <p>{formatBytes(result.fileSize)}</p>
                        <button type="button" className="pdf-to-image__download-button" onClick={() => downloadImage(result)}>
                          <Download size={16} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      )}

      {!pdfDoc && status !== 'loading' && (
        <section className="pdf-to-image__instructions">
          <h3>How it works</h3>
          <ol>
            <li><span>1</span> Upload a PDF document.</li>
            <li><span>2</span> Select the pages to convert.</li>
            <li><span>3</span> Choose output format and resolution.</li>
            <li><span>4</span> Click “Convert Selected Pages”.</li>
            <li><span>5</span> Download individually or as a ZIP.</li>
          </ol>
        </section>
      )}
    </div>
  );
}
