import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Eraser,
  Image as ImageIcon,
  LoaderCircle,
  RotateCcw,
  Undo2,
  Redo2,
  Upload,
  ZoomIn,
  ZoomOut,
  Minus,
  Square,
  Brush,
  Trash2,
} from 'lucide-react';
import {
  applyBlurMask,
  blurCanvas,
  canvasToBlob,
  createSelectionMask,
  downloadBlob,
  formatFileSize,
  getSupportedExportFormats,
  isSupportedImageFile,
  loadImageFile,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  type BlurEffect,
  type ExportFormat,
  type SelectionOperation,
} from '../../../utils/imageBlur';
import { removeImageBackground } from '../../../utils/imageBackgroundRemover';
import './image-blur.css';

type ApplyMode = 'whole' | 'selected' | 'background';
type PreviewView = 'edited' | 'original' | 'compare';
type SelectionTool = 'brush' | 'eraser' | 'rectangle';

const EFFECT_LABELS: Record<BlurEffect, string> = {
  gaussian: 'Gaussian Blur',
  motion: 'Motion Blur',
  pixelate: 'Pixelate Blur',
  soft: 'Soft Blur',
  strong: 'Strong Blur',
};

export default function ImageBlur() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStrokeRef = useRef<SelectionOperation | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [effect, setEffect] = useState<BlurEffect>('gaussian');
  const [intensity, setIntensity] = useState(12);
  const [motionAngle, setMotionAngle] = useState(0);
  const [applyMode, setApplyMode] = useState<ApplyMode>('whole');
  const [selectionTool, setSelectionTool] = useState<SelectionTool>('brush');
  const [brushSize, setBrushSize] = useState(3);
  const [previewView, setPreviewView] = useState<PreviewView>('edited');
  const [zoom, setZoom] = useState(100);
  const [operations, setOperations] = useState<SelectionOperation[]>([]);
  const [redoOperations, setRedoOperations] = useState<SelectionOperation[]>([]);
  const [backgroundMask, setBackgroundMask] = useState<HTMLCanvasElement | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(92);
  const [processing, setProcessing] = useState(false);
  const [segmenting, setSegmenting] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' | 'info' } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  const renderPreview = useCallback(() => {
    if (!originalCanvasRef.current || !canvasRef.current) return;
    const original = originalCanvasRef.current;
    const canvas = canvasRef.current;
    canvas.width = original.width;
    canvas.height = original.height;
    const context = canvas.getContext('2d');
    if (!context) return;

    if (previewView === 'original') {
      context.drawImage(original, 0, 0);
      return;
    }

    const blurred = blurCanvas(original, original.width, original.height, effect, intensity, motionAngle);
    if (applyMode === 'whole') {
      context.drawImage(blurred, 0, 0);
    } else if (applyMode === 'selected') {
      if (operations.length === 0) {
        context.drawImage(original, 0, 0);
      } else {
        const mask = createSelectionMask(original.width, original.height, operations);
        const result = applyBlurMask(original, blurred, mask);
        context.drawImage(result, 0, 0);
      }
    } else if (applyMode === 'background' && backgroundMask) {
      const result = document.createElement('canvas');
      result.width = original.width;
      result.height = original.height;
      const resultContext = result.getContext('2d');
      if (!resultContext) return;
      resultContext.drawImage(blurred, 0, 0);
      const subject = document.createElement('canvas');
      subject.width = original.width;
      subject.height = original.height;
      const subjectContext = subject.getContext('2d');
      if (!subjectContext) return;
      subjectContext.drawImage(original, 0, 0);
      subjectContext.globalCompositeOperation = 'destination-in';
      subjectContext.drawImage(backgroundMask, 0, 0);
      resultContext.drawImage(subject, 0, 0);
      context.drawImage(result, 0, 0);
    } else {
      context.drawImage(original, 0, 0);
    }
  }, [applyMode, backgroundMask, effect, intensity, motionAngle, operations, previewView]);

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
    setEffect('gaussian');
    setIntensity(12);
    setMotionAngle(0);
    setApplyMode('whole');
    setOperations([]);
    setRedoOperations([]);
    setBackgroundMask(null);
    setPreviewView('edited');
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
      if (loaded.dimensions.width * loaded.dimensions.height > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(loaded.url);
        setMessage({ text: 'This image exceeds the 40 megapixel browser-memory limit.', kind: 'error' });
        return;
      }
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setFile(nextFile);
      setOriginalUrl(loaded.url);
      setDimensions(loaded.dimensions);
      setOperations([]);
      setRedoOperations([]);
      setBackgroundMask(null);
      setOutputSize(null);

      const originalCanvas = document.createElement('canvas');
      originalCanvas.width = loaded.dimensions.width;
      originalCanvas.height = loaded.dimensions.height;
      const context = originalCanvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      context.drawImage(loaded.image, 0, 0);
      originalCanvasRef.current = originalCanvas;
      setPreviewView('edited');
      setMessage({ text: 'Image loaded. Edits remain entirely on this device.', kind: 'success' });
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
    if (currentStrokeRef.current.type === 'brush') {
      currentStrokeRef.current.points.push(point);
    }
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

  const segmentBackground = async () => {
    if (!file) return;
    setSegmenting(true);
    setMessage({ text: 'Loading the local segmentation model. This may take a moment on the first use.', kind: 'info' });
    try {
      const resultBlob = await removeImageBackground(file, () => undefined);
      const resultUrl = URL.createObjectURL(resultBlob);
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('The segmented image could not be decoded.'));
        image.src = resultUrl;
      });
      const mask = document.createElement('canvas');
      mask.width = dimensions.width;
      mask.height = dimensions.height;
      const context = mask.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas is unavailable.');
      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      const pixels = context.getImageData(0, 0, dimensions.width, dimensions.height);
      for (let index = 3; index < pixels.data.length; index += 4) {
        const value = pixels.data[index];
        pixels.data[index - 3] = 255;
        pixels.data[index - 2] = 255;
        pixels.data[index - 1] = 255;
        pixels.data[index] = value;
      }
      context.putImageData(pixels, 0, 0);
      URL.revokeObjectURL(resultUrl);
      setBackgroundMask(mask);
      setMessage({ text: 'Foreground detected locally. Adjust the blur intensity to refine the background.', kind: 'success' });
    } catch (error) {
      setMessage({
        text: error instanceof Error
          ? `Background segmentation failed: ${error.message}`
          : 'Background segmentation is unavailable.',
        kind: 'error',
      });
    } finally {
      setSegmenting(false);
    }
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
      const mimeProbe = exportFormat === 'jpeg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png';
      if (exportFormat !== 'png') {
        const supported = getSupportedExportFormats();
        if (!supported.includes(exportFormat)) {
          throw new Error(`${exportFormat.toUpperCase()} export is not supported by this browser.`);
        }
      }
      const blob = await canvasToBlob(canvas, exportFormat, quality / 100);
      setOutputSize(blob.size);
      const baseName = (file?.name || 'blurred-image').replace(/\.[^.]+$/, '');
      const extension = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
      downloadBlob(blob, `${baseName}-blurred.${extension}`);
      setMessage({ text: `${dimensions.width} × ${dimensions.height}px image exported as ${exportFormat.toUpperCase()} (${formatFileSize(blob.size)}).`, kind: 'success' });
      void mimeProbe;
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'The edited image could not be exported.', kind: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const effectIntensityMax = effect === 'pixelate' ? 40 : effect === 'motion' ? 40 : effect === 'strong' ? 30 : 40;

  return (
    <div className="image-blur">
      {!file ? (
        <section className="image-blur__upload">
          <div
            className={`image-blur__dropzone${dragging ? ' image-blur__dropzone--active' : ''}`}
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
            <div className="image-blur__upload-icon"><Upload size={28} /></div>
            <div>
              <h2>Drop an image here</h2>
              <p>PNG, JPG/JPEG or WebP · Maximum 30 MB · Maximum 40 megapixels</p>
            </div>
            <button type="button" className="image-blur__button image-blur__button--primary" onClick={() => inputRef.current?.click()}>
              Browse files
            </button>
            <input
              ref={inputRef}
              className="image-blur__file-input"
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
          <section className="image-blur__workspace">
            <div className="image-blur__toolbar">
              <div className="image-blur__toolbar-group">
                <button type="button" className="image-blur__icon-button" onClick={() => setZoom((value) => Math.max(50, value - 25))} title="Zoom out"><ZoomOut size={16} /></button>
                <button type="button" className="image-blur__icon-button" onClick={() => setZoom(100)} title="Fit to screen"><Minus size={16} /></button>
                <button type="button" className="image-blur__icon-button" onClick={() => setZoom((value) => Math.min(200, value + 25))} title="Zoom in"><ZoomIn size={16} /></button>
                <span className="image-blur__zoom-label">{zoom}%</span>
              </div>
              <div className="image-blur__toolbar-group">
                {(['original', 'compare', 'edited'] as PreviewView[]).map((view) => (
                  <button
                    type="button"
                    key={view}
                    className={`image-blur__toggle${previewView === view ? ' image-blur__toggle--active' : ''}`}
                    onClick={() => setPreviewView(view)}
                  >
                    {view === 'original' ? 'Original' : view === 'compare' ? 'Compare' : 'Edited'}
                  </button>
                ))}
              </div>
            </div>

            <div className="image-blur__preview-frame">
              <div className="image-blur__canvas-wrap" style={{ width: zoom === 100 ? '100%' : `${zoom}%` }}>
                <canvas
                  ref={canvasRef}
                  className="image-blur__canvas"
                  onPointerDown={beginSelection}
                  onPointerMove={moveSelection}
                  onPointerUp={endSelection}
                  onPointerCancel={endSelection}
                  aria-label="Blur preview"
                />
                {previewView === 'compare' && originalUrl && (
                  <img
                    src={originalUrl}
                    alt=""
                    className="image-blur__compare-original"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </section>

          <div className="image-blur__layout">
            <section className="image-blur__panel">
              <h2>Blur effect</h2>
              <label className="image-blur__label" htmlFor="blur-effect">Effect</label>
              <select id="blur-effect" className="image-blur__select" value={effect} onChange={(event) => setEffect(event.target.value as BlurEffect)}>
                {(Object.keys(EFFECT_LABELS) as BlurEffect[]).map((option) => (
                  <option key={option} value={option}>{EFFECT_LABELS[option]}</option>
                ))}
              </select>

              <label className="image-blur__label" htmlFor="blur-intensity">
                <span>{effect === 'pixelate' ? 'Block size' : 'Blur intensity'}</span>
                <span>{intensity}</span>
              </label>
              <input
                id="blur-intensity"
                className="image-blur__slider"
                type="range"
                min={effect === 'soft' ? 2 : 1}
                max={effectIntensityMax}
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
              />
              {effect === 'motion' && (
                <>
                  <label className="image-blur__label" htmlFor="motion-angle"><span>Motion angle</span><span>{motionAngle}°</span></label>
                  <input id="motion-angle" className="image-blur__slider" type="range" min={0} max={360} value={motionAngle} onChange={(event) => setMotionAngle(Number(event.target.value))} />
                </>
              )}

              <div className="image-blur__label">Apply to</div>
              <div className="image-blur__segmented">
                {(['whole', 'selected', 'background'] as ApplyMode[]).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    className={`image-blur__segment${applyMode === mode ? ' image-blur__segment--active' : ''}`}
                    onClick={() => setApplyMode(mode)}
                  >
                    {mode === 'whole' ? 'Entire image' : mode === 'selected' ? 'Selected area' : 'Background'}
                  </button>
                ))}
              </div>

              {applyMode === 'selected' && (
                <div className="image-blur__selection">
                  <div className="image-blur__selection-tools">
                    <button type="button" className={`image-blur__icon-button${selectionTool === 'brush' ? ' image-blur__icon-button--active' : ''}`} onClick={() => setSelectionTool('brush')} title="Brush"><Brush size={16} /></button>
                    <button type="button" className={`image-blur__icon-button${selectionTool === 'eraser' ? ' image-blur__icon-button--active' : ''}`} onClick={() => setSelectionTool('eraser')} title="Erase"><Eraser size={16} /></button>
                    <button type="button" className={`image-blur__icon-button${selectionTool === 'rectangle' ? ' image-blur__icon-button--active' : ''}`} onClick={() => setSelectionTool('rectangle')} title="Rectangle"><Square size={16} /></button>
                  </div>
                  <label className="image-blur__label" htmlFor="brush-size"><span>Brush size</span><span>{brushSize}%</span></label>
                  <input id="brush-size" className="image-blur__slider" type="range" min={1} max={20} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
                  <div className="image-blur__selection-actions">
                    <button type="button" className="image-blur__button" onClick={undo} disabled={operations.length === 0}><Undo2 size={14} /> Undo</button>
                    <button type="button" className="image-blur__button" onClick={redo} disabled={redoOperations.length === 0}><Redo2 size={14} /> Redo</button>
                    <button type="button" className="image-blur__button" onClick={() => { setOperations([]); setRedoOperations([]); }} disabled={operations.length === 0}><Trash2 size={14} /> Clear</button>
                  </div>
                </div>
              )}

              {applyMode === 'background' && (
                <div className="image-blur__background">
                  <button type="button" className="image-blur__button image-blur__button--primary" onClick={() => void segmentBackground()} disabled={segmenting}>
                    {segmenting ? <LoaderCircle className="image-blur__spin" size={15} /> : <ImageIcon size={15} />}
                    {segmenting ? 'Detecting foreground…' : 'Detect foreground'}
                  </button>
                  <p>Uses a local AI segmentation model when available. No image is sent to a server.</p>
                </div>
              )}

              <div className="image-blur__actions">
                <button
                  type="button"
                  className="image-blur__button image-blur__button--primary"
                  onClick={() => {
                    renderPreview();
                    setMessage({ text: 'Blur effect applied to the preview.', kind: 'success' });
                  }}
                >
                  <ImageIcon size={14} /> Apply blur
                </button>
                <button type="button" className="image-blur__button" onClick={() => setIntensity(effect === 'pixelate' ? 12 : 12)}><RotateCcw size={14} /> Reset blur</button>
                <button type="button" className="image-blur__button" onClick={resetWorkspace}><Trash2 size={14} /> Reset image</button>
              </div>
            </section>

            <section className="image-blur__panel">
              <h2>Export</h2>
              <div className="image-blur__dimensions">
                <span>{dimensions.width} × {dimensions.height} px</span>
                {outputSize !== null && <span>{formatFileSize(outputSize)}</span>}
              </div>
              <label className="image-blur__label" htmlFor="export-format">Format</label>
              <select id="export-format" className="image-blur__select" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                <option value="png">PNG</option>
                {getSupportedExportFormats().includes('jpeg') && <option value="jpeg">JPG/JPEG</option>}
                {getSupportedExportFormats().includes('webp') && <option value="webp">WebP</option>}
              </select>
              {exportFormat !== 'png' && (
                <>
                  <label className="image-blur__label" htmlFor="export-quality"><span>Quality</span><span>{quality}%</span></label>
                  <input id="export-quality" className="image-blur__slider" type="range" min={10} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
                </>
              )}
              <button type="button" className="image-blur__download" onClick={() => void generateOutput()} disabled={processing}>
                {processing ? <LoaderCircle className="image-blur__spin" size={16} /> : <Download size={16} />}
                Download edited image
              </button>
            </section>
          </div>
        </>
      )}

      {message && <div className={`image-blur__status image-blur__status--${message.kind}`}>{message.text}</div>}
    </div>
  );
}
