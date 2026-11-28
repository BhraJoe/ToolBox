import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  ImagePlus,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  formatHsl,
  formatRgb,
  isSupportedImageFile,
  loadImageFile,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  rgbToHex,
  type RgbaColor,
} from '../../../utils/imageColorPicker';
import { extractImageMetadata, formatFileSize, type ImageMetadata } from '../../../utils/imageMetadata';
import { hslToRgb, rgbToHsl } from '../../../utils/colorConverter';
import { extractPalette, hexToRgb } from '../../../utils/imagePalette';
import './image-color-palette-generator.css';

interface PaletteColor {
  id: number;
  color: RgbaColor;
  locked: boolean;
  source: 'extracted' | 'manual';
}

interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

interface HarmonyGroup {
  name: string;
  colors: RgbaColor[];
}

const ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const SIZE_OPTIONS = [3, 5, 6, 8, 10, 12];
let nextColorId = 1;

export default function ImageColorPaletteGenerator() {
  const inputRef = useRef<HTMLInputElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [originalPalette, setOriginalPalette] = useState<PaletteColor[]>([]);
  const [paletteSize, setPaletteSize] = useState(5);
  const [customSize, setCustomSize] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [editingHex, setEditingHex] = useState('');
  const [paletteName, setPaletteName] = useState('My Color Palette');
  const [view, setView] = useState<'detailed' | 'compact'>('detailed');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [regenerationSeed, setRegenerationSeed] = useState(1);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const makePalette = (colors: RgbaColor[], source: PaletteColor['source'] = 'extracted'): PaletteColor[] =>
    colors.map((color) => ({
      id: nextColorId++,
      color,
      locked: false,
      source,
    }));

  const selectPaletteColor = (item: PaletteColor) => {
    setActiveId(item.id);
    setEditingHex(rgbToHex(item.color).toLowerCase());
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
      const extracted = extractPalette(canvas, paletteSize, regenerationSeed);

      setFile(nextFile);
      setImageUrl(loaded.url);
      setMetadata({
        ...nextMetadata,
        width: loaded.image.naturalWidth,
        height: loaded.image.naturalHeight,
        aspectRatio: loaded.image.naturalWidth / loaded.image.naturalHeight,
      });
      const nextPalette = makePalette(extracted.map((point) => point.color));
      setPalette(nextPalette);
      setOriginalPalette(nextPalette.map((item) => ({ ...item, id: item.id })));
      if (nextPalette[0]) selectPaletteColor(nextPalette[0]);
      else setActiveId(null);
      setFeedback({ kind: 'success', text: `Extracted ${nextPalette.length} colors locally.` });
      loadedUrl = null;
    } catch (error) {
      if (loadedUrl) URL.revokeObjectURL(loadedUrl);
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'The image could not be loaded.' });
    } finally {
      setProcessing(false);
    }
  };

  const regenerate = (count = paletteSize) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) {
      setFeedback({ kind: 'error', text: 'Upload an image before generating a palette.' });
      return;
    }
    const seed = regenerationSeed + 7919;
    setRegenerationSeed(seed);
    const extracted = extractPalette(canvas, count, seed);
    const extractedColors = extracted.map((point) => point.color);
    let extractedIndex = 0;

    setPalette((current) => {
      if (count <= 0) return current;
      const next: PaletteColor[] = [];
      for (let index = 0; index < count; index += 1) {
        const existingLocked = current[index]?.locked ? current[index] : null;
        if (existingLocked) {
          next.push(existingLocked);
        } else {
          const extractedColor = extractedColors[extractedIndex] ?? extractedColors[extractedIndex % extractedColors.length];
          next.push({
            id: nextColorId++,
            color: extractedColor,
            locked: false,
            source: 'extracted',
          });
          extractedIndex += 1;
        }
      }
      return next;
    });
    setFeedback({ kind: 'success', text: 'Palette regenerated with a different color sampling.' });
  };

  const resetPalette = () => {
    const reset = originalPalette.map((item) => ({ ...item, id: nextColorId++, locked: false, source: 'extracted' as const }));
    setPalette(reset);
    setPaletteSize(reset.length);
    if (reset[0]) selectPaletteColor(reset[0]);
    else setActiveId(null);
    setFeedback({ kind: 'success', text: 'Restored the original extracted palette.' });
  };

  const resetAll = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setMetadata(null);
    setPalette([]);
    setOriginalPalette([]);
    setPaletteSize(5);
    setCustomSize('');
    setActiveId(null);
    setPaletteName('My Color Palette');
    setView('detailed');
    setFeedback(null);
    originalCanvasRef.current = null;
  };

  const copyText = async (text: string, label: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setFeedback({ kind: 'success', text: `${label} copied to clipboard.` });
    } catch {
      setFeedback({ kind: 'error', text: 'Clipboard permission was denied.' });
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
  };

  const cssText = () => `:root {\n${palette.map((item, index) =>
    `  --palette-color-${index + 1}: ${rgbToHex(item.color).toUpperCase()};`,
  ).join('\n')}\n}`;

  const jsonText = () => JSON.stringify({
    name: paletteName.trim() || 'My Color Palette',
    colors: palette.map((item) => ({
      hex: rgbToHex(item.color).toUpperCase(),
      rgb: formatRgb(item.color),
      hsl: formatHsl(item.color),
    })),
  }, null, 2);

  const downloadPreview = () => {
    if (palette.length === 0) return;
    const canvas = document.createElement('canvas');
    const padding = 32;
    const cardWidth = Math.max(160, Math.floor(1280 / palette.length));
    canvas.width = padding * 2 + cardWidth * palette.length;
    canvas.height = 330;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    palette.forEach((item, index) => {
      const x = padding + index * cardWidth;
      context.fillStyle = rgbToHex(item.color);
      context.fillRect(x, padding, cardWidth, 210);
      context.fillStyle = '#111827';
      context.font = '16px Arial';
      context.textAlign = 'center';
      context.fillText(rgbToHex(item.color).toUpperCase(), x + cardWidth / 2, 270);
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'color-palette.png';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback({ kind: 'success', text: 'color-palette.png downloaded.' });
    }, 'image/png');
  };

  const updateActiveHex = (hex: string) => {
    setEditingHex(hex);
    if (!/^#?[0-9a-f]{6}$/i.test(hex)) return;
    try {
      const color = hexToRgb(hex);
      setPalette((current) => current.map((item) =>
        item.id === activeId ? { ...item, color, source: 'manual' } : item,
      ));
    } catch {
      // Invalid intermediate input while typing.
    }
  };

  const replaceActive = (hex: string) => {
    try {
      const color = hexToRgb(hex);
      setPalette((current) => current.map((item) =>
        item.id === activeId ? { ...item, color, source: 'manual' } : item,
      ));
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Invalid color.' });
    }
  };

  const addColor = () => {
    if (palette.length >= 24) {
      setFeedback({ kind: 'error', text: 'A palette can contain up to 24 colors.' });
      return;
    }
    const item: PaletteColor = {
      id: nextColorId++,
      color: hexToRgb('#2563EB'),
      locked: false,
      source: 'manual',
    };
    setPalette((current) => [...current, item]);
    setPaletteSize((current) => current + 1);
    selectPaletteColor(item);
  };

  const removeColor = (id: number) => {
    setPalette((current) => {
      const next = current.filter((item) => item.id !== id);
      if (activeId === id) {
        if (next[0]) selectPaletteColor(next[0]);
        else setActiveId(null);
      }
      setPaletteSize(next.length);
      return next;
    });
  };

  const toggleLocked = (id: number) => {
    setPalette((current) => current.map((item) =>
      item.id === id ? { ...item, locked: !item.locked } : item,
    ));
  };

  const moveColor = (id: number, direction: -1 | 1) => {
    setPalette((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const active = palette.find((item) => item.id === activeId) ?? palette[0] ?? null;

  const getHarmonies = (): HarmonyGroup[] => {
    if (!active) return [];
    const hsl = rgbToHsl(active.color);
    const withAlpha = (rgb: { red: number; green: number; blue: number }): RgbaColor => ({
      red: rgb.red,
      green: rgb.green,
      blue: rgb.blue,
      alpha: 255,
    });
    const fromHsl = (hue: number, saturation = hsl.saturation, lightness = hsl.lightness) =>
      withAlpha(hslToRgb({
        hue: (hue + 360) % 360,
        saturation,
        lightness,
      }));
    return [
      { name: 'Complementary', colors: [fromHsl(hsl.hue + 180)] },
      { name: 'Analogous', colors: [fromHsl(hsl.hue - 30), fromHsl(hsl.hue + 30)] },
      { name: 'Triadic', colors: [fromHsl(hsl.hue + 120), fromHsl(hsl.hue + 240)] },
      {
        name: 'Monochromatic',
        colors: [0.18, 0.32, 0.65, 0.82].map((lightness) =>
          withAlpha(hslToRgb({ hue: hsl.hue, saturation: hsl.saturation, lightness })),
        ),
      },
    ];
  };

  const harmonies = getHarmonies();

  return (
    <div className="palette-generator">
      <div className="palette-generator__reset-bar">
        <button type="button" className="palette-generator__button" onClick={resetAll}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {feedback && (
        <div className={`palette-generator__status palette-generator__status--${feedback.kind}`} role="status">
          {feedback.text}
        </div>
      )}

      <section className="palette-generator__upload">
        <div
          className="palette-generator__dropzone"
          onDragEnter={(event) => event.preventDefault()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (event.dataTransfer.files[0]) void addFile(event.dataTransfer.files[0]);
          }}
        >
          <Upload size={28} />
          <div>
            <h2>{file ? 'Replace image' : 'Drop an image here'}</h2>
            <p>PNG, JPG/JPEG or WebP · Maximum 30 MB · Maximum 40 MP</p>
          </div>
          <button type="button" className="palette-generator__button palette-generator__button--primary" onClick={() => inputRef.current?.click()} disabled={processing}>
            <ImagePlus size={16} /> {processing ? 'Processing…' : 'Browse files'}
          </button>
          <input ref={inputRef} className="palette-generator__file-input" type="file" accept={ACCEPT} onChange={(event) => {
            const next = event.target.files?.[0];
            if (next) void addFile(next);
            event.target.value = '';
          }} />
        </div>
      </section>

      {file && metadata && imageUrl && (
        <>
          <section className="palette-generator__workspace">
            <div className="palette-generator__image-panel">
              <img src={imageUrl} alt="Uploaded palette source" />
            </div>
            <div className="palette-generator__controls">
              <h2>Palette size</h2>
              <div className="palette-generator__sizes">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    type="button"
                    key={size}
                    className={paletteSize === size ? 'active' : ''}
                    onClick={() => {
                      setPaletteSize(size);
                      setCustomSize('');
                      regenerate(size);
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <label>
                Custom
                <input
                  type="number"
                  min="2"
                  max="24"
                  value={customSize}
                  onChange={(event) => setCustomSize(event.target.value)}
                  onBlur={() => {
                    const size = Number.parseInt(customSize, 10);
                    if (size >= 2 && size <= 24) {
                      setPaletteSize(size);
                      regenerate(size);
                    }
                  }}
                />
              </label>
              <button type="button" className="palette-generator__button palette-generator__button--primary" onClick={() => regenerate()}>
                <RefreshCw size={15} /> Regenerate
              </button>
              <dl className="palette-generator__metadata">
                <div><dt>Filename</dt><dd>{metadata.fileName}</dd></div>
                <div><dt>Format</dt><dd>{metadata.fileFormat}</dd></div>
                <div><dt>Dimensions</dt><dd>{metadata.width} × {metadata.height}</dd></div>
                <div><dt>File size</dt><dd>{formatFileSize(metadata.fileSize)}</dd></div>
                <div><dt>Colors</dt><dd>{palette.length} extracted/current</dd></div>
              </dl>
            </div>
          </section>

          <section className="palette-generator__panel">
            <div className="palette-generator__section-head">
              <h2>Generated palette</h2>
              <div className="palette-generator__view-toggle">
                <button type="button" className={view === 'compact' ? 'active' : ''} onClick={() => setView('compact')}>Compact</button>
                <button type="button" className={view === 'detailed' ? 'active' : ''} onClick={() => setView('detailed')}>Detailed</button>
              </div>
            </div>

            {palette.length > 0 && (
              <div className="palette-generator__strip" aria-label="Palette preview">
                {palette.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    style={{ background: rgbToHex(item.color) }}
                    className={item.id === activeId ? 'active' : ''}
                    onClick={() => selectPaletteColor(item)}
                    aria-label={`Select ${rgbToHex(item.color)}`}
                  />
                ))}
              </div>
            )}

            <div className={`palette-generator__cards palette-generator__cards--${view}`}>
              {palette.map((item, index) => {
                const hex = rgbToHex(item.color).toUpperCase();
                return (
                  <article
                    key={item.id}
                    className={`palette-generator__card${item.id === activeId ? ' palette-generator__card--active' : ''}`}
                    draggable
                    onDragStart={() => setDraggingId(item.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggingId === null || draggingId === item.id) return;
                      setPalette((current) => {
                        const from = current.findIndex((color) => color.id === draggingId);
                        const to = current.findIndex((color) => color.id === item.id);
                        if (from < 0 || to < 0) return current;
                        const next = [...current];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        return next;
                      });
                      setDraggingId(null);
                    }}
                  >
                    <button
                      type="button"
                      className="palette-generator__swatch"
                      style={{ background: hex }}
                      onClick={() => selectPaletteColor(item)}
                      aria-label={`Edit ${hex}`}
                    />
                    <div className="palette-generator__card-body">
                      <div className="palette-generator__card-title">
                        <strong>{hex}</strong>
                        <span className={item.source === 'manual' ? 'manual' : 'extracted'}>
                          {item.source === 'manual' ? 'Manual' : 'Extracted'}
                        </span>
                      </div>
                      {view === 'detailed' && (
                        <>
                          <button type="button" className="palette-generator__value" onClick={() => void copyText(formatRgb(item.color), 'RGB')}>
                            <span>RGB</span><code>{formatRgb(item.color)}</code><Copy size={13} />
                          </button>
                          <button type="button" className="palette-generator__value" onClick={() => void copyText(formatHsl(item.color), 'HSL')}>
                            <span>HSL</span><code>{formatHsl(item.color)}</code><Copy size={13} />
                          </button>
                        </>
                      )}
                      <div className="palette-generator__card-actions">
                        <button type="button" onClick={() => void copyText(hex, 'HEX')} aria-label="Copy HEX"><Copy size={14} /></button>
                        <button type="button" onClick={() => toggleLocked(item.id)} aria-label={item.locked ? 'Unlock color' : 'Lock color'}>
                          {item.locked ? <Lock size={14} /> : <LockOpen size={14} />}
                        </button>
                        <button type="button" onClick={() => moveColor(item.id, -1)} disabled={index === 0} aria-label="Move left"><ArrowLeft size={14} /></button>
                        <button type="button" onClick={() => moveColor(item.id, 1)} disabled={index === palette.length - 1} aria-label="Move right"><ArrowRight size={14} /></button>
                        <button type="button" onClick={() => removeColor(item.id)} aria-label="Remove color"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
              <button type="button" className="palette-generator__add" onClick={addColor}><Plus size={18} /> Add color</button>
            </div>
          </section>

          {active && (
            <section className="palette-generator__layout">
              <div className="palette-generator__panel">
                <h2>Active color</h2>
                <div className="palette-generator__active">
                  <div className="palette-generator__large-swatch" style={{ background: rgbToHex(active.color) }} />
                  <div>
                    <strong>{rgbToHex(active.color).toUpperCase()}</strong>
                    <span>{active.source === 'manual' ? 'Manually edited' : 'Extracted from image'}</span>
                  </div>
                </div>
                <div className="palette-generator__editor">
                  <label>
                    HEX
                    <input value={editingHex} onChange={(event) => updateActiveHex(event.target.value)} onBlur={() => replaceActive(editingHex)} />
                  </label>
                  <label>
                    Replace
                    <input type="color" value={rgbToHex(active.color)} onChange={(event) => replaceActive(event.target.value)} />
                  </label>
                </div>
                <div className="palette-generator__value-list">
                  {[
                    ['HEX', rgbToHex(active.color).toUpperCase()],
                    ['RGB', formatRgb(active.color)],
                    ['HSL', formatHsl(active.color)],
                  ].map(([label, value]) => (
                    <button type="button" key={label} onClick={() => void copyText(value, label)}>
                      <span>{label}</span><code>{value}</code><Copy size={14} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="palette-generator__panel">
                <h2>Harmony suggestions</h2>
                <p className="palette-generator__suggestion-note">Suggestions are generated, not extracted from the image.</p>
                <div className="palette-generator__harmonies">
                  {harmonies.map((group) => (
                    <div key={group.name}>
                      <h3>{group.name}</h3>
                      <div>
                        {group.colors.map((color, index) => (
                          <button
                            type="button"
                            key={`${group.name}-${index}`}
                            style={{ background: rgbToHex(color) }}
                            onClick={() => void copyText(rgbToHex(color).toUpperCase(), `${group.name} color`)}
                            title={`Copy ${rgbToHex(color).toUpperCase()}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="palette-generator__panel palette-generator__export">
            <h2>Export palette</h2>
            <label className="palette-generator__name">
              Palette name
              <input value={paletteName} onChange={(event) => setPaletteName(event.target.value)} />
            </label>
            <div className="palette-generator__export-actions">
              <button type="button" onClick={() => void copyText(palette.map((item) => rgbToHex(item.color).toUpperCase()).join(', '), 'All HEX values')}>
                <Copy size={15} /> Copy all HEX
              </button>
              <button type="button" onClick={() => void copyText(palette.map((item) => formatRgb(item.color)).join(', '), 'All RGB values')}>
                <Copy size={15} /> Copy all RGB
              </button>
              <button type="button" onClick={() => void copyText(cssText(), 'CSS palette')}>
                <Copy size={15} /> Copy CSS
              </button>
              <button type="button" onClick={() => downloadText(cssText(), 'color-palette.css', 'text/css')}>
                <Download size={15} /> Download CSS
              </button>
              <button type="button" onClick={() => downloadText(jsonText(), 'color-palette.json', 'application/json')}>
                <Download size={15} /> Download JSON
              </button>
              <button type="button" onClick={downloadPreview}>
                <Download size={15} /> Download PNG
              </button>
            </div>
            <button type="button" className="palette-generator__reset-original" onClick={resetPalette}>
              <RotateCcw size={15} /> Reset to original extracted palette
            </button>
          </section>
        </>
      )}
    </div>
  );
}
