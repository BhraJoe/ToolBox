import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ArrowDownToLine,
  Eraser,
  Image as ImageIcon,
  LoaderCircle,
  Redo2,
  RotateCcw,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import {
  canvasToBlob,
  formatFileSize,
  getSupportedExportFormats,
  isSupportedImageFile,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  readImageDimensions,
  removeImageBackground,
  type BackgroundMode,
  type ExportFormat,
  type ImageDimensions,
} from '../../../utils/imageBackgroundRemover';
import './image-background-remover.css';

interface BrushPoint {
  x: number;
  y: number;
}

interface BrushAction {
  type: 'erase' | 'restore';
  points: BrushPoint[];
  size: number;
}

async function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The processed image could not be decoded.'));
      image.src = url;
    });
    return image;
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url);
  }
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

export default function ImageBackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing model');
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [brush, setBrush] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState(40);
  const [actions, setActions] = useState<BrushAction[]>([]);
  const [redoActions, setRedoActions] = useState<BrushAction[]>([]);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('transparent');
  const [customColor, setCustomColor] = useState('#7dd3fc');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(92);
  const [exporting, setExporting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentActionRef = useRef<BrushAction | null>(null);
  const isDrawingRef = useRef(false);
  const urlsRef = useRef(new Set<string>());

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const createUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  };

  const resetAll = () => {
    if (processing) return;
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl);
      urlsRef.current.delete(originalUrl);
    }
    if (backgroundImageUrl) {
      URL.revokeObjectURL(backgroundImageUrl);
      urlsRef.current.delete(backgroundImageUrl);
    }
    setFile(null);
    setOriginalUrl(null);
    setDimensions(null);
    setProcessedBlob(null);
    setActions([]);
    setRedoActions([]);
    setBackgroundMode('transparent');
    setBackgroundImageUrl(null);
    setBackgroundImage(null);
    setMessage(null);
    setProgress(0);
  };

  const replayActions = useCallback(() => {
    const preview = previewCanvasRef.current;
    const base = baseCanvasRef.current;
    const original = originalCanvasRef.current;
    if (!preview || !base || !original) return;
    const context = preview.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, preview.width, preview.height);
    context.drawImage(base, 0, 0);

    for (const action of actions) {
      if (action.type === 'erase') {
        context.save();
        context.globalCompositeOperation = 'destination-out';
        drawSmoothStroke(context, action.points, action.size);
        context.restore();
      } else {
        context.save();
        context.beginPath();
        drawSmoothStroke(context, action.points, action.size, true);
        context.clip();
        context.drawImage(original, 0, 0);
        context.restore();
      }
    }
  }, [actions]);

  useEffect(() => {
    replayActions();
  }, [replayActions]);

  const addFile = async (selected: File) => {
    setMessage(null);
    if (!isSupportedImageFile(selected)) {
      setMessage({ text: 'Unsupported format. Choose a JPEG, PNG or WebP image.', kind: 'error' });
      return;
    }
    if (selected.size > MAX_IMAGE_SIZE_BYTES) {
      setMessage({ text: 'The selected file is larger than the 30 MB limit.', kind: 'error' });
      return;
    }
    try {
      const size = await readImageDimensions(selected);
      if (size.width * size.height > MAX_IMAGE_PIXELS) {
        setMessage({ text: 'This image exceeds 40 million pixels. Use a smaller copy to avoid browser memory limits.', kind: 'error' });
        return;
      }
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      const url = createUrl(selected);
      setFile(selected);
      setOriginalUrl(url);
      setDimensions(size);
      setProcessedBlob(null);
      setActions([]);
      setRedoActions([]);
      setProcessing(true);
      setProgress(0);
      setProgressLabel('Downloading model assets, if needed');

      const result = await removeImageBackground(selected, (key, current, total) => {
        const next = total > 0 ? Math.round(current / total * 100) : 0;
        setProgress(Math.min(100, next));
        setProgressLabel(key === 'model' ? 'Loading segmentation model' : `Loading ${key}`);
      });
      setProcessedBlob(result);

      const processedImage = await loadImage(result);
      const originalImage = await loadImage(url);
      const base = document.createElement('canvas');
      const originalCanvas = document.createElement('canvas');
      base.width = originalCanvas.width = size.width;
      base.height = originalCanvas.height = size.height;
      base.getContext('2d')?.drawImage(processedImage, 0, 0, size.width, size.height);
      originalCanvas.getContext('2d')?.drawImage(originalImage, 0, 0, size.width, size.height);
      baseCanvasRef.current = base;
      originalCanvasRef.current = originalCanvas;

      const preview = previewCanvasRef.current;
      if (preview) {
        preview.width = size.width;
        preview.height = size.height;
        preview.getContext('2d')?.drawImage(base, 0, 0);
      }
      setProgress(100);
      setMessage({ text: 'Background removed successfully.', kind: 'success' });
    } catch (error) {
      setProcessedBlob(null);
      setMessage({ text: error instanceof Error ? error.message : 'Background removal failed.', kind: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const selected = event.dataTransfer.files?.[0];
    if (selected) void addFile(selected);
  };

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>): BrushPoint => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  };

  const beginBrush = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!processedBlob) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    const action: BrushAction = { type: brush, points: [canvasPoint(event)], size: brushSize };
    currentActionRef.current = action;
  };

  const moveBrush = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentActionRef.current) return;
    currentActionRef.current.points.push(canvasPoint(event));
    const context = previewCanvasRef.current?.getContext('2d');
    if (!context) return;
    context.save();
    if (currentActionRef.current.type === 'erase') {
      context.globalCompositeOperation = 'destination-out';
      drawSmoothStroke(context, currentActionRef.current.points, currentActionRef.current.size);
    } else {
      context.beginPath();
      drawSmoothStroke(context, currentActionRef.current.points, currentActionRef.current.size, true);
      context.clip();
      context.drawImage(originalCanvasRef.current!, 0, 0);
    }
    context.restore();
  };

  const endBrush = () => {
    if (!isDrawingRef.current || !currentActionRef.current) return;
    isDrawingRef.current = false;
    setActions((current) => [...current, currentActionRef.current as BrushAction]);
    setRedoActions([]);
    currentActionRef.current = null;
  };

  const undo = () => {
    setActions((current) => {
      if (current.length === 0) return current;
      const undone = current[current.length - 1];
      setRedoActions((redo) => [undone, ...redo]);
      return current.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoActions((current) => {
      if (current.length === 0) return current;
      const redone = current[0];
      setActions((actionsCurrent) => [...actionsCurrent, redone]);
      return current.slice(1);
    });
  };

  const resetRefinements = () => {
    setActions([]);
    setRedoActions([]);
  };

  const loadBackgroundImage = (selected: File) => {
    if (!isSupportedImageFile(selected)) {
      setMessage({ text: 'Choose a JPEG, PNG or WebP background image.', kind: 'error' });
      return;
    }
    if (backgroundImageUrl) URL.revokeObjectURL(backgroundImageUrl);
    const url = createUrl(selected);
    const image = new Image();
    image.onload = () => {
      setBackgroundImageUrl(url);
      setBackgroundImage(image);
      setBackgroundMode('transparent');
      setMessage({ text: 'Background image added.', kind: 'success' });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setMessage({ text: 'The background image could not be decoded.', kind: 'error' });
    };
    image.src = url;
  };

  const getPreviewStyle = (): CSSProperties => {
    if (backgroundImageUrl) {
      return { backgroundImage: `url("${backgroundImageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (backgroundMode === 'white') return { backgroundColor: '#ffffff' };
    if (backgroundMode === 'black') return { backgroundColor: '#000000' };
    if (backgroundMode === 'custom') return { backgroundColor: customColor };
    return {};
  };

  const exportImage = async () => {
    if (!processedBlob || !previewCanvasRef.current || !dimensions) return;
    setExporting(true);
    setMessage(null);
    try {
      const supported = getSupportedExportFormats();
      if (!supported.includes(format)) {
        throw new Error(`${format.toUpperCase()} export is not supported by this browser.`);
      }
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas export is unavailable.');

      if (format === 'jpeg' || backgroundMode !== 'transparent' || backgroundImage) {
        if (backgroundImage) {
          context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        } else if (backgroundMode === 'white') {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (backgroundMode === 'black') {
          context.fillStyle = '#000000';
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (backgroundMode === 'custom') {
          context.fillStyle = customColor;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      context.drawImage(previewCanvasRef.current, 0, 0);
      const blob = await canvasToBlob(canvas, format, quality / 100);
      const baseName = (file?.name ?? 'image').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'image';
      downloadBlob(blob, `${baseName}-background-removed.${format === 'jpeg' ? 'jpg' : format}`);
      setMessage({ text: `Downloaded ${format.toUpperCase()} (${canvas.width} × ${canvas.height}px, ${formatFileSize(blob.size)}).`, kind: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Export failed.', kind: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="image-background-remover">
      <div className="image-background-remover__toolbar">
        <span className="image-background-remover__local">Processing stays on your device</span>
        <button className="image-background-remover__button image-background-remover__button--secondary" type="button" onClick={resetAll} disabled={processing}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {!file && (
        <section className="image-background-remover__panel">
          <div
            className={`image-background-remover__dropzone${dragging ? ' image-background-remover__dropzone--active' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="image-background-remover__upload-icon"><Upload size={24} /></div>
            <div>
              <strong>Drop an image here</strong>
              <span>PNG, JPG or WebP • Maximum 30 MB • 40 megapixels</span>
            </div>
            <button className="image-background-remover__button image-background-remover__button--primary" type="button" onClick={() => inputRef.current?.click()}>
              <ImageIcon size={16} /> Browse files
            </button>
            <input ref={inputRef} className="image-background-remover__file-input" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void addFile(selected); event.target.value = ''; }} />
          </div>
        </section>
      )}

      {message && (
        <div className={`image-background-remover__message image-background-remover__message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          <span>{message.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      {processing && (
        <section className="image-background-remover__panel image-background-remover__progress">
          <LoaderCircle className="image-background-remover__spin" size={22} />
          <div>
            <strong>{progressLabel}</strong>
            <div className="image-background-remover__progress-track"><span style={{ width: `${progress}%` }} /></div>
            <small>{progress}%</small>
          </div>
        </section>
      )}

      {file && originalUrl && (
        <div className="image-background-remover__workspace">
          <section className="image-background-remover__panel">
            <div className="image-background-remover__section-heading">
              <div><span>Comparison</span><h2>Before & after</h2></div>
              {dimensions && <small>{dimensions.width} × {dimensions.height}px</small>}
            </div>
            <div className="image-background-remover__comparison">
              <div className="image-background-remover__comparison-pane">
                <span className="image-background-remover__label">Original</span>
                <img src={originalUrl} alt="Original upload" />
              </div>
              <div className="image-background-remover__comparison-pane">
                <span className="image-background-remover__label">Background removed</span>
                <div className="image-background-remover__canvas-stage" style={getPreviewStyle()}>
                  {processedBlob ? (
                    <canvas
                      ref={previewCanvasRef}
                      onPointerDown={beginBrush}
                      onPointerMove={moveBrush}
                      onPointerUp={endBrush}
                      onPointerCancel={endBrush}
                      aria-label="Refinable background-removed preview"
                    />
                  ) : (
                    <div className="image-background-remover__empty-preview"><LoaderCircle className="image-background-remover__spin" size={24} /><span>Processing…</span></div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {processedBlob && (
            <aside className="image-background-remover__controls">
              <section className="image-background-remover__panel">
                <div className="image-background-remover__section-heading"><div><span>Refine</span><h2>Manual brushes</h2></div></div>
                <div className="image-background-remover__brushes" role="group" aria-label="Brush type">
                  <button type="button" className={brush === 'erase' ? 'active' : ''} onClick={() => setBrush('erase')}><Eraser size={15} /> Erase</button>
                  <button type="button" className={brush === 'restore' ? 'active' : ''} onClick={() => setBrush('restore')}>Restore</button>
                </div>
                <label className="image-background-remover__range">Brush size <strong>{brushSize}px</strong>
                  <input type="range" min="8" max="160" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
                </label>
                <div className="image-background-remover__brush-actions">
                  <button type="button" onClick={undo} disabled={actions.length === 0} aria-label="Undo"><Undo2 size={16} /></button>
                  <button type="button" onClick={redo} disabled={redoActions.length === 0} aria-label="Redo"><Redo2 size={16} /></button>
                  <button type="button" onClick={resetRefinements} disabled={actions.length === 0}><RotateCcw size={15} /> Reset brushes</button>
                </div>
              </section>

              <section className="image-background-remover__panel">
                <div className="image-background-remover__section-heading"><div><span>Display</span><h2>Background</h2></div></div>
                <div className="image-background-remover__background-options">
                  {(['transparent', 'white', 'black', 'custom'] as BackgroundMode[]).map((mode) => (
                    <button type="button" key={mode} className={`${backgroundMode === mode && !backgroundImageUrl ? 'active' : ''} ${mode}`} onClick={() => { setBackgroundMode(mode); setBackgroundImageUrl(null); setBackgroundImage(null); }}>
                      {mode === 'transparent' ? 'Transparent' : mode[0].toUpperCase() + mode.slice(1)}
                      {mode === 'custom' && <input aria-label="Custom background color" type="color" value={customColor} onChange={(event) => setCustomColor(event.target.value)} />}
                    </button>
                  ))}
                </div>
                <button className="image-background-remover__background-upload" type="button" onClick={() => backgroundInputRef.current?.click()}><Upload size={15} /> Add background image</button>
                <input ref={backgroundInputRef} className="image-background-remover__file-input" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) loadBackgroundImage(selected); event.target.value = ''; }} />
              </section>

              <section className="image-background-remover__panel">
                <div className="image-background-remover__section-heading"><div><span>Export</span><h2>Download</h2></div></div>
                <label className="image-background-remover__select">Format
                  <select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
                    <option value="png">Transparent PNG</option>
                    {getSupportedExportFormats().includes('jpeg') && <option value="jpeg">JPG</option>}
                    {getSupportedExportFormats().includes('webp') && <option value="webp">WebP</option>}
                  </select>
                </label>
                {format !== 'png' && (
                  <label className="image-background-remover__range">Quality <strong>{quality}%</strong><input type="range" min="40" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>
                )}
                <button className="image-background-remover__button image-background-remover__button--primary" type="button" onClick={() => void exportImage()} disabled={exporting}>
                  {exporting ? <LoaderCircle className="image-background-remover__spin" size={16} /> : <ArrowDownToLine size={16} />}
                  {exporting ? 'Preparing download…' : `Download ${format === 'jpeg' ? 'JPG' : format.toUpperCase()}`}
                </button>
                {processedBlob && dimensions && <small className="image-background-remover__output-info">{dimensions.width} × {dimensions.height}px • processed result {formatFileSize(processedBlob.size)}</small>}
              </section>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function drawSmoothStroke(context: CanvasRenderingContext2D, points: BrushPoint[], size: number, outlineOnly = false): void {
  if (points.length === 0) return;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = size;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    context.lineTo(points[0].x + 0.01, points[0].y + 0.01);
  } else {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      context.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
    }
    context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }
  if (!outlineOnly) context.stroke();
}
