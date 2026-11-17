import React, { useRef, useState, useEffect } from 'react';
import { Upload, Trash2, RotateCcw, Download, Lock, Unlock, LoaderCircle, ImageIcon } from 'lucide-react';
import './image-resizer.css';

const MAX_PIXELS = 80_000_000;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

type FitMode = 'contain' | 'cover' | 'stretch';

interface Size { w: number; h: number; }

const PRESETS = [
  { group: 'Social Media', name: 'Instagram Square', w: 1080, h: 1080 },
  { group: 'Social Media', name: 'Instagram Portrait', w: 1080, h: 1350 },
  { group: 'Social Media', name: 'Instagram Landscape', w: 1080, h: 566 },
  { group: 'Social Media', name: 'Instagram Story/Reel', w: 1080, h: 1920 },
  { group: 'Social Media', name: 'Facebook Post', w: 1200, h: 630 },
  { group: 'Social Media', name: 'Facebook Cover', w: 820, h: 312 },
  { group: 'Social Media', name: 'Facebook Profile', w: 170, h: 170 },
  { group: 'Social Media', name: 'YouTube Thumbnail', w: 1280, h: 720 },
  { group: 'Social Media', name: 'YouTube Banner', w: 2560, h: 1440 },
  { group: 'Social Media', name: 'LinkedIn Post', w: 1200, h: 627 },
  { group: 'Social Media', name: 'LinkedIn Profile', w: 400, h: 400 },
  { group: 'Social Media', name: 'X/Twitter Post', w: 1600, h: 900 },
  { group: 'Website', name: 'Website Thumbnail', w: 150, h: 150 },
  { group: 'Website', name: 'Blog Featured Image', w: 1200, h: 628 },
  { group: 'Website', name: 'Website Banner', w: 1920, h: 480 },
  { group: 'Website', name: 'Product Image', w: 800, h: 800 },
  { group: 'Website', name: 'Blog Post Image', w: 1200, h: 800 },
  { group: 'Website', name: 'Website Profile', w: 256, h: 256 },
  { group: 'Common', name: '320x240', w: 320, h: 240 },
  { group: 'Common', name: '640x480', w: 640, h: 480 },
  { group: 'Common', name: '800x600', w: 800, h: 600 },
  { group: 'Common', name: '1024x768', w: 1024, h: 768 },
  { group: 'Common', name: '1280x720', w: 1280, h: 720 },
  { group: 'Common', name: '1920x1080', w: 1920, h: 1080 },
];

