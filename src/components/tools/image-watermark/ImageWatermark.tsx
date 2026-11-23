import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Trash2,
  RotateCcw,
  RefreshCw,
  LoaderCircle,
  Image as ImageIcon,
  Check,
  X,
  Download,
  Stamp,
  Eye,
  Layers,
} from 'lucide-react';
import {
  WATERMARK_LIMITS,
  DEFAULT_FONT_FAMILIES,
  POSITION_PRESETS,
  POSITION_LABELS,
  isSupportedImageFile,
  formatFileSize,
  dimensionsLabel,
  loadImageFile,
  getImageMimeType,
  getImageExtension,
  renderWatermarkImage,
  exportWatermarkedImage,
  downloadBlob,
  generateWatermarkFilename,
  type ImageFileInfo,
  type LogoWatermarkConfig,
  type PositionPreset,
  type TextWatermarkConfig,
} from '../../../utils/imageWatermark';
import './image-watermark.css';

type WatermarkMode = 'text' | 'logo';

export default function ImageWatermark() {
  const inputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const urlsRef = useRef<Set<string>>(new Set());

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalInfo, setOriginalInfo] = useState<ImageFileInfo | null>(null);
  const [_logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  const [mode, setMode] = useState<WatermarkMode>('text');
  const [textConfig, setTextConfig] = useState<TextWatermarkConfig>({
    type: 'text',
    text: 'WATERMARK',
    fontFamily: DEFAULT_FONT_FAMILIES[0],
    fontSize: 48,
    fontWeight: 'normal',
    color: '#ffffff',
    opacity: 80,
    rotation: 0,
    shadow: false,
    outline: false,
    position: 'center',
    positionX: 50,
    positionY: 50,
    margin: 20,
    repeat: false,
    repeatSpacing: 120,
  });

  const [logoConfig, setLogoConfig] = useState<LogoWatermarkConfig>({
    type: 'logo',
    logoFile: null,
    logoPreviewUrl: null,
    logoWidth: 200,
    position: 'bottom-right',
    positionX: 90,
    positionY: 90,
    margin: 20,
    rotation: 0,
    opacity: 80,
    repeat: false,
    repeatSpacing: 120,
  });

  const [format, setFormat] = useState<string>('png');
  const [quality, setQuality] = useState(90);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [customFilename, setCustomFilename] = useState('watermarked-image');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [watermarkedPreview, setWatermarkedPreview] = useState<string | null>(null);
  const [previewView, setPreviewView] = useState<'watermarked' | 'original'>('watermarked');

  const revokeManagedUrl = (url: string | null) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  };

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }, []);

  const addOriginalFile = async (file: File) => {
    if (processing) return;
    setMessage(null);
    if (!isSupportedImageFile(file)) {
      setMessage({ text: `${file.name}: choose a PNG, JPG or WEBP image.`, kind: 'error' });
      return;
    }
    if (file.size > WATERMARK_LIMITS.MAX_IMAGE_SIZE_BYTES) {
      setMessage({ text: `${file.name} is larger than the 30 MB per-image limit.`, kind: 'error' });
      return;
    }
    const info = await loadImageFile(file);
    if (info.dimensions.width * info.dimensions.height > WATERMARK_LIMITS.MAX_IMAGE_PIXELS) {
      revokeManagedUrl(info.previewUrl);
      setMessage({ text: `${file.name} has more than 80 million pixels and may exceed browser memory limits.`, kind: 'error' });
      return;
    }

    setOriginalFile(file);
    setOriginalInfo(info);
    revokeManagedUrl(originalPreview);
    setOriginalPreview(info.previewUrl);
    setWatermarkedPreview(null);
    setPreviewView('watermarked');

    const img = new Image();
    img.onload = () => {
      originalImgRef.current = img;
    };
    img.src = URL.createObjectURL(file);
  };

  const addLogoFile = async (file: File) => {
    if (processing) return;
    setMessage(null);
    if (!isSupportedImageFile(file)) {
      setMessage({ text: `${file.name}: choose a PNG, JPG or WEBP logo.`, kind: 'error' });
      return;
    }
    if (file.size > WATERMARK_LIMITS.MAX_LOGO_SIZE_BYTES) {
      setMessage({ text: `${file.name} is larger than the 10 MB logo limit.`, kind: 'error' });
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreviewUrl(url);
    const img = new Image();
    img.onload = () => {
      setLogoImg(img);
      logoImgRef.current = img;
    };
    img.onerror = () => {
      setMessage({ text: `${file.name} could not be decoded as an image.`, kind: 'error' });
    };
    img.src = url;
  };

  const removeLogo = () => {
    if (logoPreviewUrl) revokeManagedUrl(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoImg(null);
    logoImgRef.current = null;
  };

  const handleReset = () => {
    if (originalPreview) revokeManagedUrl(originalPreview);
    setOriginalFile(null);
    setOriginalInfo(null);
    setOriginalPreview(null);
    setWatermarkedPreview(null);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoImg(null);
    logoImgRef.current = null;
    setTextConfig({
      type: 'text',
      text: 'WATERMARK',
      fontFamily: DEFAULT_FONT_FAMILIES[0],
      fontSize: 48,
      fontWeight: 'normal',
      color: '#ffffff',
      opacity: 80,
      rotation: 0,
      shadow: false,
      outline: false,
      position: 'center',
      positionX: 50,
      positionY: 50,
      margin: 20,
      repeat: false,
      repeatSpacing: 120,
    });
    setLogoConfig({
      type: 'logo',
      logoFile: null,
      logoPreviewUrl: null,
      logoWidth: 200,
      position: 'bottom-right',
      positionX: 90,
      positionY: 90,
      margin: 20,
      rotation: 0,
      opacity: 80,
      repeat: false,
      repeatSpacing: 120,
    });
    setFormat('png');
    setQuality(90);
    setBackgroundColor('#ffffff');
    setCustomFilename('watermarked-image');
    setMessage({ text: 'All watermark settings reset.', kind: 'success' });
  };

  const clearAll = () => {
    handleReset();
  };

  const buildConfig = (): TextWatermarkConfig | LogoWatermarkConfig | null => {
    if (mode === 'text') {
      if (!originalInfo) return null;
      if (!textConfig.text.trim()) return null;
      const fontSize = Math.max(WATERMARK_LIMITS.MIN_FONT_SIZE, Math.min(WATERMARK_LIMITS.MAX_FONT_SIZE, textConfig.fontSize));
      return { ...textConfig, fontSize };
    }
    if (mode === 'logo') {
      if (!originalInfo) return null;
      if (!logoConfig.logoFile) return null;
      return { ...logoConfig, position: logoConfig.position };
    }
    return null;
  };

  const renderPreview = useCallback(async () => {
    if (!originalInfo || !originalImgRef.current) {
      setWatermarkedPreview(null);
      return;
    }
    const config = mode === 'text'
      ? {
          ...textConfig,
          type: 'text' as const,
          text: textConfig.text,
          fontSize: Math.max(WATERMARK_LIMITS.MIN_FONT_SIZE, Math.min(WATERMARK_LIMITS.MAX_FONT_SIZE, textConfig.fontSize)),
        }
      : {
          ...logoConfig,
          type: 'logo' as const,
          logoFile: logoConfig.logoFile,
          logoPreviewUrl: logoConfig.logoPreviewUrl,
        };
    try {
      const result = await renderWatermarkImage({
        image: originalImgRef.current as CanvasImageSource,
        config: config as TextWatermarkConfig | LogoWatermarkConfig,
        outputWidth: originalInfo.dimensions.width,
        outputHeight: originalInfo.dimensions.height,
        mimeType: getImageMimeType('png'),
        quality: quality / 100,
      });
      setWatermarkedPreview((prev) => {
        if (prev && prev !== result.dataUrl) {
          if (prev.startsWith('data:')) {
            // nothing to revoke for data URLs
          } else {
            revokeManagedUrl(prev);
          }
        }
        return result.dataUrl;
      });
    } catch {
      setWatermarkedPreview(null);
    }
  }, [mode, textConfig, logoConfig, originalInfo, quality]);

  useEffect(() => {
    if (!originalInfo || !originalImgRef.current) {
      setWatermarkedPreview(null);
      return;
    }
    const timer = setTimeout(() => void renderPreview(), 250);
    return () => clearTimeout(timer);
  }, [renderPreview, originalInfo, mode, textConfig, logoConfig, quality]);

  const handleOriginalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void addOriginalFile(file);
    e.target.value = '';
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void addLogoFile(file);
    e.target.value = '';
  };

  const handleDownload = async () => {
    if (!originalInfo || processing) return;
    const config = buildConfig();
    if (!config) {
      setMessage({ text: mode === 'text' ? 'Enter a watermark text before downloading.' : 'Upload a logo before downloading.', kind: 'error' });
      return;
    }
    setProcessing(true);
    setMessage(null);
    try {
      const blob = await exportWatermarkedImage({
        image: originalImgRef.current as CanvasImageSource,
        imageWidth: originalInfo.dimensions.width,
        imageHeight: originalInfo.dimensions.height,
        config: config as TextWatermarkConfig | LogoWatermarkConfig,
        format,
        quality: quality / 100,
        backgroundColor: format === 'jpeg' ? backgroundColor : undefined,
      });
      const filename = generateWatermarkFilename(customFilename, format);
      downloadBlob(blob, filename);
      setMessage({ text: `Watermarked image downloaded as ${filename}.`, kind: 'success' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'The watermarked image could not be created.';
      setMessage({ text: errorMessage, kind: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const isTextValid = mode === 'text' && originalInfo !== null && textConfig.text.trim().length > 0;
  const isLogoValid = mode === 'logo' && originalInfo !== null && logoConfig.logoFile !== null;
  const canDownload = Boolean(originalInfo) && (mode === 'text' ? isTextValid : isLogoValid);

  return (
    <div className="image-watermark">
      <section className="image-watermark__upload" aria-labelledby="image-watermark-upload-title">
        <div className="image-watermark__section-heading">
          <div>
            <span className="image-watermark__eyebrow">01 / Original image</span>
            <h2 id="image-watermark-upload-title">Upload your image</h2>
            <p>JPEG, PNG and WEBP · Up to {Math.round(WATERMARK_LIMITS.MAX_IMAGE_SIZE_BYTES / (1024 * 1024))} MB · One image at a time</p>
          </div>
          <span className="image-watermark__local-badge"><Check size={14} /> Local processing</span>
        </div>

        <div
          className={`image-watermark__dropzone${dragging ? ' image-watermark__dropzone--active' : ''}${processing ? ' image-watermark__dropzone--disabled' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!processing) setDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void addOriginalFile(file);
          }}
        >
          <div className="image-watermark__upload-icon"><Upload size={23} /></div>
          <div>
            <strong>Drag and drop an image to begin</strong>
            <span>or browse from your device</span>
          </div>
          <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={() => inputRef.current?.click()} disabled={processing}>
            <ImageIcon size={16} /> Browse files
          </button>
          <input
            ref={inputRef}
            className="image-watermark__file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            aria-label="Choose image to watermark"
            onChange={handleOriginalChange}
          />
        </div>

        {message && (
          <div className={`image-watermark__status image-watermark__status--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            <span>{message.text}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={15} /></button>
          </div>
        )}

        {originalInfo && (
          <div className="image-watermark__file-details">
            <strong title={originalFile?.name}>{originalFile?.name}</strong>
            <span>{formatFileSize(originalInfo.fileSize)} · {dimensionsLabel(originalInfo.dimensions)}</span>
          </div>
        )}
      </section>

      {originalInfo && (
        <>
          <div className="image-watermark__type-selector" role="radiogroup" aria-label="Watermark type">
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'text'}
              className={`image-watermark__type-option${mode === 'text' ? ' image-watermark__type-option--active' : ''}`}
              onClick={() => setMode('text')}
            >
              <Stamp size={20} />
              <span className="image-watermark__type-label">Text Watermark</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'logo'}
              className={`image-watermark__type-option${mode === 'logo' ? ' image-watermark__type-option--active' : ''}`}
              onClick={() => setMode('logo')}
            >
              <ImageIcon size={20} />
              <span className="image-watermark__type-label">Logo Watermark</span>
            </button>
          </div>

          <div className="image-watermark__settings-panel">
            <div className="image-watermark__section-heading">
              <div>
                <span className="image-watermark__eyebrow">02 / Watermark</span>
                <h3 className="image-watermark__section-title">{mode === 'text' ? 'Text watermark settings' : 'Logo watermark settings'}</h3>
              </div>
              <span className="image-watermark__local-badge"><Check size={14} /> Local processing</span>
            </div>

            {mode === 'text' && (
              <div className="image-watermark__controls">
                <div className="image-watermark__control-group">
                  <label className="image-watermark__control-label" htmlFor="watermark-text">Watermark text</label>
                  <input
                    id="watermark-text"
                    className="image-watermark__input"
                    type="text"
                    value={textConfig.text}
                    onChange={(event) => setTextConfig({ ...textConfig, text: event.target.value })}
                    placeholder="Enter watermark text"
                  />
                </div>

                <div className="image-watermark__control-group">
                  <label className="image-watermark__control-label" id="watermark-font-label">Font family</label>
                  <select
                    className="image-watermark__input image-watermark__font-select"
                    aria-labelledby="watermark-font-label"
                    value={textConfig.fontFamily}
                    onChange={(event) => setTextConfig({ ...textConfig, fontFamily: event.target.value })}
                  >
                    {DEFAULT_FONT_FAMILIES.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div className="image-watermark__control-group">
                  <div className="image-watermark__control-row">
                    <label className="image-watermark__control-label" htmlFor="watermark-font-size">Font size</label>
                    <output className="image-watermark__value-text" htmlFor="watermark-font-size">{textConfig.fontSize}px</output>
                    <input
                      id="watermark-font-size"
                      type="range"
                      className="image-watermark__slider"
                      min={WATERMARK_LIMITS.MIN_FONT_SIZE}
                      max={WATERMARK_LIMITS.MAX_FONT_SIZE}
                      value={textConfig.fontSize}
                      onChange={(event) => setTextConfig({ ...textConfig, fontSize: Number(event.target.value) })}
                    />
                  </div>
                </div>

                <div className="image-watermark__control-group">
                  <label className="image-watermark__control-label">Font weight</label>
                  <div className="image-watermark__position-selector">
                    <button
                      type="button"
                      className={`image-watermark__position-option${textConfig.fontWeight === 'normal' ? ' image-watermark__position-option--active' : ''}`}
                      onClick={() => setTextConfig({ ...textConfig, fontWeight: 'normal' })}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      className={`image-watermark__position-option${textConfig.fontWeight === 'bold' ? ' image-watermark__position-option--active' : ''}`}
                      onClick={() => setTextConfig({ ...textConfig, fontWeight: 'bold' })}
                    >
                      Bold
                    </button>
                  </div>
                </div>

                <div className="image-watermark__control-group">
                  <label className="image-watermark__control-label" id="watermark-color-label">Text color</label>
                  <div className="image-watermark__control-row">
                    <input
                      type="color"
                      aria-labelledby="watermark-color-label"
                      value={textConfig.color}
                      onChange={(event) => setTextConfig({ ...textConfig, color: event.target.value })}
                    />
                    <output className="image-watermark__value-text">{textConfig.color}</output>
                  </div>
                </div>

                <div className="image-watermark__control-group">
                  <div className="image-watermark__control-row">
                    <label className="image-watermark__control-label" htmlFor="watermark-opacity">Opacity</label>
                    <output className="image-watermark__value-text" htmlFor="watermark-opacity">{textConfig.opacity}%</output>
                    <input
                      id="watermark-opacity"
                      type="range"
                      className="image-watermark__slider"
                      min={0}
                      max={100}
                      value={textConfig.opacity}
                      onChange={(event) => setTextConfig({ ...textConfig, opacity: Number(event.target.value) })}
                    />
                  </div>
                </div>

                <div className="image-watermark__control-group">
                  <div className="image-watermark__control-row">
                    <label className="image-watermark__control-label" htmlFor="watermark-rotation">Rotation</label>
                    <output className="image-watermark__value-text" htmlFor="watermark-rotation">{textConfig.rotation}°</output>
                    <input
                      id="watermark-rotation"
                      type="range"
                      className="image-watermark__slider"
                      min={-180}
                      max={180}
                      value={textConfig.rotation}
                      onChange={(event) => setTextConfig({ ...textConfig, rotation: Number(event.target.value) })}
                    />
                  </div>
                </div>

                <div className="image-watermark__control-group">
                  <label className="image-watermark__control-label">Text style</label>
                  <div className="image-watermark__position-selector">
                    <button
                      type="button"
                      className={`image-watermark__position-option${textConfig.outline ? ' image-watermark__position-option--active' : ''}`}
                      onClick={() => setTextConfig({ ...textConfig, outline: !textConfig.outline })}
                      aria-pressed={textConfig.outline}
                    >
                      Outline
                    </button>
                    <button
                      type="button"
                      className={`image-watermark__position-option${textConfig.shadow ? ' image-watermark__position-option--active' : ''}`}
                      onClick={() => setTextConfig({ ...textConfig, shadow: !textConfig.shadow })}
                      aria-pressed={textConfig.shadow}
                    >
                      Shadow
                    </button>
                  </div>
                </div>

                <div className="image-watermark__control-group">
                  <label className="image-watermark__control-label">Position</label>
                  <div className="image-watermark__position-selector">
                    {(Object.keys(POSITION_PRESETS) as PositionPreset[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`image-watermark__position-option${textConfig.position === key ? ' image-watermark__position-option--active' : ''}`}
                        onClick={() => setTextConfig({ ...textConfig, position: key })}
                      >
                        {POSITION_LABELS[key]}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`image-watermark__position-option${textConfig.position === 'custom' ? ' image-watermark__position-option--active' : ''}`}
                      onClick={() => setTextConfig({ ...textConfig, position: 'custom' })}
                    >
                      Custom
                    </button>
                  </div>
                  {textConfig.position === 'custom' && (
                    <div className="image-watermark__control-row" style={{ marginTop: 12 }}>
                      <label className="image-watermark__control-label" htmlFor="watermark-pos-x">Horizontal position</label>
                      <output className="image-watermark__value-text">{textConfig.positionX}%</output>
                      <input
                        id="watermark-pos-x"
                        type="range"
                        className="image-watermark__slider"
                        min={0}
                        max={100}
                        value={textConfig.positionX}
                        onChange={(event) => setTextConfig({ ...textConfig, positionX: Number(event.target.value) })}
                      />
                    </div>
                  )}
                  {textConfig.position === 'custom' && (
                    <div className="image-watermark__control-row" style={{ marginTop: 12 }}>
                      <label className="image-watermark__control-label" htmlFor="watermark-pos-y">Vertical position</label>
                      <output className="image-watermark__value-text">{textConfig.positionY}%</output>
                      <input
                        id="watermark-pos-y"
                        type="range"
                        className="image-watermark__slider"
                        min={0}
                        max={100}
                        value={textConfig.positionY}
                        onChange={(event) => setTextConfig({ ...textConfig, positionY: Number(event.target.value) })}
                      />
                    </div>
                  )}
                  <div className="image-watermark__control-group" style={{ marginTop: 16 }}>
                    <label className="image-watermark__control-label" htmlFor="watermark-margin">Margin</label>
                    <input
                      id="watermark-margin"
                      className="image-watermark__input"
                      type="number"
                      min={0}
                      max={WATERMARK_LIMITS.MAX_MARGIN}
                      value={textConfig.margin}
                      onChange={(event) => setTextConfig({ ...textConfig, margin: Math.max(0, Number(event.target.value) || 0) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'logo' && (
              <div className="image-watermark__controls">
                <div className="image-watermark__control-group">
                  <label className="image-watermark__control-label">Logo / watermark image</label>
                  <div className="image-watermark__control-actions">
                    <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={() => logoInputRef.current?.click()}>
                      <Upload size={16} /> Upload logo
                    </button>
                    {logoPreviewUrl && (
                      <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={() => logoInputRef.current?.click()}>
                        <RefreshCw size={16} /> Replace logo
                      </button>
                    )}
                    {logoPreviewUrl && (
                      <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={removeLogo}>
                        <Trash2 size={16} /> Remove logo
                      </button>
                    )}
                  </div>
                  <input ref={logoInputRef} className="image-watermark__file-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="Choose watermark logo" onChange={handleLogoChange} />
                </div>
                {logoPreviewUrl && logoImg && (
                  <>
                    <div className="image-watermark__control-group">
                      <div className="image-watermark__control-row">
                        <label className="image-watermark__control-label" htmlFor="logo-width">Logo width</label>
                        <output className="image-watermark__value-text" htmlFor="logo-width">{logoConfig.logoWidth}px</output>
                        <input
                          id="logo-width"
                          type="range"
                          className="image-watermark__slider"
                          min={WATERMARK_LIMITS.MIN_LOGO_WIDTH}
                          max={WATERMARK_LIMITS.MAX_LOGO_WIDTH}
                          value={Math.min(Math.max(logoConfig.logoWidth, WATERMARK_LIMITS.MIN_LOGO_WIDTH), WATERMARK_LIMITS.MAX_LOGO_WIDTH)}
                          onChange={(event) => setLogoConfig({ ...logoConfig, logoWidth: Number(event.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="image-watermark__control-group">
                      <div className="image-watermark__control-row">
                        <label className="image-watermark__control-label" htmlFor="logo-opacity">Opacity</label>
                        <output className="image-watermark__value-text" htmlFor="logo-opacity">{logoConfig.opacity}%</output>
                        <input
                          id="logo-opacity"
                          type="range"
                          className="image-watermark__slider"
                          min={0}
                          max={100}
                          value={logoConfig.opacity}
                          onChange={(event) => setLogoConfig({ ...logoConfig, opacity: Number(event.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="image-watermark__control-group">
                      <div className="image-watermark__control-row">
                        <label className="image-watermark__control-label" htmlFor="logo-rotation">Rotation</label>
                        <output className="image-watermark__value-text" htmlFor="logo-rotation">{logoConfig.rotation}°</output>
                        <input
                          id="logo-rotation"
                          type="range"
                          className="image-watermark__slider"
                          min={-180}
                          max={180}
                          value={logoConfig.rotation}
                          onChange={(event) => setLogoConfig({ ...logoConfig, rotation: Number(event.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="image-watermark__control-group">
                      <label className="image-watermark__control-label">Position</label>
                      <div className="image-watermark__position-selector">
                        {(Object.keys(POSITION_PRESETS) as PositionPreset[]).map((key) => (
                          <button
                            key={key}
                            type="button"
                            className={`image-watermark__position-option${logoConfig.position === key ? ' image-watermark__position-option--active' : ''}`}
                            onClick={() => setLogoConfig({ ...logoConfig, position: key })}
                          >
                            {POSITION_LABELS[key]}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`image-watermark__position-option${logoConfig.position === 'custom' ? ' image-watermark__position-option--active' : ''}`}
                          onClick={() => setLogoConfig({ ...logoConfig, position: 'custom' })}
                        >
                          Custom
                        </button>
                      </div>
                      {logoConfig.position === 'custom' && (
                        <div className="image-watermark__control-row" style={{ marginTop: 12 }}>
                          <label className="image-watermark__control-label" htmlFor="logo-pos-x">Horizontal position</label>
                          <output className="image-watermark__value-text">{logoConfig.positionX}%</output>
                          <input
                            id="logo-pos-x"
                            type="range"
                            className="image-watermark__slider"
                            min={0}
                            max={100}
                            value={logoConfig.positionX}
                            onChange={(event) => setLogoConfig({ ...logoConfig, positionX: Number(event.target.value) })}
                          />
                        </div>
                      )}
                      {logoConfig.position === 'custom' && (
                        <div className="image-watermark__control-row" style={{ marginTop: 12 }}>
                          <label className="image-watermark__control-label" htmlFor="logo-pos-y">Vertical position</label>
                          <output className="image-watermark__value-text">{logoConfig.positionY}%</output>
                          <input
                            id="logo-pos-y"
                            type="range"
                            className="image-watermark__slider"
                            min={0}
                            max={100}
                            value={logoConfig.positionY}
                            onChange={(event) => setLogoConfig({ ...logoConfig, positionY: Number(event.target.value) })}
                          />
                        </div>
                      )}
                    <div className="image-watermark__control-group" style={{ marginTop: 16 }}>
                        <label className="image-watermark__control-label" htmlFor="logo-margin">Margin</label>
                        <input
                          id="logo-margin"
                          className="image-watermark__input"
                          type="number"
                          min={0}
                          max={WATERMARK_LIMITS.MAX_MARGIN}
                          value={logoConfig.margin}
                          onChange={(event) => setLogoConfig({ ...logoConfig, margin: Math.max(0, Number(event.target.value) || 0) })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="image-watermark__control-group">
              <label className="image-watermark__control-label">Repeat watermark</label>
              <div className="image-watermark__repeat-wrapper">
                <input
                  className="image-watermark__checkbox"
                  type="checkbox"
                  checked={mode === 'text' ? textConfig.repeat : logoConfig.repeat}
                  onChange={(event) => {
                    if (mode === 'text') {
                      setTextConfig({ ...textConfig, repeat: event.target.checked });
                    } else {
                      setLogoConfig({ ...logoConfig, repeat: event.target.checked });
                    }
                  }}
                />
                <span className="image-watermark__repeat-label-text">Repeat watermark across the image</span>
              </div>
              {(mode === 'text' ? textConfig.repeat : logoConfig.repeat) && (
                <div className="image-watermark__control-row">
                  <label className="image-watermark__control-label" htmlFor="repeat-spacing">Spacing</label>
                  <output className="image-watermark__value-text">{mode === 'text' ? textConfig.repeatSpacing : logoConfig.repeatSpacing}px</output>
                  <input
                    id="repeat-spacing"
                    type="number"
                    className="image-watermark__input"
                    min={0}
                    value={mode === 'text' ? textConfig.repeatSpacing : logoConfig.repeatSpacing}
                    onChange={(event) => {
                      const val = Math.max(0, Number(event.target.value) || 0);
                      if (mode === 'text') {
                        setTextConfig({ ...textConfig, repeatSpacing: val });
                      } else {
                        setLogoConfig({ ...logoConfig, repeatSpacing: val });
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {originalInfo && (
        <section className="image-watermark__preview-section" aria-labelledby="image-watermark-preview-title">
          <div className="image-watermark__section-heading">
            <div>
              <span className="image-watermark__eyebrow">03 / Preview</span>
              <h2 id="image-watermark-preview-title">Preview</h2>
            </div>
            <div className="image-watermark__toggle-group">
              <button
                type="button"
                className={`image-watermark__toggle${previewView === 'original' ? ' image-watermark__toggle--active' : ''}`}
                onClick={() => setPreviewView('original')}
              >
                <Eye size={14} /> Original
              </button>
              <button
                type="button"
                className={`image-watermark__toggle${previewView === 'watermarked' ? ' image-watermark__toggle--active' : ''}`}
                onClick={() => setPreviewView('watermarked')}
              >
                <Layers size={14} /> Watermarked
              </button>
            </div>
          </div>

          <div className="image-watermark__preview-frame">
            {previewView === 'original' ? (
              <img src={originalPreview ?? undefined} alt={`Original ${originalInfo.file.name}`} className="image-watermark__preview-image" />
            ) : (
              <div className="image-watermark__watermark-view">
                {watermarkedPreview ? (
                  <img src={watermarkedPreview} alt={`Watermarked ${originalInfo.file.name}`} className="image-watermark__preview-image" />
                ) : (
                  <div className="image-watermark__empty-state">
                    <div className="image-watermark__empty-icon"><Layers size={30} /></div>
                    <strong>Watermarked preview</strong>
                    <p>Adjust the watermark settings to see the result here.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="image-watermark__download-section" aria-labelledby="image-watermark-download-title">
        <div className="image-watermark__section-heading">
          <div>
            <span className="image-watermark__eyebrow">04 / Output</span>
            <h2 id="image-watermark-download-title">Download</h2>
          </div>
        </div>

        <div className="image-watermark__format-selector">
          {['png', 'jpeg', 'webp'].map((f) => (
            <button
              key={f}
              type="button"
              className={`image-watermark__format-option${format === f ? ' image-watermark__format-option--active' : ''}`}
              onClick={() => setFormat(f)}
              disabled={processing}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {format === 'jpeg' && (
          <div className="image-watermark__control-group">
            <label className="image-watermark__control-label" htmlFor="watermark-bg">Background color (JPEG)</label>
            <input
              id="watermark-bg"
              type="color"
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value)}
            />
          </div>
        )}

        <label className="image-watermark__control-label" htmlFor="watermark-filename">Download filename</label>
        <input
          id="watermark-filename"
          className="image-watermark__input"
          type="text"
          value={customFilename}
          onChange={(event) => setCustomFilename(event.target.value)}
          placeholder="watermarked-image"
        />
        <p className="image-watermark__hint">.{(getImageExtension(format) || 'png')}</p>

        <button
          type="button"
          className="image-watermark__download-btn"
          onClick={() => void handleDownload()}
          disabled={!canDownload || processing}
        >
          {processing ? <LoaderCircle className="image-watermark__loading-icon" size={16} /> : <Download size={16} />}
          {processing ? 'Watermarking…' : 'Download Watermarked Image'}
        </button>

        {message && (
          <div className={`image-watermark__status image-watermark__status--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            <span>{message.text}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={15} /></button>
          </div>
        )}

        <div className="image-watermark__actions">
          <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={() => inputRef.current?.click()} disabled={processing}>
            <Upload size={16} /> Upload Original Image
          </button>
          {mode === 'logo' && (
            <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={() => logoInputRef.current?.click()} disabled={processing}>
              <Upload size={16} /> Upload Logo
            </button>
          )}
          <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={() => setMode('text')} disabled={processing}>
            <Stamp size={16} /> Select Text Watermark
          </button>
          <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={() => setMode('logo')} disabled={processing}>
            <ImageIcon size={16} /> Select Logo Watermark
          </button>
          <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={handleReset} disabled={processing}>
            <RotateCcw size={16} /> Reset Settings
          </button>
          <button type="button" className="image-watermark__button image-watermark__button--secondary" onClick={clearAll} disabled={processing}>
            <Trash2 size={16} /> Clear All
          </button>
        </div>
      </section>
    </div>
  );
}
