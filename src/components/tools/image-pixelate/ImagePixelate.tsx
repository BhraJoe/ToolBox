import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Brush,
  Download,
  Eraser,
  Image as ImageIcon,
  LoaderCircle,
  Minus,
  RotateCcw,
  Square,
  Trash2,
  Undo2,
  Redo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  applyPixelateMask,
  canvasToBlob,
  createSelectionMask,
  downloadBlob,
  formatFileSize,
  getSupportedExportFormats,
  isSupportedImageFile,
  loadImageFile,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  pixelateCanvas,
  type ExportFormat,
  type PixelateMode,
  type SelectionOperation,
} from '../../../utils/imagePixelate';
import './image-pixelate.css';

type ApplyMode = 'whole' | 'selected';
type PreviewView = 'processed' | 'original' | 'compare';
type SelectionTool = 'brush' | 'eraser' | 'rectangle';

const MODE_LABELS: Record<PixelateMode, string> = {
  standard: 'Standard Pixelation',
  large: 'Large Pixel Blocks',
  small: 'Small Pixel Blocks',
  mosaic: 'Mosaic Effect',
  custom: 'Custom Pixelation',
};

export default function ImagePixelate() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStrokeRef = useRef<SelectionOperation | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<PixelateMode>('standard');
  const [pixelSize, setPixelSize] = useState(12);
  const [applyMode, setApplyMode] = useState<ApplyMode>('whole');
  const [selectionTool, setSelectionTool] = useState<SelectionTool>('brush');
  const [brushSize, setBrushSize] = useState(4);
  const [previewView, setPreviewView] = useState<PreviewView>('processed');
  const [zoom, setZoom] = useState(100);
  const [operations, setOperations] = useState<SelectionOperation[]>([]);
  const [redoOperations, setRedoOperations] = useState<SelectionOperation[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(92);
  const [processing, setProcessing] = useState(false);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' | 'info' } | null>(null);
  const [dragging, setDragging] = useState(false);

  const renderPreview = useCallback(() => {
    const original = originalCanvasRef.current;
    const canvas = canvasRef.current;
    if (!original || !canvas) return;

    canvas.width = original.width;
    canvas.height = original.height;
    const context = canvas.getContext('2d');
    if (!context) return;

    if (previewView === 'original') {
      context.drawImage(original, 0, 0);
      return;
    }

    const pixelated = pixelateCanvas(original, original.width, original.height, mode, pixelSize);
    if (applyMode === 'whole') {
      context.drawImage(pixelated, 0, 0);
    } else if (operations.length === 0) {
      context.drawImage(original, 0, 0);
    } else {
      const mask = createSelectionMask(original.width, original.height, operations);
      context.drawImage(applyPixelateMask(original, pixelated, mask), 0, 0);
    }
  }, [applyMode, mode, operations, pixelSize, previewView]);

  useEffect(() => {
    const frame = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(frame);
  }, [renderPreview]);

  useEffect(() => () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
  }, [originalUrl]);

  const resetWorkspace = useCallback(() => {
    setFile(null);
    setOriginalUrl(null);
    setDimensions({ width: 0, height: 0 });
    setMode('standard');
    setPixelSize(12);
    setApplyMode('whole');
    setSelectionTool('brush');
    setOperations([]);
    setRedoOperations([]);
    setPreviewView('processed');
    setZoom(100);
    setOutputSize(null);
    setMessage(null);
  }, []);

  const addFile = async (nextFile: File) => {
    setMessage(null);
    if (!isSupportedImageFile(nextFile)) {
      setMessage({ text: 'Choose a PNG, JPG/JPEG or WebP image.', kind: 'error' });
      return;
    }
    if (nextFile.size > MAX_IMAGE_SIZE_BYTES) {
      setMessage({ text: 'This image exceeds the 30 MB upload limit.', kind: 'error' });
      return;
    }
    try {
      setProcessing(true);
      const loaded = await loadImageFile(nextFile);
      if (loaded.width * loaded.height > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(loaded.url);
        setMessage({ text: 'This image exceeds the 40 megapixel browser-memory limit.', kind: 'error' });
        return;
      }
      if (originalUrl) URL.revokeObjectURL(originalUrl);

      const originalCanvas = document.createElement('canvas');
      originalCanvas.width = loaded.width;
      originalCanvas.height = loaded.height;
      const context = originalCanvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      context.drawImage(loaded.image, 0, 0);
      originalCanvasRef.current = originalCanvas;

      setFile(nextFile);
      setOriginalUrl(loaded.url);
      setDimensions({ width: loaded.width, height: loaded.height });
      setOperations([]);
      setRedoOperations([]);
      setPreviewView('processed');
      setOutputSize(null);
      setMessage({ text: 'Image loaded. Processing remains entirely on this device.', kind: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'The image could not be loaded.', kind: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const normalizedPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const beginSelection = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!file || applyMode !== 'selected') return;
    const point = normalizedPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (selectionTool === 'rectangle') {
      dragStartRef.current = point;
      return;
    }
    currentStrokeRef.current = {
      type: 'brush',
      mode: selectionTool === 'eraser' ? 'erase' : 'add',
      points: [point],
      size: brushSize / 100,
    };
  };

  const moveSelection = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (selectionTool === 'rectangle' || !currentStrokeRef.current) return;
    const point = normalizedPoint(event);
    if (!point) return;
    if (currentStrokeRef.current.type === 'brush') currentStrokeRef.current.points.push(point);
  };

  const endSelection = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!file || applyMode !== 'selected') return;
    const point = normalizedPoint(event);
    if (selectionTool === 'rectangle' && dragStartRef.current && point) {
      const start = dragStartRef.current;
      const operation: SelectionOperation = {
        type: 'rectangle',
        mode: 'add',
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(start.x - point.x),
        height: Math.abs(start.y - point.y),
      };
      if (operation.width > 0.002 && operation.height > 0.002) {
        setOperations((current) => [...current, operation]);
        setRedoOperations([]);
      }
      dragStartRef.current = null;
    } else if (currentStrokeRef.current) {
      setOperations((current) => [...current, currentStrokeRef.current as SelectionOperation]);
      setRedoOperations([]);
      currentStrokeRef.current = null;
    }
  };

  const undo = () => {
    setOperations((current) => {
      if (current.length === 0) return current;
      const restored = current[current.length - 1];
      setRedoOperations((redo) => [restored, ...redo]);
      return current.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoOperations((current) => {
      if (current.length === 0) return current;
      const restored = current[0];
      setOperations((operationsNow) => [...operationsNow, restored]);
      return current.slice(1);
    });
  };

  const generateOutput = async () => {
    if (!originalCanvasRef.current) return;
    setProcessing(true);
    setMessage(null);
    setOutputSize(null);
    try {
      renderPreview();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Preview canvas is unavailable.');
      if (exportFormat !== 'png' && !getSupportedExportFormats().includes(exportFormat)) {
        throw new Error(`${exportFormat.toUpperCase()} export is not supported by this browser.`);
      }
      const blob = await canvasToBlob(canvas, exportFormat, quality / 100);
      setOutputSize(blob.size);
      const baseName = (file?.name || 'image-pixelated').replace(/\.[^.]+$/, '') || 'image-pixelated';
      const extension = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
      downloadBlob(blob, `${baseName}-pixelated.${extension}`);
      setMessage({
        text: `${dimensions.width} × ${dimensions.height}px image exported as ${exportFormat.toUpperCase()} (${formatFileSize(blob.size)}).`,
        kind: 'success',
      });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'The pixelated image could not be exported.', kind: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="image-pixelate">
      {!file ? (
        <section className="image-pixelate__upload">
          <div
            className={`image-pixelate__dropzone${dragging ? ' image-pixelate__dropzone--active' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const dropped = event.dataTransfer.files[0];
              if (dropped) void addFile(dropped);
            }}
          >
            <div className="image-pixelate__upload-icon"><Upload size={28} /></div>
            <div>
              <h2>Drop an image here</h2>
              <p>PNG, JPG/JPEG or WebP · Maximum 30 MB · Maximum 40 megapixels</p>
            </div>
            <button type="button" className="image-pixelate__button image-pixelate__button--primary" onClick={() => inputRef.current?.click()}>
              Browse files
            </button>
            <input
              ref={inputRef}
              className="image-pixelate__file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void addFile(selected);
                event.target.value = '';
              }}
            />
          </div>
        </section>
      ) : (
        <>
          <section className="image-pixelate__workspace">
            <div className="image-pixelate__toolbar">
              <div className="image-pixelate__toolbar-group">
                <button type="button" className="image-pixelate__icon-button" onClick={() => setZoom((value) => Math.max(50, value - 25))} title="Zoom out"><ZoomOut size={16} /></button>
                <button type="button" className="image-pixelate__icon-button" onClick={() => setZoom(100)} title="Fit to screen"><Minus size={16} /></button>
                <button type="button" className="image-pixelate__icon-button" onClick={() => setZoom((value) => Math.min(200, value + 25))} title="Zoom in"><ZoomIn size={16} /></button>
                <span className="image-pixelate__zoom-label">{zoom}%</span>
              </div>
              <div className="image-pixelate__toolbar-group">
                {(['original', 'compare', 'processed'] as PreviewView[]).map((view) => (
                  <button
                    type="button"
                    key={view}
                    className={`image-pixelate__toggle${previewView === view ? ' image-pixelate__toggle--active' : ''}`}
                    onClick={() => setPreviewView(view)}
                  >
                    {view === 'original' ? 'Original' : view === 'compare' ? 'Compare' : 'Pixelated'}
                  </button>
                ))}
              </div>
            </div>

            <div className="image-pixelate__preview-frame">
              <div className="image-pixelate__canvas-wrap" style={{ width: zoom === 100 ? '100%' : `${zoom}%` }}>
                <canvas
                  ref={canvasRef}
                  className="image-pixelate__canvas"
                  onPointerDown={beginSelection}
                  onPointerMove={moveSelection}
                  onPointerUp={endSelection}
                  onPointerCancel={endSelection}
                  aria-label="Pixelated image preview"
                />
                {previewView === 'compare' && originalUrl && (
                  <img src={originalUrl} alt="" className="image-pixelate__compare-original" aria-hidden="true" />
                )}
              </div>
            </div>
          </section>

          <div className="image-pixelate__layout">
            <section className="image-pixelate__panel">
              <h2>Pixelation controls</h2>
              <label className="image-pixelate__label" htmlFor="pixelate-mode">Pixelation mode</label>
              <select id="pixelate-mode" className="image-pixelate__select" value={mode} onChange={(event) => setMode(event.target.value as PixelateMode)}>
                {(Object.keys(MODE_LABELS) as PixelateMode[]).map((option) => (
                  <option key={option} value={option}>{MODE_LABELS[option]}</option>
                ))}
              </select>

              <label className="image-pixelate__label" htmlFor="pixel-size">
                <span>Pixel block size</span><span>{pixelSize}px</span>
              </label>
              <input
                id="pixel-size"
                className="image-pixelate__slider"
                type="range"
                min={2}
                max={64}
                value={pixelSize}
                onChange={(event) => setPixelSize(Number(event.target.value))}
              />

              <div className="image-pixelate__label">Apply to</div>
              <div className="image-pixelate__segmented">
                {(['whole', 'selected'] as ApplyMode[]).map((apply) => (
                  <button
                    type="button"
                    key={apply}
                    className={`image-pixelate__segment${applyMode === apply ? ' image-pixelate__segment--active' : ''}`}
                    onClick={() => setApplyMode(apply)}
                  >
                    {apply === 'whole' ? 'Entire image' : 'Selected areas'}
                  </button>
                ))}
              </div>

              {applyMode === 'selected' && (
                <div className="image-pixelate__selection">
                  <div className="image-pixelate__selection-tools">
                    <button type="button" className={`image-pixelate__icon-button${selectionTool === 'brush' ? ' image-pixelate__icon-button--active' : ''}`} onClick={() => setSelectionTool('brush')} title="Brush"><Brush size={16} /></button>
                    <button type="button" className={`image-pixelate__icon-button${selectionTool === 'eraser' ? ' image-pixelate__icon-button--active' : ''}`} onClick={() => setSelectionTool('eraser')} title="Erase"><Eraser size={16} /></button>
                    <button type="button" className={`image-pixelate__icon-button${selectionTool === 'rectangle' ? ' image-pixelate__icon-button--active' : ''}`} onClick={() => setSelectionTool('rectangle')} title="Rectangle"><Square size={16} /></button>
                  </div>
                  <label className="image-pixelate__label" htmlFor="brush-size"><span>Brush size</span><span>{brushSize}%</span></label>
                  <input id="brush-size" className="image-pixelate__slider" type="range" min={1} max={20} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
                  <div className="image-pixelate__selection-actions">
                    <button type="button" className="image-pixelate__button" onClick={undo} disabled={operations.length === 0}><Undo2 size={14} /> Undo</button>
                    <button type="button" className="image-pixelate__button" onClick={redo} disabled={redoOperations.length === 0}><Redo2 size={14} /> Redo</button>
                    <button type="button" className="image-pixelate__button" onClick={() => { setOperations([]); setRedoOperations([]); }} disabled={operations.length === 0}><Trash2 size={14} /> Clear</button>
                  </div>
                </div>
              )}

              <div className="image-pixelate__actions">
                <button type="button" className="image-pixelate__button image-pixelate__button--primary" onClick={() => { renderPreview(); setMessage({ text: 'Pixelation applied to the preview.', kind: 'success' }); }}>
                  <ImageIcon size={14} /> Apply pixelation
                </button>
                <button type="button" className="image-pixelate__button" onClick={() => { setMode('standard'); setPixelSize(12); setApplyMode('whole'); setOperations([]); setRedoOperations([]); }}>
                  <RotateCcw size={14} /> Reset effects
                </button>
                <button type="button" className="image-pixelate__button" onClick={resetWorkspace}><Trash2 size={14} /> Reset image</button>
              </div>
            </section>

            <section className="image-pixelate__panel">
              <h2>Export</h2>
              <div className="image-pixelate__dimensions">
                <span>Output</span>
                <strong>{dimensions.width} × {dimensions.height}px</strong>
              </div>
              {outputSize !== null && (
                <div className="image-pixelate__dimensions">
                  <span>Estimated file size</span>
                  <strong>{formatFileSize(outputSize)}</strong>
                </div>
              )}
              <label className="image-pixelate__label" htmlFor="pixelate-format">Format</label>
              <select id="pixelate-format" className="image-pixelate__select" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                <option value="png">PNG</option>
                {getSupportedExportFormats().includes('jpeg') && <option value="jpeg">JPG/JPEG</option>}
                {getSupportedExportFormats().includes('webp') && <option value="webp">WebP</option>}
              </select>
              {exportFormat !== 'png' && (
                <>
                  <label className="image-pixelate__label" htmlFor="pixelate-quality"><span>Quality</span><span>{quality}%</span></label>
                  <input id="pixelate-quality" className="image-pixelate__slider" type="range" min={20} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
                </>
              )}
              <button type="button" className="image-pixelate__download" onClick={() => void generateOutput()} disabled={processing}>
                {processing ? <LoaderCircle className="image-pixelate__spin" size={16} /> : <Download size={16} />}
                {processing ? 'Preparing…' : 'Download image'}
              </button>
              <div className="image-pixelate__privacy">
                Pixelation can hide visible detail, but may not conceal sensitive information irreversibly. For passwords or highly confidential data, use an opaque cover.
              </div>
              {message && (
                <div className={`image-pixelate__status image-pixelate__status--${message.kind}`} role="status">
                  {message.text}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