export default function ImageResizer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [origSize, setOrigSize] = useState<Size | null>(null);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [aspect, setAspect] = useState(1);
  const [percent, setPercent] = useState<number | null>(100);
  const [customPercent, setCustomPercent] = useState('100');
  const [fit, setFit] = useState<FitMode>('contain');
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(0.9);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [filename, setFilename] = useState('image-resized');
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSize, setResultSize] = useState<Size | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (origUrl) URL.revokeObjectURL(origUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [origUrl, resultUrl]);

  const loadFile = (f: File) => {
    if (!ACCEPT.includes(f.type)) { setError('Unsupported format. Use JPEG, PNG, or WEBP.'); return; }
    if (f.size > 50 * 1024 * 1024) { setError('File too large (max 50MB).'); return; }
    setError(null);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setFile(f);
      if (origUrl) URL.revokeObjectURL(origUrl);
      setOrigUrl(url);
      setOrigSize({ w: img.naturalWidth, h: img.naturalHeight });
      setAspect(img.naturalWidth / img.naturalHeight);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setPercent(100);
      setResultUrl(null);
      setResultBlob(null);
      setResultSize(null);
      setFilename(f.name.replace(/\.[^.]+$/, '') + '-resized');
    };
    img.onerror = () => { setError('Could not decode image.'); URL.revokeObjectURL(url); };
    img.src = url;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  };

  const remove = () => {
    if (origUrl) URL.revokeObjectURL(origUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null); setOrigUrl(null); setOrigSize(null); setResultUrl(null); setResultBlob(null); setResultSize(null);
  };

  const setW = (v: number) => {
    if (!Number.isFinite(v) || v <= 0) return;
    setWidth(v);
    if (lockAspect && origSize) setHeight(Math.round(v / aspect));
  };
  const setH = (v: number) => {
    if (!Number.isFinite(v) || v <= 0) return;
    setHeight(v);
    if (lockAspect && origSize) setWidth(Math.round(v * aspect));
  };

  const applyPercent = (p: number) => {
    if (!origSize) return;
    const w = Math.round(origSize.w * p / 100);
    const h = Math.round(origSize.h * p / 100);
    setWidth(w); setHeight(h);
  };

  const applyPreset = (w: number, h: number) => {
    setWidth(w); setHeight(h);
    setLockAspect(false);
  };

  const runResize = async () => {
    if (!file || !origSize || !origUrl) return;
    if (width <= 0 || height <= 0) { setError('Width and height must be positive.'); return; }
    if (width * height > MAX_PIXELS) { setError('Requested size too large (max 80M pixels).'); return; }
    setProcessing(true); setError(null);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = origUrl!;
      });
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      if (format === 'jpeg') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
      }
      // draw with fit
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      let dx = 0, dy = 0, dw = width, dh = height;
      if (fit === 'contain') {
        const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
        dw = Math.round(img.naturalWidth * scale);
        dh = Math.round(img.naturalHeight * scale);
        dx = Math.round((width - dw) / 2);
        dy = Math.round((height - dh) / 2);
      } else if (fit === 'cover') {
        const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
        sw = Math.round(width / scale);
        sh = Math.round(height / scale);
        sx = Math.round((img.naturalWidth - sw) * (cropX / 100));
        sy = Math.round((img.naturalHeight - sh) * (cropY / 100));
        sx = Math.max(0, Math.min(img.naturalWidth - sw, sx));
        sy = Math.max(0, Math.min(img.naturalHeight - sh, sy));
      }
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), mime, format === 'png' ? undefined : quality));
      if (!blob) { setError('Encoding failed.'); setProcessing(false); return; }
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBlob(blob);
      setResultSize({ w: width, h: height });
    } catch {
      setError('Processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!resultUrl || !resultBlob) return;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `${filename || 'image-resized'}.${ext}`;
    a.click();
  };

  const pctOptions = [25, 50, 75, 100, 125, 150, 200];

  return (
    <div className="image-resizer">
      <section className="image-resizer__upload" aria-labelledby="ir-upload">
        <div className="image-resizer__section-heading">
          <h2 id="ir-upload">01 / Select image</h2>
        </div>
        <div
          className={`image-resizer__dropzone${dragging ? ' image-resizer__dropzone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="image-resizer__upload-icon"><Upload size={23} /></div>
          <div><strong>Drag & drop an image</strong><span>JPEG, PNG, WEBP (max 50MB)</span></div>
          <button type="button" className="image-resizer__button image-resizer__button--secondary" onClick={() => inputRef.current?.click()}>Browse Files</button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="image-resizer__file-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        </div>
        {error && <p className="image-resizer__error" role="alert">{error}</p>}
        {file && origSize && (
          <div className="image-resizer__fileinfo">
            <strong>{file.name}</strong> · {origSize.w}×{origSize.h} · {(file.size / 1024).toFixed(1)} KB · {file.type.split('/')[1]?.toUpperCase()}
            <button type="button" className="image-resizer__icon-button" onClick={remove} aria-label="Remove"><Trash2 size={16} /></button>
          </div>
        )}
      </section>

      {file && origSize && (
        <div className="image-resizer__workspace">
          <aside className="image-resizer__settings">
            <div className="image-resizer__section-heading image-resizer__section-heading--compact">
              <h2>02 / Resize settings</h2>
            </div>

            <div className="image-resizer__field">
              <span className="image-resizer__label">Width (px)</span>
              <input type="number" min={1} value={width} onChange={(e) => setW(Number(e.target.value))} className="image-resizer__input" />
            </div>
            <div className="image-resizer__field">
              <span className="image-resizer__label">Height (px)</span>
              <input type="number" min={1} value={height} onChange={(e) => setH(Number(e.target.value))} className="image-resizer__input" />
            </div>
            <label className="image-resizer__check">
              <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
              {lockAspect ? <Lock size={14} /> : <Unlock size={14} />} Maintain aspect ratio
            </label>
            <button type="button" className="image-resizer__reset" onClick={() => { setWidth(origSize.w); setHeight(origSize.h); }}>Reset to original</button>

            <div className="image-resizer__field">
              <span className="image-resizer__label">Resize by percentage</span>
              <div className="image-resizer__presets" role="group">
                {pctOptions.map((p) => (
                  <button key={p} type="button" className={percent === p ? 'image-resizer__preset image-resizer__preset--active' : 'image-resizer__preset'} onClick={() => { setPercent(p); applyPercent(p); }}>{p}%</button>
                ))}
                <input type="number" value={customPercent} onChange={(e) => setCustomPercent(e.target.value)} onBlur={() => { const p = Number(customPercent); if (p > 0) { setPercent(p); applyPercent(p); } }} className="image-resizer__input" style={{ width: 80 }} placeholder="custom %" />
              </div>
              <p className="image-resizer__hint">Resulting: {width} × {height}</p>
            </div>

            <div className="image-resizer__field">
              <span className="image-resizer__label">Preset dimensions</span>
              <select className="image-resizer__input" onChange={(e) => {
                const idx = Number(e.target.value);
                if (idx >= 0) { const p = PRESETS[idx]; applyPreset(p.w, p.h); }
              }} defaultValue="-1">
                <option value="-1">Select a preset…</option>
                {PRESETS.map((p, i) => (
                  <option key={i} value={i}>{p.group} — {p.name} ({p.w}×{p.h})</option>
                ))}
              </select>
            </div>

            <div className="image-resizer__field">
              <span className="image-resizer__label">Fit mode</span>
              <div className="image-resizer__presets" role="group">
                {(['contain','cover','stretch'] as FitMode[]).map((m) => (
                  <button key={m} type="button" className={fit === m ? 'image-resizer__preset image-resizer__preset--active' : 'image-resizer__preset'} onClick={() => setFit(m)}>{m}</button>
                ))}
              </div>
              {fit === 'cover' && (
                <div>
                  <label className="image-resizer__label">Crop X: {cropX}%</label>
                  <input type="range" min={0} max={100} value={cropX} onChange={(e) => setCropX(Number(e.target.value))} />
                  <label className="image-resizer__label">Crop Y: {cropY}%</label>
                  <input type="range" min={0} max={100} value={cropY} onChange={(e) => setCropY(Number(e.target.value))} />
                </div>
              )}
            </div>

            <div className="image-resizer__field">
              <span className="image-resizer__label">Output format</span>
              <div className="image-resizer__presets" role="group">
                {(['png','jpeg','webp'] as const).map((f) => (
                  <button key={f} type="button" className={format === f ? 'image-resizer__preset image-resizer__preset--active' : 'image-resizer__preset'} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
                ))}
              </div>
              {format !== 'png' && (
                <div>
                  <label className="image-resizer__label">Quality: {Math.round(quality * 100)}%</label>
                  <input type="range" min={0.1} max={1} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
                </div>
              )}
              {format === 'jpeg' && (
                <div>
                  <label className="image-resizer__label">Background color</label>
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                </div>
              )}
            </div>

            <div className="image-resizer__field">
              <span className="image-resizer__label">Output filename</span>
              <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} className="image-resizer__input" />
            </div>

            <div className="image-resizer__settings-actions">
              <button type="button" className="image-resizer__button image-resizer__button--primary" onClick={() => void runResize()} disabled={processing}>
                {processing ? <LoaderCircle className="image-resizer__spinner" size={17} /> : <ImageIcon size={17} />} Resize
              </button>
              <button type="button" className="image-resizer__reset" onClick={() => { setWidth(origSize.w); setHeight(origSize.h); setResultUrl(null); setResultBlob(null); setResultSize(null); }}><RotateCcw size={15} /> Reset</button>
            </div>
          </aside>

          <section className="image-resizer__results">
            <div className="image-resizer__results-heading">
              <h2>03 / Preview</h2>
            </div>
            <div className="image-resizer__comparison">
              <div className="image-resizer__image-panel">
                <div className="image-resizer__panel-label"><span>Original</span><span>{(file.size / 1024).toFixed(1)} KB</span></div>
                <div className="image-resizer__preview"><img src={origUrl!} alt="Original" /></div>
                <span className="image-resizer__dimensions">{origSize.w}×{origSize.h}</span>
              </div>
              <div className="image-resizer__image-panel">
                <div className="image-resizer__panel-label"><span>Resized</span><span>{resultBlob ? (resultBlob.size / 1024).toFixed(1) + ' KB' : '—'}</span></div>
                <div className="image-resizer__preview">{resultUrl ? <img src={resultUrl} alt="Resized" /> : <div className="image-resizer__empty">No result yet</div>}</div>
                <span className="image-resizer__dimensions">{resultSize ? `${resultSize.w}×${resultSize.h} · ${format.toUpperCase()}` : 'Apply to see result'}</span>
              </div>
            </div>
            {resultUrl && (
              <button type="button" className="image-resizer__button image-resizer__button--primary" onClick={download}><Download size={15} /> Download</button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
