import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Download,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  ZoomIn,
  X,
} from 'lucide-react';
import { extractImageMetadata, formatFileSize, type ImageMetadata } from '../../../utils/imageMetadata';
import {
  extractDominantColors,
  formatHsl,
  formatHsv,
  formatRgb,
  formatRgba,
  isSupportedImageFile,
  loadImageFile,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  rgbToHex,
  type RgbaColor,
} from '../../../utils/imageColorPicker';
import './image-color-picker.css';

interface PixelSelection {
  color: RgbaColor;
  x: number;
  y: number;
}

interface Feedback {
  kind: 'success' | 'error' | 'info';
  text: string;
}

const ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

export default function ImageColorPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [selected, setSelected] = useState<PixelSelection | null>(null);
  const [palette, setPalette] = useState<RgbaColor[]>([]);
  const [history, setHistory] = useState<PixelSelection[]>([]);
  const [zoom, setZoom] = useState(100);
  const [magnifier, setMagnifier] = useState(false);
  const [paletteCount, setPaletteCount] = useState<5 | 10>(5);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    if (!selected || !magnifier) return;
    const canvas = magnifierRef.current;
    const original = originalCanvasRef.current;
    if (!canvas || !original) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const size = 11;
    canvas.width = 220;
    canvas.height = 220;
    context.imageSmoothingEnabled = false;
    const sourceX = Math.max(0, selected.x - Math.floor(size / 2));
    const sourceY = Math.max(0, selected.y - Math.floor(size / 2));
    context.drawImage(
      original,
      sourceX,
      sourceY,
      size,
      size,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }, [selected, magnifier]);

  const resetWorkspace = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setMetadata(null);
    setSelected(null);
    setPalette([]);
    setHistory([]);
    setZoom(100);
    setMagnifier(false);
    setPaletteCount(5);
    setFeedback(null);
  };

  const addFile = async (nextFile: File) => {
    setFeedback(null);
    if (!isSupportedImageFile(nextFile)) {
      setFeedback({ kind: 'error', text: 'Choose a PNG, JPG/JPEG or WebP image.' });
      return;
    }
    if (nextFile.size > MAX_IMAGE_SIZE_BYTES) {
      setFeedback({ kind: 'error', text: 'This image exceeds the 30 MB upload limit.' });
      return;
    }

    setProcessing(true);
    let loadedUrl: string | null = null;
    try {
      const loaded = await loadImageFile(nextFile);
      loadedUrl = loaded.url;
      if (loaded.image.naturalWidth * loaded.image.naturalHeight > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(loaded.url);
        setFeedback({ kind: 'error', text: 'This image exceeds the 40 megapixel browser-memory limit.' });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = loaded.image.naturalWidth;
      canvas.height = loaded.image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas is unavailable in this browser.');
      context.drawImage(loaded.image, 0, 0);
      originalCanvasRef.current = canvas;

      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const nextMetadata = await extractImageMetadata(nextFile);
      setFile(nextFile);
      setImageUrl(loaded.url);
      setMetadata({
        ...nextMetadata,
        width: loaded.image.naturalWidth,
        height: loaded.image.naturalHeight,
        aspectRatio: loaded.image.naturalWidth / loaded.image.naturalHeight,
      });
      setSelected(null);
      setHistory([]);
      setZoom(100);
      setPalette(extractDominantColors(canvas, 10));
      setFeedback({ kind: 'success', text: 'Image loaded. All processing happens locally.' });
      loadedUrl = null;
    } catch (error) {
      if (loadedUrl) URL.revokeObjectURL(loadedUrl);
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'The image could not be loaded.' });
    } finally {
      setProcessing(false);
    }
  };

  const sampleImage = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - rect.left) / rect.width;
    const normalizedY = (event.clientY - rect.top) / rect.height;
    if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) return;
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(normalizedX * canvas.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(normalizedY * canvas.height)));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const pixel = context.getImageData(x, y, 1, 1).data;
    const color: RgbaColor = { red: pixel[0], green: pixel[1], blue: pixel[2], alpha: pixel[3] };
    const next = { color, x, y };
    setSelected(next);
    setHistory((current) => {
      const filtered = current.filter((item) =>
        item.color.red !== color.red
        || item.color.green !== color.green
        || item.color.blue !== color.blue
        || item.color.alpha !== color.alpha,
      );
      return [next, ...filtered].slice(0, 24);
    });
  };

  const moveSelectionWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    const step = event.shiftKey ? 10 : 1;
    let x = selected?.x ?? 0;
    let y = selected?.y ?? 0;
    if (event.key === 'ArrowLeft') x -= step;
    else if (event.key === 'ArrowRight') x += step;
    else if (event.key === 'ArrowUp') y -= step;
    else if (event.key === 'ArrowDown') y += step;
    else return;
    event.preventDefault();
    x = Math.max(0, Math.min(canvas.width - 1, x));
    y = Math.max(0, Math.min(canvas.height - 1, y));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const pixel = context.getImageData(x, y, 1, 1).data;
    const color: RgbaColor = { red: pixel[0], green: pixel[1], blue: pixel[2], alpha: pixel[3] };
    setSelected({ color, x, y });
  };

  const copyText = async (text: string, label: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(text);
      setFeedback({ kind: 'success', text: `${label} copied to clipboard.` });
    } catch {
      setFeedback({ kind: 'error', text: 'Clipboard permission was denied. Select the value manually or allow clipboard access.' });
    }
  };

  const downloadText = (text: string, filename: string, mime: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback({ kind: 'success', text: `${filename} downloaded.` });
  };

  const selectColor = (color: RgbaColor) => {
    setSelected((current) => ({ color, x: current?.x ?? 0, y: current?.y ?? 0 }));
  };

  const displayedPalette = palette.slice(0, paletteCount);
  const selectedHex = selected ? rgbToHex(selected.color) : null;
  const selectedRgb = selected ? formatRgb(selected.color) : null;
  const selectedRgba = selected ? formatRgba(selected.color) : null;
  const selectedHsl = selected ? formatHsl(selected.color) : null;
  const selectedHsv = selected ? formatHsv(selected.color) : null;

  return (
    <div className="image-color-picker">
      <section className="image-color-picker__upload">
        <div
          className={`image-color-picker__dropzone${dragging ? ' image-color-picker__dropzone--active' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const nextFile = event.dataTransfer.files[0];
            if (nextFile) void addFile(nextFile);
          }}
        >
          <Upload className="image-color-picker__upload-icon" size={28} />
          <div>
            <h2>{file ? 'Replace image' : 'Drop an image here'}</h2>
            <p>PNG, JPG/JPEG or WebP · Maximum 30 MB · Maximum 40 MP</p>
          </div>
          <button type="button" className="image-color-picker__button image-color-picker__button--primary" onClick={() => inputRef.current?.click()} disabled={processing}>
            {processing ? <LoaderCircle className="image-color-picker__spin" size={16} /> : <Upload size={16} />}
            {processing ? 'Loading...' : 'Browse files'}
          </button>
          <input ref={inputRef} className="image-color-picker__file-input" type="file" accept={ACCEPT} onChange={(event) => {
            const nextFile = event.target.files?.[0];
            if (nextFile) void addFile(nextFile);
            event.target.value = '';
          }} />
        </div>
      </section>

      {feedback && (
        <div className={`image-color-picker__status image-color-picker__status--${feedback.kind}`} role="status">
          {feedback.text}
        </div>
      )}

      {file && imageUrl && metadata && (
        <>
          <section className="image-color-picker__workspace">
            <div className="image-color-picker__toolbar">
              <div className="image-color-picker__toolbar-group">
                <button type="button" className="image-color-picker__icon-button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(25, value - 25))}><Minus size={16} /></button>
                <span className="image-color-picker__zoom-label">{zoom}%</span>
                <button type="button" className="image-color-picker__icon-button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(400, value + 25))}><Plus size={16} /></button>
                <button type="button" className="image-color-picker__button" onClick={() => setZoom(100)}><ZoomIn size={15} /> Fit to screen</button>
                <button type="button" className="image-color-picker__button" onClick={() => setZoom(100)}><RotateCcw size={15} /> Reset zoom</button>
              </div>
              <label className="image-color-picker__toggle">
                <input type="checkbox" checked={magnifier} onChange={(event) => setMagnifier(event.target.checked)} />
                Magnifier
              </label>
            </div>

            <div className="image-color-picker__preview-frame">
              <div
                ref={previewRef}
                className="image-color-picker__preview-wrap"
                style={{ width: `${zoom}%` }}
                role="button"
                tabIndex={0}
                aria-label="Image pixel picker. Click to select a color or use arrow keys."
                onPointerDown={sampleImage}
                onKeyDown={moveSelectionWithKeyboard}
              >
                <img src={imageUrl} alt={file.name} draggable={false} />
                {selected && (
                  <span
                    className="image-color-picker__marker"
                    style={{
                      left: `${(selected.x / (metadata.width || 1)) * 100}%`,
                      top: `${(selected.y / (metadata.height || 1)) * 100}%`,
                      background: selected.color.alpha === 0 ? 'transparent' : `rgba(${selected.color.red}, ${selected.color.green}, ${selected.color.blue}, ${selected.color.alpha / 255})`,
                    }}
                  />
                )}
              </div>
            </div>
          </section>

          <div className="image-color-picker__layout">
            <div className="image-color-picker__main">
              <section className="image-color-picker__panel">
                <h2>Selected color</h2>
                {selected ? (
                  <>
                    <div className="image-color-picker__selected-head">
                      <div className="image-color-picker__large-swatch" style={{ background: `rgba(${selected.color.red}, ${selected.color.green}, ${selected.color.blue}, ${selected.color.alpha / 255})` }} />
                      <div>
                        <strong>{selectedHex}</strong>
                        <span>Pixel ({selected.x}, {selected.y})</span>
                        {selected.color.alpha === 0 && <small>Fully transparent pixel</small>}
                        {selected.color.alpha > 0 && selected.color.alpha < 255 && <small>Partially transparent · Alpha {selected.color.alpha}/255</small>}
                        {selected.color.alpha === 255 && <small>Fully opaque · Alpha 255/255</small>}
                      </div>
                    </div>
                    {magnifier && (
                      <div className="image-color-picker__magnifier">
                        <canvas ref={magnifierRef} aria-label="Pixel magnifier" />
                        <span>11 × 11 pixel magnifier</span>
                      </div>
                    )}
                    {[
                      { label: 'HEX', value: selectedHex },
                      { label: 'RGB', value: selectedRgb },
                      { label: 'RGBA', value: selectedRgba },
                      { label: 'HSL', value: selectedHsl },
                      { label: 'HSV', value: selectedHsv },
                    ].map((format) => (
                      <div className="image-color-picker__value-row" key={format.label}>
                        <span>{format.label}</span>
                        <code>{format.value}</code>
                        <button type="button" className="image-color-picker__copy" aria-label={`Copy ${format.label}`} onClick={() => void copyText(format.value ?? '', format.label)}><Copy size={14} /></button>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="image-color-picker__empty">Click or tap the image to sample a pixel.</p>
                )}
              </section>

              <section className="image-color-picker__panel">
                <div className="image-color-picker__section-head">
                  <h2>Dominant palette</h2>
                  <div className="image-color-picker__segmented">
                    <button type="button" className={paletteCount === 5 ? 'active' : ''} onClick={() => setPaletteCount(5)}>Top 5</button>
                    <button type="button" className={paletteCount === 10 ? 'active' : ''} onClick={() => setPaletteCount(10)}>Top 10</button>
                  </div>
                </div>
                <div className="image-color-picker__palette">
                  {displayedPalette.map((color) => {
                    const hex = rgbToHex(color);
                    return (
                      <div className="image-color-picker__swatch-card" key={hex}>
                        <span className="image-color-picker__palette-swatch" style={{ backgroundColor: hex }} />
                        <button type="button" className="image-color-picker__palette-value" onClick={() => selectColor(color)}>{hex}</button>
                        <button type="button" className="image-color-picker__copy" aria-label={`Copy ${hex}`} onClick={() => void copyText(hex, 'HEX')}><Copy size={13} /></button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="image-color-picker__side">
              <section className="image-color-picker__panel">
                <h2>Image information</h2>
                <dl className="image-color-picker__meta">
                  <div><dt>Filename</dt><dd title={metadata.fileName}>{metadata.fileName}</dd></div>
                  <div><dt>Format</dt><dd>{metadata.fileFormat}</dd></div>
                  <div><dt>Dimensions</dt><dd>{metadata.width} × {metadata.height} px</dd></div>
                  <div><dt>File size</dt><dd>{formatFileSize(metadata.fileSize)}</dd></div>
                  <div><dt>Aspect ratio</dt><dd>{metadata.aspectRatio?.toFixed(4).replace(/\.?0+$/, '')}</dd></div>
                </dl>
              </section>

              <section className="image-color-picker__panel">
                <div className="image-color-picker__section-head">
                  <h2>Recent colors</h2>
                  {history.length > 0 && <button type="button" className="image-color-picker__text-button" onClick={() => setHistory([])}>Clear</button>}
                </div>
                {history.length === 0 ? (
                  <p className="image-color-picker__empty">No sampled colors yet.</p>
                ) : (
                  <div className="image-color-picker__history">
                    {history.map((item) => {
                      const hex = rgbToHex(item.color);
                      return (
                        <div className="image-color-picker__history-item" key={`${hex}-${item.x}-${item.y}-${item.color.alpha}`}>
                          <button type="button" className="image-color-picker__history-swatch" aria-label={`Select ${hex}`} style={{ background: `rgba(${item.color.red}, ${item.color.green}, ${item.color.blue}, ${item.color.alpha / 255})` }} onClick={() => setSelected(item)} />
                          <button type="button" className="image-color-picker__history-value" onClick={() => setSelected(item)}>{hex}</button>
                          <button type="button" className="image-color-picker__history-remove" aria-label={`Remove ${hex}`} onClick={() => setHistory((current) => current.filter((entry) => entry !== item))}><X size={13} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="image-color-picker__panel">
                <h2>Export palette</h2>
                <div className="image-color-picker__export">
                  <button type="button" className="image-color-picker__button" disabled={!palette.length} onClick={() => void copyText(displayedPalette.map(rgbToHex).join(', '), 'HEX palette')}><Copy size={14} /> Copy HEX</button>
                  <button type="button" className="image-color-picker__button" disabled={!palette.length} onClick={() => void copyText(displayedPalette.map(formatRgb).join(', '), 'RGB palette')}><Copy size={14} /> Copy RGB</button>
                  <button type="button" className="image-color-picker__button" disabled={!palette.length} onClick={() => downloadText(JSON.stringify(displayedPalette.map((color) => ({ hex: rgbToHex(color), rgb: formatRgb(color) })), null, 2), 'image-color-palette.json', 'application/json')}><Download size={14} /> Download JSON</button>
                  <button type="button" className="image-color-picker__button" disabled={!palette.length} onClick={() => {
                    const css = `:root {\n${displayedPalette.map((color, index) => `  --color-${index + 1}: ${rgbToHex(color)};`).join('\n')}\n}`;
                    downloadText(css, 'image-color-palette.css', 'text/css');
                  }}><Download size={14} /> Download CSS</button>
                </div>
              </section>
            </aside>
          </div>

          <button type="button" className="image-color-picker__reset" onClick={resetWorkspace}><Trash2 size={15} /> Reset workspace</button>
        </>
      )}
    </div>
  );
}
