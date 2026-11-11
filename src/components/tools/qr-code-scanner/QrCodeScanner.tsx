import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Clipboard,
  Download,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  decodeQrImage,
  describeQrContent,
  makeHistoryEntry,
  MAX_QR_IMAGE_BYTES,
  QR_HISTORY_LIMIT,
  readQrHistory,
  writeQrHistory,
  type ScanHistoryEntry,
  type ScanMethod,
} from '../../../utils/qrCodeScanner';
import useQrScanner from './useQrScanner';
import './qr-code-scanner.css';

type ScanResult = {
  content: string;
  method: ScanMethod;
  scannedAt: string;
};

type Feedback = { message: string; kind: 'success' | 'error' | 'warning' } | null;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

export default function QrCodeScanner() {
  const [activeTab, setActiveTab] = useState<'camera' | 'image'>('camera');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [historyLoad] = useState(readQrHistory);
  const [history, setHistory] = useState<ScanHistoryEntry[]>(historyLoad.entries);
  const [feedback, setFeedback] = useState<Feedback>(
    historyLoad.error ? { message: historyLoad.error, kind: 'warning' } : null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [cameraAccessNote, setCameraAccessNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef(historyLoad.entries);

  const onCameraDetected = (content: string) => {
    saveScan(content, 'camera');
  };

  const {
    status: cameraStatus,
    cameraError,
    cameras,
    selectedCameraId,
    startCamera,
    stopCamera,
    switchCamera,
  } = useQrScanner(videoRef, onCameraDetected);

  function showFeedback(message: string, kind: NonNullable<Feedback>['kind']) {
    setFeedback({ message, kind });
  }

  function saveScan(content: string, method: ScanMethod) {
    if (!content) {
      showFeedback('The QR code contained no readable content.', 'error');
      return;
    }
    const scannedAt = new Date().toISOString();
    setResult({ content, method, scannedAt });

    if (historyRef.current.some((entry) => entry.content === content)) return;
    const next = [makeHistoryEntry(content, method), ...historyRef.current].slice(0, QR_HISTORY_LIMIT);
    historyRef.current = next;
    setHistory(next);
    const storageError = writeQrHistory(next);
    if (storageError) showFeedback(storageError, 'warning');
  }

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function clearResult() {
    setResult(null);
    setFeedback(null);
  }

  function handleTabChange(tab: 'camera' | 'image') {
    if (tab !== activeTab) stopCamera();
    setActiveTab(tab);
    setFeedback(null);
  }

  async function handleStartCamera() {
    if (!window.isSecureContext) {
      setCameraAccessNote('Your browser blocks camera access on insecure pages. Open ToolBox over HTTPS or localhost.');
    } else {
      setCameraAccessNote('');
    }
    setResult(null);
    await startCamera(selectedCameraId || undefined);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const supported = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      || /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!supported) {
      setImageError('Unsupported file type. Choose a PNG, JPG, JPEG, or WEBP image.');
      return;
    }
    if (file.size > MAX_QR_IMAGE_BYTES) {
      setImageError('This image is larger than 25 MB. Choose a smaller image and try again.');
      return;
    }
    if (file.size === 0) {
      setImageError('This image file is empty or invalid.');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
    setSelectedFile(file);
    setImageError('');
    setResult(null);
    setFeedback(null);
  }

  async function scanSelectedImage() {
    if (!selectedFile || isDecodingImage) return;
    setIsDecodingImage(true);
    setImageError('');
    setResult(null);
    setFeedback(null);
    try {
      const content = await decodeQrImage(selectedFile);
      if (!content) {
        setImageError('The QR code contained no readable content. Try a clearer image.');
      } else {
        saveScan(content, 'image');
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'The image could not be scanned. Try another image.');
    } finally {
      setIsDecodingImage(false);
    }
  }

  async function copyContent(content: string, description = 'QR content') {
    try {
      await navigator.clipboard.writeText(content);
      showFeedback(`${description} copied to the clipboard.`, 'success');
    } catch {
      showFeedback('Could not copy. Check clipboard permissions and try again.', 'error');
    }
  }

  function exportResult(content: string) {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'toolbox-qr-scan.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showFeedback('TXT export started.', 'success');
    } catch {
      showFeedback('Could not export the scan result in this browser.', 'error');
    }
  }

  function openWebsite(url: string) {
    const detail = describeQrContent(result?.content ?? '');
    if (detail.websiteUrl !== url) {
      showFeedback('This link could not be verified and was not opened.', 'error');
      return;
    }

    const warning = detail.warning
      ? `\n\nWarning: ${detail.warning}\n\nOnly continue if you trust this destination.`
      : '';
    if (!window.confirm(`Open this QR code link?\n\n${url}${warning}`)) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  }

  function removeHistoryEntry(id: string) {
    const next = historyRef.current.filter((entry) => entry.id !== id);
    historyRef.current = next;
    setHistory(next);
    const storageError = writeQrHistory(next);
    if (storageError) showFeedback(storageError, 'warning');
  }

  function clearHistory() {
    if (!history.length || !window.confirm('Clear all locally stored QR scan history? This cannot be undone.')) return;
    historyRef.current = [];
    setHistory([]);
    const storageError = writeQrHistory([]);
    showFeedback(storageError || 'Local scan history cleared.', storageError ? 'warning' : 'success');
  }

  function scanAgain() {
    const method = result?.method;
    clearResult();
    if (method === 'camera') {
      setActiveTab('camera');
      void startCamera();
    } else if (method === 'image' && selectedFile) {
      setActiveTab('image');
      void scanSelectedImage();
    } else {
      setActiveTab(method ?? 'camera');
    }
  }

  const contentDetails = result ? describeQrContent(result.content) : null;

  return (
    <div className="qr-scanner">
      <section className="qr-scanner__card" aria-labelledby="qr-scanner-heading">
        <div className="qr-scanner__section-heading">
          <div>
            <span className="qr-scanner__eyebrow">Tool 31</span>
            <h2 id="qr-scanner-heading">Scan a QR code</h2>
          </div>
          <span className="qr-scanner__privacy"><span aria-hidden="true" /> Processed on this device</span>
        </div>

        <div className="qr-scanner__tabs" role="tablist" aria-label="QR scanning method">
          <button
            type="button"
            role="tab"
            id="qr-camera-tab"
            aria-selected={activeTab === 'camera'}
            aria-controls="qr-camera-panel"
            className={`qr-scanner__tab${activeTab === 'camera' ? ' qr-scanner__tab--active' : ''}`}
            onClick={() => handleTabChange('camera')}
          >
            <Camera size={17} /> Camera Scanner
          </button>
          <button
            type="button"
            role="tab"
            id="qr-image-tab"
            aria-selected={activeTab === 'image'}
            aria-controls="qr-image-panel"
            className={`qr-scanner__tab${activeTab === 'image' ? ' qr-scanner__tab--active' : ''}`}
            onClick={() => handleTabChange('image')}
          >
            <ImageIcon size={17} /> Upload Image
          </button>
        </div>

        <div
          id="qr-camera-panel"
          role="tabpanel"
          aria-labelledby="qr-camera-tab"
          hidden={activeTab !== 'camera'}
          className="qr-scanner__panel"
        >
          <div className="qr-scanner__camera">
            <video ref={videoRef} className="qr-scanner__video" muted playsInline aria-label="Live camera preview" />
            {cameraStatus !== 'scanning' && (
              <div className="qr-scanner__camera-placeholder">
                <Camera size={34} aria-hidden="true" />
                <strong>{cameraStatus === 'starting' ? 'Waiting for camera permission…' : 'Camera preview will appear here'}</strong>
                <span>Your camera is only accessed after you select Start Camera.</span>
              </div>
            )}
          </div>
          <div className="qr-scanner__camera-controls">
            {cameras.length > 1 && (
              <label className="qr-scanner__camera-select">
                Camera
                <select
                  aria-label="Select camera"
                  value={selectedCameraId}
                  onChange={(event) => void switchCamera(event.target.value)}
                  disabled={cameraStatus === 'starting'}
                >
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>{camera.label}</option>
                  ))}
                </select>
              </label>
            )}
            {cameraStatus !== 'idle' ? (
              <button type="button" className="qr-scanner__button qr-scanner__button--secondary" onClick={stopCamera}>
                <X size={16} /> {cameraStatus === 'starting' ? 'Cancel Request' : 'Stop Camera'}
              </button>
            ) : (
              <button
                type="button"
                className="qr-scanner__button qr-scanner__button--primary"
                onClick={() => void handleStartCamera()}
                disabled={cameraStatus === 'starting'}
              >
                <Camera size={16} /> {cameraStatus === 'starting' ? 'Starting…' : 'Start Camera'}
              </button>
            )}
          </div>
          {(cameraError || cameraAccessNote) && (
            <p className="qr-scanner__message qr-scanner__message--error" role="alert">
              <AlertTriangle size={16} />
              <span>{cameraError || cameraAccessNote}</span>
            </p>
          )}
          {cameraStatus === 'scanning' && (
            <p className="qr-scanner__hint" role="status">Scanning live camera frames for one QR code…</p>
          )}
          <p className="qr-scanner__hint">
            Point the camera at one QR code. Scanning stops after the first code is detected.
          </p>
        </div>

        <div
          id="qr-image-panel"
          role="tabpanel"
          aria-labelledby="qr-image-tab"
          hidden={activeTab !== 'image'}
          className="qr-scanner__panel"
        >
          {!selectedFile ? (
            <div
              className={`qr-scanner__dropzone${isDragging ? ' qr-scanner__dropzone--active' : ''}`}
              role="group"
              tabIndex={0}
              aria-label="Choose an image containing a QR code"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void handleFile(event.dataTransfer.files[0]);
              }}
            >
              <span className="qr-scanner__upload-icon"><Upload size={23} /></span>
              <strong>Drop an image here or browse files</strong>
              <span>PNG, JPG, JPEG, or WEBP · maximum 25 MB</span>
              <button
                type="button"
                className="qr-scanner__button qr-scanner__button--primary"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                className="qr-scanner__file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                aria-label="Choose QR code image"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </div>
          ) : (
            <div className="qr-scanner__image-review">
              <div className="qr-scanner__image-preview">
                {imagePreview && <img src={imagePreview} alt={`Selected QR code image: ${selectedFile.name}`} />}
              </div>
              <div className="qr-scanner__image-meta">
                <strong title={selectedFile.name}>{selectedFile.name}</strong>
                <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Processed locally</span>
              </div>
              <div className="qr-scanner__actions">
                <button
                  type="button"
                  className="qr-scanner__button qr-scanner__button--primary"
                  onClick={() => void scanSelectedImage()}
                  disabled={isDecodingImage}
                >
                  <ImageIcon size={16} /> {isDecodingImage ? 'Scanning…' : 'Scan Image'}
                </button>
                <button
                  type="button"
                  className="qr-scanner__button qr-scanner__button--secondary"
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview('');
                    setImageError('');
                    clearResult();
                  }}
                  disabled={isDecodingImage}
                >
                  <Trash2 size={16} /> Remove Image
                </button>
              </div>
            </div>
          )}
          <p className="qr-scanner__hint">
            One QR code is decoded per image. Other QR codes in the same image are not detected.
          </p>
          {imageError && <p className="qr-scanner__message qr-scanner__message--error" role="alert">{imageError}</p>}
        </div>
      </section>

      {result && contentDetails && (
        <section className="qr-scanner__card qr-scanner__result" aria-labelledby="qr-result-heading">
          <div className="qr-scanner__section-heading">
            <div>
              <span className="qr-scanner__eyebrow">Scan complete</span>
              <h2 id="qr-result-heading">Decoded result</h2>
            </div>
            <span className="qr-scanner__status"><Check size={14} /> Successful</span>
          </div>
          <dl className="qr-scanner__metadata">
            <div><dt>Content type</dt><dd>{contentDetails.label}</dd></div>
            <div><dt>Scan method</dt><dd>{result.method === 'camera' ? 'Camera' : 'Uploaded image'}</dd></div>
            <div><dt>Scanned</dt><dd>{formatDate(result.scannedAt)}</dd></div>
          </dl>
          <pre className="qr-scanner__content" aria-label="Decoded QR code content">{result.content}</pre>
          {contentDetails.wifi && (
            <div className="qr-scanner__wifi">
              <strong>Wi-Fi network details</strong>
              <span>Network: {contentDetails.wifi.name}</span>
              <span>Security: {contentDetails.wifi.security}</span>
              {contentDetails.wifi.hidden && <span>Hidden network</span>}
              <span>For your safety, this scanner will not connect to the network.</span>
            </div>
          )}
          {contentDetails.warning && (
            <p className="qr-scanner__message qr-scanner__message--warning">
              <AlertTriangle size={16} /><span>{contentDetails.warning}</span>
            </p>
          )}
          <div className="qr-scanner__actions">
            <button type="button" className="qr-scanner__button qr-scanner__button--primary" onClick={() => void copyContent(result.content)}>
              <Clipboard size={16} /> {contentDetails.wifi ? 'Copy Wi-Fi Info' : 'Copy Content'}
            </button>
            {contentDetails.websiteUrl && (
              <button type="button" className="qr-scanner__button qr-scanner__button--secondary" onClick={() => openWebsite(contentDetails.websiteUrl!)}>
                Open Link
              </button>
            )}
            <button type="button" className="qr-scanner__button qr-scanner__button--secondary" onClick={() => exportResult(result.content)}>
              <Download size={16} /> Export TXT
            </button>
            <button type="button" className="qr-scanner__button qr-scanner__button--secondary" onClick={scanAgain}>
              <RefreshCw size={16} /> Scan Again
            </button>
            <button type="button" className="qr-scanner__button qr-scanner__button--text" onClick={clearResult}>
              <X size={16} /> Clear Result
            </button>
          </div>
        </section>
      )}

      {feedback && (
        <p className={`qr-scanner__feedback qr-scanner__feedback--${feedback.kind}`} role="status">
          {feedback.message}
        </p>
      )}

      <section className="qr-scanner__card" aria-labelledby="qr-history-heading">
        <div className="qr-scanner__section-heading">
          <div>
            <span className="qr-scanner__eyebrow">Stored on this device only</span>
            <h2 id="qr-history-heading">Recent scans</h2>
          </div>
          {history.length > 0 && (
            <button type="button" className="qr-scanner__button qr-scanner__button--text" onClick={clearHistory}>
              <Trash2 size={15} /> Clear History
            </button>
          )}
        </div>
        <p className="qr-scanner__hint qr-scanner__hint--history">
          Up to {QR_HISTORY_LIMIT} successful scans are kept in this browser’s local storage. No scan history is sent to a server.
        </p>
        {history.length === 0 ? (
          <div className="qr-scanner__empty">
            <ImageIcon size={24} aria-hidden="true" />
            <strong>No scans yet</strong>
            <span>Successfully decoded QR codes will appear here.</span>
          </div>
        ) : (
          <ul className="qr-scanner__history">
            {history.map((entry) => (
              <li key={entry.id} className="qr-scanner__history-entry">
                <div className="qr-scanner__history-copy">
                  <p title={entry.content}>{entry.content}</p>
                  <span>{formatDate(entry.scannedAt)} · {entry.method === 'camera' ? 'Camera' : 'Image'}</span>
                </div>
                <div className="qr-scanner__history-actions">
                  <button type="button" aria-label="Copy previous scan" title="Copy" onClick={() => void copyContent(entry.content, 'Previous scan')}>
                    <Clipboard size={15} />
                  </button>
                  <button type="button" aria-label="Remove previous scan" title="Remove" onClick={() => removeHistoryEntry(entry.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
