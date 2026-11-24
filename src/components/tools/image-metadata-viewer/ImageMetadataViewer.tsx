import { useRef, useState, useEffect } from 'react';
import {
  Upload,
  X,
  Check,
  Copy,
  Download,
  RotateCcw,
  RefreshCw,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Camera,
  Info,
  Palette,
  Settings,
  FileImage,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import {
  detectFormat,
  formatFileSize,
  extractImageMetadata,
  extractExifMetadata,
  extractColorInfo,
  getPrivacyNotice,
  type ImageMetadata,
  type ExifMetadata,
  type ColorInfo,
} from '../../../utils/imageMetadata';
import './image-metadata-viewer.css';

type TabId = 'overview' | 'technical' | 'exif' | 'gps' | 'color';
type Status = 'idle' | 'reading' | 'ready' | 'error';

interface Feedback {
  kind: 'success' | 'error' | 'info';
  text: string;
}

const ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg';
const MAX_FILE_SIZE = 30 * 1024 * 1024;

function copyToClipboard(text: string): boolean {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    document.body.removeChild(textarea);
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

function formatAspect(width: number | null, height: number | null): string {
  if (!width || !height) return 'Not available';
  const ratio = width / height;
  return ratio.toFixed(4).replace(/\.?0+$/, '');
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'Not available';
  return date.toLocaleString();
}

function buildMetadataText(metadata: ImageMetadata, exif: ExifMetadata | null, colorInfo: ColorInfo | null): string {
  const lines: string[] = [];

  lines.push('Image Metadata Report');
  lines.push('=====================');
  lines.push('');
  lines.push(`File Name: ${metadata.fileName}`);
  lines.push(`File Format: ${metadata.fileFormat}`);
  lines.push(`MIME Type: ${metadata.mimeType}`);
  lines.push(`File Size: ${metadata.fileSizeDisplay} (${metadata.fileSize} bytes)`);
  lines.push(`Width: ${metadata.width ?? 'Not available'} px`);
  lines.push(`Height: ${metadata.height ?? 'Not available'} px`);
  lines.push(`Aspect Ratio: ${formatAspect(metadata.width, metadata.height)}`);
  lines.push(`Color Depth: ${metadata.colorDepth ?? 'Not available'}`);
  lines.push(`Last Modified: ${formatDateTime(metadata.lastModified)}`);
  lines.push(`Transparency: ${metadata.hasTransparency === null ? 'Not available' : metadata.hasTransparency ? 'Yes' : 'No'}`);
  lines.push(`Animation: ${metadata.hasAnimation === null ? 'Not available' : metadata.hasAnimation ? 'Yes' : 'No'}`);
  if (metadata.orientation !== null) lines.push(`Orientation: ${metadata.orientation}`);
  if (metadata.colorModel) lines.push(`Color Model: ${metadata.colorModel}`);
  if (metadata.alphaChannel !== null) lines.push(`Alpha Channel: ${metadata.alphaChannel ? 'Yes' : 'No'}`);

  if (exif) {
    lines.push('');
    lines.push('EXIF Metadata');
    lines.push('-------------');
    if (exif.manufacturer) lines.push(`Camera Manufacturer: ${exif.manufacturer}`);
    if (exif.model) lines.push(`Camera Model: ${exif.model}`);
    if (exif.lens) lines.push(`Lens: ${exif.lens}`);
    if (exif.software) lines.push(`Software: ${exif.software}`);
    if (exif.firmware) lines.push(`Firmware: ${exif.firmware}`);
    if (exif.dateTime) lines.push(`Date/Time: ${exif.dateTime}`);
    if (exif.exposureTime) lines.push(`Exposure Time: ${exif.exposureTime}`);
    if (exif.aperture) lines.push(`Aperture: ${exif.aperture}`);
    if (exif.iso) lines.push(`ISO: ${exif.iso}`);
    if (exif.focalLength) lines.push(`Focal Length: ${exif.focalLength}`);
    if (exif.flash) lines.push(`Flash: ${exif.flash}`);
    if (exif.whiteBalance) lines.push(`White Balance: ${exif.whiteBalance}`);
    if (exif.exposureMode) lines.push(`Exposure Mode: ${exif.exposureMode}`);
    if (exif.meteringMode) lines.push(`Metering Mode: ${exif.meteringMode}`);
    if (exif.orientation !== undefined) lines.push(`Orientation: ${exif.orientation}`);
    if (exif.resolution) lines.push(`Resolution: ${exif.resolution}`);
    if (exif.colorSpace !== undefined) lines.push(`Color Space: ${exif.colorSpace}`);
    if (exif.compression) lines.push(`Compression: ${exif.compression}`);

    if (exif.gpsLatitude !== undefined && exif.gpsLongitude !== undefined) {
      lines.push('');
      lines.push('GPS Information');
      lines.push('---------------');
      lines.push(`Latitude: ${exif.gpsLatitude}`);
      lines.push(`Longitude: ${exif.gpsLongitude}`);
      if (exif.gpsAltitude !== undefined) {
        lines.push(`Altitude: ${exif.gpsAltitude}`);
      }
    }
  } else {
    lines.push('');
    lines.push('EXIF Metadata: No EXIF data available');
  }

  if (colorInfo) {
    lines.push('');
    lines.push('Color Information');
    lines.push('-----------------');
    lines.push(`Average Color: ${colorInfo.averageColor.hex} (${colorInfo.averageColor.rgb})`);
    if (colorInfo.dominantColors.length > 0) {
      lines.push('Dominant Colors:');
      for (const color of colorInfo.dominantColors) {
        lines.push(`  - ${color.hex} (${color.rgb})`);
      }
    }
    lines.push(`Transparency: ${colorInfo.transparency ? 'Detected' : 'Not detected'}`);
  }

  lines.push('');
  lines.push(`Privacy Notice: ${getPrivacyNotice()}`);

  return lines.join('\n');
}

function buildMetadataJson(metadata: ImageMetadata, exif: ExifMetadata | null, colorInfo: ColorInfo | null): string {
  const data: Record<string, unknown> = {
    fileName: metadata.fileName,
    fileFormat: metadata.fileFormat,
    mimeType: metadata.mimeType,
    fileSize: metadata.fileSize,
    fileSizeDisplay: metadata.fileSizeDisplay,
    width: metadata.width,
    height: metadata.height,
    aspectRatio: formatAspect(metadata.width, metadata.height),
    colorDepth: metadata.colorDepth,
    lastModified: metadata.lastModified?.toISOString() ?? null,
    transparency: metadata.hasTransparency,
    animation: metadata.hasAnimation,
    orientation: metadata.orientation,
    colorModel: metadata.colorModel,
    alphaChannel: metadata.alphaChannel,
  };

  if (exif) {
    data.exif = {
      manufacturer: exif.manufacturer,
      model: exif.model,
      lens: exif.lens,
      software: exif.software,
      firmware: exif.firmware,
      dateTime: exif.dateTime,
      exposureTime: exif.exposureTime,
      aperture: exif.aperture,
      iso: exif.iso,
      focalLength: exif.focalLength,
      flash: exif.flash,
      whiteBalance: exif.whiteBalance,
      exposureMode: exif.exposureMode,
      meteringMode: exif.meteringMode,
      orientation: exif.orientation,
      resolution: exif.resolution,
      colorSpace: exif.colorSpace,
      compression: exif.compression,
    };

    if (exif.gpsLatitude !== undefined && exif.gpsLongitude !== undefined) {
      (data.exif as Record<string, unknown>).gps = {
        latitude: exif.gpsLatitude,
        longitude: exif.gpsLongitude,
        altitude: exif.gpsAltitude,
      };
    }
  } else {
    data.exif = null;
  }

  if (colorInfo) {
    data.colorInfo = {
      averageColor: colorInfo.averageColor,
      dominantColors: colorInfo.dominantColors,
      transparency: colorInfo.transparency,
    };
  } else {
    data.colorInfo = null;
  }

  data.privacyNotice = getPrivacyNotice();

  return JSON.stringify(data, null, 2);
}

export default function ImageMetadataViewer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<Set<string>>(new Set());
  const requestRef = useRef(0);

  const [status, setStatus] = useState<Status>('idle');
  const [loaded, setLoaded] = useState<{
    file: File;
    previewUrl: string;
    metadata: ImageMetadata;
    exif: ExifMetadata | null;
    colorInfo: ColorInfo | null;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
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

  const resetTool = () => {
    requestRef.current += 1;
    if (loaded) {
      revokeManagedUrl(loaded.previewUrl);
    }
    setLoaded(null);
    setStatus('idle');
    setError(null);
    setFeedback(null);
    setActiveTab('overview');
    setCopyFeedback(null);
  };

  const loadFile = async (file: File) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (loaded) {
      revokeManagedUrl(loaded.previewUrl);
    }
    setLoaded(null);
    setError(null);
    setFeedback(null);
    setStatus('reading');

    try {
      const format = await detectFormat(file);

      if (format !== 'SVG' && !['PNG', 'JPEG', 'WEBP', 'GIF', 'BMP', 'SVG'].includes(format)) {
        throw new Error(`This file format is not supported. Choose a PNG, JPG, JPEG, WEBP, GIF, BMP, or SVG file.`);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}.`);
      }

      const metadata = await extractImageMetadata(file);

      if (requestRef.current !== requestId) return;

      const exif = await extractExifMetadata(file);

      if (requestRef.current !== requestId) return;

      const colorInfo = await extractColorInfo(file);

      if (requestRef.current !== requestId) return;

      const previewUrl = createManagedUrl(file);
      setLoaded({ file, previewUrl, metadata, exif, colorInfo });
      setStatus('ready');
      setFeedback({ kind: 'success', text: 'Image loaded and metadata extracted successfully.' });
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      setLoaded(null);
      setStatus('error');
      const message = caught instanceof Error ? caught.message : 'The image could not be read. Try another file.';
      setError(message);
      setFeedback({ kind: 'error', text: message });
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void loadFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleCopyValue = (text: string, label: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopyFeedback(`${label} copied to clipboard.`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } else {
      setFeedback({ kind: 'error', text: `Could not copy ${label} to clipboard.` });
    }
  };

  const handleCopyAll = () => {
    if (!loaded) return;
    const text = buildMetadataText(loaded.metadata, loaded.exif, loaded.colorInfo);
    const success = copyToClipboard(text);
    if (success) {
      setFeedback({ kind: 'success', text: 'All metadata copied to clipboard.' });
    } else {
      setFeedback({ kind: 'error', text: 'Could not copy metadata to clipboard.' });
    }
  };

  const handleDownloadJson = () => {
    if (!loaded) return;
    const text = buildMetadataJson(loaded.metadata, loaded.exif, loaded.colorInfo);
    const blob = new Blob([text], { type: 'application/json' });
    const filename = `image-metadata.json`;
    const success = downloadBlob(blob, filename);
    if (success) {
      setFeedback({ kind: 'success', text: `${filename} is ready to download.` });
    } else {
      setFeedback({ kind: 'error', text: 'The JSON download could not be started.' });
    }
  };

  const handleDownloadTxt = () => {
    if (!loaded) return;
    const text = buildMetadataText(loaded.metadata, loaded.exif, loaded.colorInfo);
    const blob = new Blob([text], { type: 'text/plain' });
    const filename = `image-metadata.txt`;
    const success = downloadBlob(blob, filename);
    if (success) {
      setFeedback({ kind: 'success', text: `${filename} is ready to download.` });
    } else {
      setFeedback({ kind: 'error', text: 'The TXT download could not be started.' });
    }
  };

  const metadataValue = (value: string | number | null, suffix = ''): string => {
    if (value === null || value === undefined) return 'Not available';
    return `${value}${suffix}`;
  };

  const hasExifData = loaded?.exif && Object.keys(loaded.exif).length > 0;
  const hasGpsData = loaded?.exif?.gpsLatitude !== undefined && loaded?.exif?.gpsLongitude !== undefined;

  return (
    <div className="image-metadata-viewer">
      <section className="image-metadata-viewer__upload" aria-labelledby="imv-upload-heading">
        <div className="image-metadata-viewer__section-heading">
          <div>
            <span className="image-metadata-viewer__eyebrow">01 / Upload</span>
            <h2 id="imv-upload-heading">Upload Your Image</h2>
            <p>Drag and drop an image or browse your device. Files are processed locally in the browser.</p>
          </div>
          <span className="image-metadata-viewer__local-badge">
            <ShieldCheck size={14} aria-hidden="true" /> Processed locally
          </span>
        </div>

        <div
          className={`image-metadata-viewer__dropzone${dragging ? ' image-metadata-viewer__dropzone--active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={handleDrop}
        >
          <div className="image-metadata-viewer__upload-icon" aria-hidden="true">
            <Upload size={23} />
          </div>
          <div>
            <strong>Drag and drop an image</strong>
            <span>PNG, JPG, JPEG, WEBP, GIF, BMP, SVG · max {formatFileSize(MAX_FILE_SIZE)}</span>
          </div>
          <button
            type="button"
            className="image-metadata-viewer__button image-metadata-viewer__button--secondary"
            onClick={openFilePicker}
          >
            <FileImage size={16} /> Browse Files
          </button>
          <input
            ref={inputRef}
            className="image-metadata-viewer__file-input"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            aria-label="Choose an image file"
            onChange={handleInputChange}
          />
        </div>

        {status === 'reading' && (
          <div className="image-metadata-viewer__reading" role="status" aria-live="polite">
            <LoaderCircle size={16} className="image-metadata-viewer__spinner" aria-hidden="true" />
            <span>Reading and analyzing the image...</span>
          </div>
        )}

        {error && (
          <div className="image-metadata-viewer__message image-metadata-viewer__message--error" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss error" onClick={() => setError(null)}>
              <X size={15} />
            </button>
          </div>
        )}

        {loaded && (
          <div className="image-metadata-viewer__file-summary">
            <div className="image-metadata-viewer__file-summary-main">
              <span className="image-metadata-viewer__file-icon" aria-hidden="true">
                <ImageIcon size={17} />
              </span>
              <div>
                <strong title={loaded.file.name}>{loaded.file.name}</strong>
                <span>
                  {loaded.metadata.fileFormat} · {loaded.metadata.width?.toLocaleString() ?? 'N/A'} × {loaded.metadata.height?.toLocaleString() ?? 'N/A'} px · {loaded.metadata.fileSizeDisplay}
                </span>
              </div>
            </div>
            <div className="image-metadata-viewer__file-summary-actions">
              <button type="button" className="image-metadata-viewer__button image-metadata-viewer__button--secondary" onClick={openFilePicker}>
                <RefreshCw size={14} /> Replace
              </button>
              <button type="button" className="image-metadata-viewer__icon-button" onClick={resetTool} aria-label="Remove image">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {loaded && (
        <>
          <div className="image-metadata-viewer__workspace">
            <section className="image-metadata-viewer__card" aria-labelledby="imv-preview-heading">
              <div className="image-metadata-viewer__section-heading image-metadata-viewer__section-heading--compact">
                <div>
                  <span className="image-metadata-viewer__eyebrow">02 / Preview</span>
                  <h2 id="imv-preview-heading">Image Preview</h2>
                </div>
              </div>

              <div className="image-metadata-viewer__preview">
                <img src={loaded.previewUrl} alt={`Preview of ${loaded.file.name}`} />
              </div>

              <dl className="image-metadata-viewer__details">
                <div>
                  <dt>Filename</dt>
                  <dd title={loaded.file.name}>{loaded.file.name}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>{loaded.metadata.fileFormat}</dd>
                </div>
                <div>
                  <dt>MIME type</dt>
                  <dd>{loaded.metadata.mimeType}</dd>
                </div>
                <div>
                  <dt>Dimensions</dt>
                  <dd>
                    {loaded.metadata.width?.toLocaleString() ?? 'N/A'} × {loaded.metadata.height?.toLocaleString() ?? 'N/A'} px
                  </dd>
                </div>
                <div>
                  <dt>File size</dt>
                  <dd>{loaded.metadata.fileSizeDisplay}</dd>
                </div>
                <div>
                  <dt>Aspect ratio</dt>
                  <dd>{formatAspect(loaded.metadata.width, loaded.metadata.height)}</dd>
                </div>
              </dl>
            </section>

            <section className="image-metadata-viewer__tabs" aria-labelledby="imv-tabs-heading">
              <div className="image-metadata-viewer__section-heading image-metadata-viewer__section-heading--compact">
                <div>
                  <span className="image-metadata-viewer__eyebrow">03 / Inspect</span>
                  <h2 id="imv-tabs-heading">Metadata Details</h2>
                </div>
              </div>

              <div className="image-metadata-viewer__tab-list" role="tablist" aria-label="Metadata categories">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'overview'}
                  className={`image-metadata-viewer__tab${activeTab === 'overview' ? ' image-metadata-viewer__tab--active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <Info size={15} /> Overview
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'technical'}
                  className={`image-metadata-viewer__tab${activeTab === 'technical' ? ' image-metadata-viewer__tab--active' : ''}`}
                  onClick={() => setActiveTab('technical')}
                >
                  <Settings size={15} /> Technical
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'exif'}
                  className={`image-metadata-viewer__tab${activeTab === 'exif' ? ' image-metadata-viewer__tab--active' : ''}`}
                  onClick={() => setActiveTab('exif')}
                >
                  <Camera size={15} /> EXIF
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'gps'}
                  className={`image-metadata-viewer__tab${activeTab === 'gps' ? ' image-metadata-viewer__tab--active' : ''}`}
                  onClick={() => setActiveTab('gps')}
                >
                  <MapPin size={15} /> GPS
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'color'}
                  className={`image-metadata-viewer__tab${activeTab === 'color' ? ' image-metadata-viewer__tab--active' : ''}`}
                  onClick={() => setActiveTab('color')}
                >
                  <Palette size={15} /> Color
                </button>
              </div>

              <div className="image-metadata-viewer__tab-content" role="tabpanel">
                {activeTab === 'overview' && (
                  <div className="image-metadata-viewer__panel">
                    <h3 className="image-metadata-viewer__panel-title">Basic Information</h3>
                    <dl className="image-metadata-viewer__property-grid">
                      <div className="image-metadata-viewer__property">
                        <dt>File Name</dt>
                        <dd title={loaded.metadata.fileName}>{loaded.metadata.fileName}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy file name"
                          onClick={() => handleCopyValue(loaded.metadata.fileName, 'File name')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>File Format</dt>
                        <dd>{loaded.metadata.fileFormat}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy file format"
                          onClick={() => handleCopyValue(loaded.metadata.fileFormat, 'File format')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>MIME Type</dt>
                        <dd>{loaded.metadata.mimeType}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy MIME type"
                          onClick={() => handleCopyValue(loaded.metadata.mimeType, 'MIME type')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>File Size</dt>
                        <dd>
                          {loaded.metadata.fileSizeDisplay}
                          <span className="image-metadata-viewer__property-sub">({loaded.metadata.fileSize.toLocaleString()} bytes)</span>
                        </dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy file size"
                          onClick={() => handleCopyValue(String(loaded.metadata.fileSize), 'File size')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Width</dt>
                        <dd>{metadataValue(loaded.metadata.width, ' px')}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy width"
                          onClick={() => handleCopyValue(String(loaded.metadata.width ?? ''), 'Width')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Height</dt>
                        <dd>{metadataValue(loaded.metadata.height, ' px')}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy height"
                          onClick={() => handleCopyValue(String(loaded.metadata.height ?? ''), 'Height')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Aspect Ratio</dt>
                        <dd>{formatAspect(loaded.metadata.width, loaded.metadata.height)}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy aspect ratio"
                          onClick={() => handleCopyValue(formatAspect(loaded.metadata.width, loaded.metadata.height), 'Aspect ratio')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Color Depth</dt>
                        <dd>{metadataValue(loaded.metadata.colorDepth, ' bits')}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy color depth"
                          onClick={() => handleCopyValue(String(loaded.metadata.colorDepth ?? ''), 'Color depth')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Last Modified</dt>
                        <dd>{formatDateTime(loaded.metadata.lastModified)}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy last modified"
                          onClick={() => handleCopyValue(formatDateTime(loaded.metadata.lastModified), 'Last modified')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Transparency</dt>
                        <dd>{metadataValue(loaded.metadata.hasTransparency === null ? null : loaded.metadata.hasTransparency ? 'Yes' : 'No')}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy transparency"
                          onClick={() => handleCopyValue(loaded.metadata.hasTransparency === null ? '' : String(loaded.metadata.hasTransparency), 'Transparency')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Animation</dt>
                        <dd>{metadataValue(loaded.metadata.hasAnimation === null ? null : loaded.metadata.hasAnimation ? 'Yes' : 'No')}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy animation"
                          onClick={() => handleCopyValue(loaded.metadata.hasAnimation === null ? '' : String(loaded.metadata.hasAnimation), 'Animation')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </dl>
                  </div>
                )}

                {activeTab === 'technical' && (
                  <div className="image-metadata-viewer__panel">
                    <h3 className="image-metadata-viewer__panel-title">Technical Properties</h3>
                    <dl className="image-metadata-viewer__property-grid">
                      <div className="image-metadata-viewer__property">
                        <dt>Pixel Dimensions</dt>
                        <dd>
                          {loaded.metadata.width?.toLocaleString() ?? 'N/A'} × {loaded.metadata.height?.toLocaleString() ?? 'N/A'} px
                        </dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy dimensions"
                          onClick={() =>
                            handleCopyValue(
                              `${loaded.metadata.width ?? ''} × ${loaded.metadata.height ?? ''} px`,
                              'Pixel dimensions',
                            )
                          }
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Aspect Ratio</dt>
                        <dd>{formatAspect(loaded.metadata.width, loaded.metadata.height)}</dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy aspect ratio"
                          onClick={() => handleCopyValue(formatAspect(loaded.metadata.width, loaded.metadata.height), 'Aspect ratio')}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      {loaded.metadata.orientation !== null && (
                        <div className="image-metadata-viewer__property">
                          <dt>Orientation</dt>
                          <dd>{loaded.metadata.orientation}</dd>
                          <button
                            type="button"
                            className="image-metadata-viewer__copy-btn"
                            aria-label="Copy orientation"
                            onClick={() => handleCopyValue(String(loaded.metadata.orientation), 'Orientation')}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}
                      {loaded.metadata.colorModel && (
                        <div className="image-metadata-viewer__property">
                          <dt>Color Model</dt>
                          <dd>{loaded.metadata.colorModel}</dd>
                          <button
                            type="button"
                            className="image-metadata-viewer__copy-btn"
                            aria-label="Copy color model"
                            onClick={() => handleCopyValue(loaded.metadata.colorModel ?? '', 'Color model')}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}
                      {loaded.metadata.colorDepth !== null && (
                        <div className="image-metadata-viewer__property">
                          <dt>Color Depth</dt>
                          <dd>{loaded.metadata.colorDepth} bits</dd>
                          <button
                            type="button"
                            className="image-metadata-viewer__copy-btn"
                            aria-label="Copy color depth"
                            onClick={() => handleCopyValue(String(loaded.metadata.colorDepth), 'Color depth')}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}
                      {loaded.metadata.alphaChannel !== null && (
                        <div className="image-metadata-viewer__property">
                          <dt>Alpha Channel</dt>
                          <dd>{loaded.metadata.alphaChannel ? 'Present' : 'Absent'}</dd>
                          <button
                            type="button"
                            className="image-metadata-viewer__copy-btn"
                            aria-label="Copy alpha channel"
                            onClick={() => handleCopyValue(String(loaded.metadata.alphaChannel), 'Alpha channel')}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}
                      <div className="image-metadata-viewer__property">
                        <dt>Transparency</dt>
                        <dd>
                          {loaded.metadata.hasTransparency === null
                            ? 'Not available'
                            : loaded.metadata.hasTransparency
                              ? 'Detected'
                              : 'Not detected'}
                        </dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy transparency"
                          onClick={() =>
                            handleCopyValue(
                              loaded.metadata.hasTransparency === null ? '' : String(loaded.metadata.hasTransparency),
                              'Transparency',
                            )
                          }
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="image-metadata-viewer__property">
                        <dt>Animation</dt>
                        <dd>
                          {loaded.metadata.hasAnimation === null
                            ? 'Not available'
                            : loaded.metadata.hasAnimation
                              ? 'Animated'
                              : 'Static'}
                        </dd>
                        <button
                          type="button"
                          className="image-metadata-viewer__copy-btn"
                          aria-label="Copy animation"
                          onClick={() =>
                            handleCopyValue(
                              loaded.metadata.hasAnimation === null ? '' : String(loaded.metadata.hasAnimation),
                              'Animation',
                            )
                          }
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </dl>
                    {loaded.metadata.width !== null && loaded.metadata.height !== null && loaded.metadata.width * loaded.metadata.height > 80_000_000 && (
                      <p className="image-metadata-viewer__hint">
                        This image exceeds 80 million pixels. Browser processing may be slow or memory-intensive.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'exif' && (
                  <div className="image-metadata-viewer__panel">
                    <h3 className="image-metadata-viewer__panel-title">EXIF Metadata</h3>
                    {hasExifData ? (
                      <>
                        <div className="image-metadata-viewer__section-group">
                          <h4 className="image-metadata-viewer__section-group-title">Camera Information</h4>
                          <dl className="image-metadata-viewer__property-grid">
                            {loaded.exif?.manufacturer && (
                              <div className="image-metadata-viewer__property">
                                <dt>Manufacturer</dt>
                                <dd>{loaded.exif.manufacturer}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy manufacturer"
                                  onClick={() => handleCopyValue(loaded.exif?.manufacturer ?? '', 'Manufacturer')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.model && (
                              <div className="image-metadata-viewer__property">
                                <dt>Model</dt>
                                <dd>{loaded.exif.model}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy model"
                                  onClick={() => handleCopyValue(loaded.exif?.model ?? '', 'Model')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.lens && (
                              <div className="image-metadata-viewer__property">
                                <dt>Lens</dt>
                                <dd>{loaded.exif.lens}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy lens"
                                  onClick={() => handleCopyValue(loaded.exif?.lens ?? '', 'Lens')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.software && (
                              <div className="image-metadata-viewer__property">
                                <dt>Software</dt>
                                <dd>{loaded.exif.software}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy software"
                                  onClick={() => handleCopyValue(loaded.exif?.software ?? '', 'Software')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.firmware && (
                              <div className="image-metadata-viewer__property">
                                <dt>Firmware</dt>
                                <dd>{loaded.exif.firmware}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy firmware"
                                  onClick={() => handleCopyValue(loaded.exif?.firmware ?? '', 'Firmware')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div className="image-metadata-viewer__section-group">
                          <h4 className="image-metadata-viewer__section-group-title">Capture Information</h4>
                          <dl className="image-metadata-viewer__property-grid">
                            {loaded.exif?.dateTime && (
                              <div className="image-metadata-viewer__property">
                                <dt>Date/Time</dt>
                                <dd>{loaded.exif.dateTime}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy date/time"
                                  onClick={() => handleCopyValue(loaded.exif?.dateTime ?? '', 'Date/Time')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.exposureTime && (
                              <div className="image-metadata-viewer__property">
                                <dt>Exposure Time</dt>
                                <dd>{loaded.exif.exposureTime}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy exposure time"
                                  onClick={() => handleCopyValue(loaded.exif?.exposureTime ?? '', 'Exposure time')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.aperture && (
                              <div className="image-metadata-viewer__property">
                                <dt>Aperture</dt>
                                <dd>{loaded.exif.aperture}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy aperture"
                                  onClick={() => handleCopyValue(loaded.exif?.aperture ?? '', 'Aperture')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.iso && (
                              <div className="image-metadata-viewer__property">
                                <dt>ISO</dt>
                                <dd>{loaded.exif.iso}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy ISO"
                                  onClick={() => handleCopyValue(loaded.exif?.iso ?? '', 'ISO')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.focalLength && (
                              <div className="image-metadata-viewer__property">
                                <dt>Focal Length</dt>
                                <dd>{loaded.exif.focalLength}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy focal length"
                                  onClick={() => handleCopyValue(loaded.exif?.focalLength ?? '', 'Focal length')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.flash && (
                              <div className="image-metadata-viewer__property">
                                <dt>Flash</dt>
                                <dd>{loaded.exif.flash}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy flash"
                                  onClick={() => handleCopyValue(loaded.exif?.flash ?? '', 'Flash')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.whiteBalance && (
                              <div className="image-metadata-viewer__property">
                                <dt>White Balance</dt>
                                <dd>{loaded.exif.whiteBalance}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy white balance"
                                  onClick={() => handleCopyValue(loaded.exif?.whiteBalance ?? '', 'White balance')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.exposureMode && (
                              <div className="image-metadata-viewer__property">
                                <dt>Exposure Mode</dt>
                                <dd>{loaded.exif.exposureMode}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy exposure mode"
                                  onClick={() => handleCopyValue(loaded.exif?.exposureMode ?? '', 'Exposure mode')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.meteringMode && (
                              <div className="image-metadata-viewer__property">
                                <dt>Metering Mode</dt>
                                <dd>{loaded.exif.meteringMode}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy metering mode"
                                  onClick={() => handleCopyValue(loaded.exif?.meteringMode ?? '', 'Metering mode')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div className="image-metadata-viewer__section-group">
                          <h4 className="image-metadata-viewer__section-group-title">Image Information</h4>
                          <dl className="image-metadata-viewer__property-grid">
                            {loaded.exif?.orientation !== undefined && (
                              <div className="image-metadata-viewer__property">
                                <dt>Orientation</dt>
                                <dd>{loaded.exif.orientation}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy orientation"
                                  onClick={() => handleCopyValue(String(loaded.exif?.orientation), 'Orientation')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.resolution && (
                              <div className="image-metadata-viewer__property">
                                <dt>Resolution</dt>
                                <dd>{loaded.exif.resolution}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy resolution"
                                  onClick={() => handleCopyValue(loaded.exif?.resolution ?? '', 'Resolution')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.colorSpace !== undefined && (
                              <div className="image-metadata-viewer__property">
                                <dt>Color Space</dt>
                                <dd>{loaded.exif.colorSpace}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy color space"
                                  onClick={() => handleCopyValue(String(loaded.exif?.colorSpace), 'Color space')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                            {loaded.exif?.compression && (
                              <div className="image-metadata-viewer__property">
                                <dt>Compression</dt>
                                <dd>{loaded.exif.compression}</dd>
                                <button
                                  type="button"
                                  className="image-metadata-viewer__copy-btn"
                                  aria-label="Copy compression"
                                  onClick={() => handleCopyValue(loaded.exif?.compression ?? '', 'Compression')}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </dl>
                        </div>
                      </>
                    ) : (
                      <div className="image-metadata-viewer__empty-state">
                        <div className="image-metadata-viewer__empty-icon">
                          <Camera size={24} />
                        </div>
                        <strong>No EXIF metadata found</strong>
                        <p>This image does not contain EXIF metadata or the format does not support EXIF data.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'gps' && (
                  <div className="image-metadata-viewer__panel">
                    <h3 className="image-metadata-viewer__panel-title">GPS Information</h3>
                    {hasGpsData ? (
                      <>
                        <div className="image-metadata-viewer__gps-warning">
                          <AlertTriangle size={16} aria-hidden="true" />
                          <span>
                            GPS metadata may contain personal location data. Be cautious when sharing images that contain GPS information publicly.
                          </span>
                        </div>
                        <dl className="image-metadata-viewer__property-grid">
                          <div className="image-metadata-viewer__property">
                            <dt>Latitude</dt>
                            <dd>{loaded.exif?.gpsLatitude}</dd>
                            <button
                              type="button"
                              className="image-metadata-viewer__copy-btn"
                              aria-label="Copy latitude"
                              onClick={() => handleCopyValue(String(loaded.exif?.gpsLatitude ?? ''), 'Latitude')}
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          <div className="image-metadata-viewer__property">
                            <dt>Longitude</dt>
                            <dd>{loaded.exif?.gpsLongitude}</dd>
                            <button
                              type="button"
                              className="image-metadata-viewer__copy-btn"
                              aria-label="Copy longitude"
                              onClick={() => handleCopyValue(String(loaded.exif?.gpsLongitude ?? ''), 'Longitude')}
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          {loaded.exif?.gpsAltitude !== undefined && (
                            <div className="image-metadata-viewer__property">
                              <dt>Altitude</dt>
                              <dd>{loaded.exif.gpsAltitude}</dd>
                              <button
                                type="button"
                                className="image-metadata-viewer__copy-btn"
                                aria-label="Copy altitude"
                                onClick={() => handleCopyValue(String(loaded.exif?.gpsAltitude), 'Altitude')}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          )}
                        </dl>
                      </>
                    ) : (
                      <div className="image-metadata-viewer__empty-state">
                        <div className="image-metadata-viewer__empty-icon">
                          <MapPin size={24} />
                        </div>
                        <strong>No GPS information available</strong>
                        <p>This image does not contain GPS location metadata, or the format does not support GPS data.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'color' && (
                  <div className="image-metadata-viewer__panel">
                    <h3 className="image-metadata-viewer__panel-title">Color Information</h3>
                    {loaded.colorInfo ? (
                      <>
                        <div className="image-metadata-viewer__color-average">
                          <label>Average Color</label>
                          <div className="image-metadata-viewer__color-swatch-large" style={{ backgroundColor: loaded.colorInfo.averageColor.hex }} />
                          <div className="image-metadata-viewer__color-details">
                            <span className="image-metadata-viewer__color-hex">{loaded.colorInfo.averageColor.hex}</span>
                            <span className="image-metadata-viewer__color-rgb">{loaded.colorInfo.averageColor.rgb}</span>
                            <button
                              type="button"
                              className="image-metadata-viewer__copy-btn"
                              aria-label="Copy hex color"
                              onClick={() => handleCopyValue(loaded.colorInfo?.averageColor.hex ?? '', 'Hex color')}
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              className="image-metadata-viewer__copy-btn"
                              aria-label="Copy RGB color"
                              onClick={() => handleCopyValue(loaded.colorInfo?.averageColor.rgb ?? '', 'RGB color')}
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>

                        {loaded.colorInfo.dominantColors.length > 0 && (
                          <>
                            <h4 className="image-metadata-viewer__section-group-title">Dominant Colors</h4>
                            <div className="image-metadata-viewer__color-palette">
                              {loaded.colorInfo.dominantColors.map((color, index) => (
                                <div key={index} className="image-metadata-viewer__color-item">
                                  <div className="image-metadata-viewer__color-swatch" style={{ backgroundColor: color.hex }} />
                                  <div className="image-metadata-viewer__color-item-details">
                                    <span className="image-metadata-viewer__color-hex">{color.hex}</span>
                                    <span className="image-metadata-viewer__color-rgb">{color.rgb}</span>
                                    <button
                                      type="button"
                                      className="image-metadata-viewer__copy-btn"
                                      aria-label={`Copy hex ${color.hex}`}
                                      onClick={() => handleCopyValue(color.hex, 'Hex color')}
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="image-metadata-viewer__copy-btn"
                                      aria-label={`Copy RGB ${color.rgb}`}
                                      onClick={() => handleCopyValue(color.rgb, 'RGB color')}
                                    >
                                      <Copy size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        <div className="image-metadata-viewer__property">
                          <dt>Transparency</dt>
                          <dd>{loaded.colorInfo.transparency ? 'Detected' : 'Not detected'}</dd>
                          <button
                            type="button"
                            className="image-metadata-viewer__copy-btn"
                            aria-label="Copy transparency"
                            onClick={() => handleCopyValue(String(loaded.colorInfo?.transparency), 'Transparency')}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="image-metadata-viewer__empty-state">
                        <div className="image-metadata-viewer__empty-icon">
                          <Palette size={24} />
                        </div>
                        <strong>Color information unavailable</strong>
                        <p>Color sampling is not available for this image format or the image could not be analyzed.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {copyFeedback && (
                <div className="image-metadata-viewer__copy-feedback" role="status">
                  <Check size={14} />
                  <span>{copyFeedback}</span>
                </div>
              )}
            </section>
          </div>

          <section className="image-metadata-viewer__actions" aria-labelledby="imv-actions-heading">
            <div className="image-metadata-viewer__section-heading">
              <div>
                <span className="image-metadata-viewer__eyebrow">04 / Export</span>
                <h2 id="imv-actions-heading">Copy & Export</h2>
              </div>
            </div>

            <div className="image-metadata-viewer__action-buttons">
              <button
                type="button"
                className="image-metadata-viewer__button image-metadata-viewer__button--secondary"
                onClick={handleCopyAll}
              >
                <Copy size={16} /> Copy All Metadata
              </button>
              <button
                type="button"
                className="image-metadata-viewer__button image-metadata-viewer__button--secondary"
                onClick={handleDownloadJson}
              >
                <Download size={16} /> Download JSON
              </button>
              <button
                type="button"
                className="image-metadata-viewer__button image-metadata-viewer__button--secondary"
                onClick={handleDownloadTxt}
              >
                <Download size={16} /> Download TXT
              </button>
              <button
                type="button"
                className="image-metadata-viewer__button image-metadata-viewer__button--secondary"
                onClick={resetTool}
              >
                <RotateCcw size={16} /> Reset Tool
              </button>
            </div>

            {feedback && (
              <div
                className={`image-metadata-viewer__message image-metadata-viewer__message--${feedback.kind}`}
                role={feedback.kind === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                <span>
                  {feedback.kind === 'success' && <Check size={15} aria-hidden="true" />}
                  {feedback.kind === 'info' && <Info size={15} aria-hidden="true" />}
                  {feedback.text}
                </span>
                <button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}>
                  <X size={15} />
                </button>
              </div>
            )}
          </section>

          <div className="image-metadata-viewer__privacy-notice">
            <ShieldCheck size={16} aria-hidden="true" />
            <p>{getPrivacyNotice()}</p>
          </div>
        </>
      )}
    </div>
  );
}