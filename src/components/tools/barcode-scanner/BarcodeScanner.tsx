import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
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
  BARCODE_HISTORY_LIMIT,
  MAX_BARCODE_IMAGE_BYTES,
  checkRetailBarcodeDigit,
  decodeBarcodeImage,
  makeBarcodeHistoryEntry,
  readBarcodeHistory,
  writeBarcodeHistory,
  type BarcodeHistoryEntry,
  type BarcodeScanMethod,
  type DecodedBarcode,
} from '../../../utils/barcodeScanner';
import useBarcodeScanner from './useBarcodeScanner';
import './barcode-scanner.css';

interface ScanResult extends BarcodeHistoryEntry {
  status: 'success';
}

type Feedback = { message: string; kind: 'success' | 'error' | 'warning' } | null;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function BarcodeScanner() {
  const [activeTab, setActiveTab] = useState<BarcodeScanMethod>('camera');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [historyLoad] = useState(readBarcodeHistory);
  const [history, setHistory] = useState<BarcodeHistoryEntry[]>(historyLoad.entries);
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

  const onCameraDetected = (value: string, format: string) => {
    saveScans([{ value, format }], 'camera');
  };

  const {
    status: cameraStatus,
    cameraError,
    cameras,
    selectedCameraId,
    startCamera,
    stopCamera,
    switchCamera,
  } = useBarcodeScanner(videoRef, onCameraDetected);

  function showFeedback(message: string, kind: NonNullable<Feedback>['kind']) {
    setFeedback({ message, kind });
  }

  function saveScans(scans: DecodedBarcode[], method: BarcodeScanMethod) {
    if (!scans.length) {
      showFeedback('No supported barcode was decoded. Try a clearer image or another barcode.', 'error');
      return;
    }
    const scannedAt = new Date().toISOString();
    const entries = scans.map((scan) => makeBarcodeHistoryEntry(scan, method, scannedAt));
    setResults(entries.map((entry) => ({ ...entry, status: 'success' })));

    const seen = new Set(historyRef.current.map((entry) => `${entry.format}\u0000${entry.value}`));
    const newEntries = entries.filter((entry) => {
      const key = `${entry.format}\u0000${entry.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!newEntries.length) return;
    const next = [...newEntries, ...historyRef.current].slice(0, BARCODE_HISTORY_LIMIT);
    historyRef.current = next;
    setHistory(next);
    const storageError = writeBarcodeHistory(next);
    if (storageError) showFeedback(storageError, 'warning');
  }

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function clearResults() {
    setResults([]);
    setFeedback(null);
  }

  function handleTabChange(tab: BarcodeScanMethod) {
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
    clearResults();
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
    if (file.size > MAX_BARCODE_IMAGE_BYTES) {
      setImageError('This image is larger than 25 MB. Choose a smaller image and try again.');
      return;
    }
    if (file.size === 0) {
      setImageError('This image file is empty or invalid.');
      return;
    }
    setImagePreview(URL.createObjectURL(file));
    setSelectedFile(file);
    setImageError('');
    clearResults();
    setFeedback(null);
  }

  async function scanSelectedImage() {
    if (!selectedFile || isDecodingImage) return;
    setIsDecodingImage(true);
    setImageError('');
    clearResults();
    try {
      const scans = await decodeBarcodeImage(selectedFile);
      saveScans(scans, 'image');
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'The image could not be scanned. Try another image.');
    } finally {
      setIsDecodingImage(false);
    }
  }

  async function copyValues(values: string[], label: string) {
    try {
      await navigator.clipboard.writeText(values.join('\n'));
      showFeedback(`${label} copied to the clipboard.`, 'success');
    } catch {
      showFeedback('Could not copy. Check clipboard permissions and try again.', 'error');
    }
  }

  function exportResults(extension: 'txt' | 'csv') {
    if (!results.length) return;
    try {
      const content = extension === 'csv'
        ? [
          'value,format,method,scannedAt,status',
          ...results.map((result) => [
            result.value,
            result.format,
            result.method,
            result.scannedAt,
            result.status,
          ].map(csvCell).join(',')),
        ].join('\r\n')
        : results.map((result, index) => (
          `${index + 1}. ${result.value}\nFormat: ${result.format}\nMethod: ${result.method}\nScanned: ${formatDate(result.scannedAt)}\nStatus: ${result.status}`
        )).join('\n\n');
      const blob = new Blob([content], { type: extension === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `toolbox-barcode-scan.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showFeedback(`${extension.toUpperCase()} export started.`, 'success');
    } catch {
      showFeedback(`Could not export the scan results as ${extension.toUpperCase()}.`, 'error');
    }
  }

  function removeHistoryEntry(id: string) {
    const next = historyRef.current.filter((entry) => entry.id !== id);
    historyRef.current = next;
    setHistory(next);
    const storageError = writeBarcodeHistory(next);
    if (storageError) showFeedback(storageError, 'warning');
  }

  function clearHistory() {
    if (!history.length || !window.confirm('Clear all locally stored barcode scan history? This cannot be undone.')) return;
    historyRef.current = [];
    setHistory([]);
    const storageError = writeBarcodeHistory([]);
    showFeedback(storageError || 'Local scan history cleared.', storageError ? 'warning' : 'success');
  }

  function scanAgain() {
    const method = results[0]?.method;
    clearResults();
    if (method === 'camera') {
      setActiveTab('camera');
      void startCamera(selectedCameraId || undefined);
    } else if (method === 'image' && selectedFile) {
      setActiveTab('image');
      void scanSelectedImage();
    } else {
      setActiveTab(method ?? 'camera');
    }
  }

  return (
    <div className="barcode-scanner">
      <section className="barcode-scanner__card" aria-labelledby="barcode-scanner-heading">
        <div className="barcode-scanner__section-heading">
          <div>
            <span className="barcode-scanner__eyebrow">Tool 32</span>
            <h2 id="barcode-scanner-heading">Scan a barcode</h2>
          </div>
          <span className="barcode-scanner__privacy"><span aria-hidden="true" /> Processed on this device</span>
        </div>

        <div className="barcode-scanner__tabs" role="tablist" aria-label="Barcode scanning method">
          <button
            type="button"
            role="tab"
            id="barcode-camera-tab"
            aria-selected={activeTab === 'camera'}
            aria-controls="barcode-camera-panel"
            className={`barcode-scanner__tab${activeTab === 'camera' ? ' barcode-scanner__tab--active' : ''}`}
            onClick={() => handleTabChange('camera')}
          >
            <Camera size={17} /> Camera Scanner
          </button>
          <button
            type="button"
            role="tab"
            id="barcode-image-tab"
            aria-selected={activeTab === 'image'}
            aria-controls="barcode-image-panel"
            className={`barcode-scanner__tab${activeTab === 'image' ? ' barcode-scanner__tab--active' : ''}`}
            onClick={() => handleTabChange('image')}
          >
            <ImageIcon size={17} /> Upload Image
          </button>
        </div>

        <div
          id="barcode-camera-panel"
          role="tabpanel"
          aria-labelledby="barcode-camera-tab"
          hidden={activeTab !== 'camera'}
          className="barcode-scanner__panel"
        >
          <div className="barcode-scanner__camera">
            <video ref={videoRef} className="barcode-scanner__video" muted playsInline aria-label="Live camera preview" />
            {cameraStatus !== 'scanning' && (
              <div className="barcode-scanner__camera-placeholder">
                <Camera size={34} aria-hidden="true" />
                <strong>{cameraStatus === 'starting' ? 'Waiting for camera permission…' : 'Camera preview will appear here'}</strong>
                <span>Your camera is only accessed after you select Start Camera.</span>
              </div>
            )}
          </div>
          <div className="barcode-scanner__camera-controls">
            {cameras.length > 1 && (
              <label className="barcode-scanner__camera-select">
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
              <button type="button" className="barcode-scanner__button" onClick={stopCamera}>
                <X size={16} /> {cameraStatus === 'starting' ? 'Cancel Request' : 'Stop Camera'}
              </button>
            ) : (
              <button
                type="button"
                className="barcode-scanner__button barcode-scanner__button--primary"
                onClick={() => void handleStartCamera()}
              >
                <Camera size={16} /> Start Camera
              </button>
            )}
          </div>
          {(cameraError || cameraAccessNote) && (
            <p className="barcode-scanner__message barcode-scanner__message--error" role="alert">
              <AlertTriangle size={16} />
              <span>{cameraError || cameraAccessNote}</span>
            </p>
          )}
          {cameraStatus === 'scanning' && (
            <p className="barcode-scanner__hint" role="status">Scanning live camera frames. Scanning stops after the first barcode is decoded.</p>
          )}
          <p className="barcode-scanner__hint">
            Hold the barcode steady, fully in view, with good lighting. Camera access requires HTTPS or localhost.
          </p>
          <p className="barcode-scanner__hint barcode-scanner__supported">
            Supported: CODE 128, CODE 39, EAN-13, EAN-8, UPC-A, UPC-E (experimental in ZXing), ITF (including ITF-14-style values), Codabar, PDF417, and Data Matrix. QR codes and other formats are not scanned.
          </p>
        </div>

        <div
          id="barcode-image-panel"
          role="tabpanel"
          aria-labelledby="barcode-image-tab"
          hidden={activeTab !== 'image'}
          className="barcode-scanner__panel"
        >
          {!selectedFile ? (
            <div
              className={`barcode-scanner__dropzone${isDragging ? ' barcode-scanner__dropzone--active' : ''}`}
              role="group"
              tabIndex={0}
              aria-label="Choose an image containing a barcode"
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
              <span className="barcode-scanner__upload-icon"><Upload size={23} /></span>
              <strong>Drop an image here or browse files</strong>
              <span>PNG, JPG, JPEG, or WEBP · maximum 25 MB</span>
              <button
                type="button"
                className="barcode-scanner__button barcode-scanner__button--primary"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                className="barcode-scanner__file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                aria-label="Choose barcode image"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </div>
          ) : (
            <div className="barcode-scanner__image-review">
              <div className="barcode-scanner__image-preview">
                {imagePreview && <img src={imagePreview} alt={`Selected barcode image: ${selectedFile.name}`} />}
              </div>
              <div className="barcode-scanner__image-meta">
                <strong title={selectedFile.name}>{selectedFile.name}</strong>
                <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Processed locally</span>
              </div>
              <div className="barcode-scanner__actions">
                <button
                  type="button"
                  className="barcode-scanner__button barcode-scanner__button--primary"
                  onClick={() => void scanSelectedImage()}
                  disabled={isDecodingImage}
                >
                  <Barcode size={16} /> {isDecodingImage ? 'Scanning…' : 'Scan Image'}
                </button>
                <button
                  type="button"
                  className="barcode-scanner__button"
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview('');
                    setImageError('');
                    clearResults();
                  }}
                  disabled={isDecodingImage}
                >
                  <Trash2 size={16} /> Remove Image
                </button>
              </div>
            </div>
          )}
          <p className="barcode-scanner__hint">
            ZXing can return multiple PDF417 results from one image. Other barcode formats are decoded one at a time.
          </p>
          <p className="barcode-scanner__hint barcode-scanner__supported">
            Supported formats: CODE 128, CODE 39, EAN-13, EAN-8, UPC-A, UPC-E (experimental), ITF/ITF-14-style, Codabar, PDF417, and Data Matrix. UPC-E decoding may fail even when other formats decode. A scan does not identify a product.
          </p>
          {imageError && <p className="barcode-scanner__message barcode-scanner__message--error" role="alert">{imageError}</p>}
        </div>
      </section>

      {results.length > 0 && (
        <section className="barcode-scanner__card" aria-labelledby="barcode-result-heading">
          <div className="barcode-scanner__section-heading">
            <div>
              <span className="barcode-scanner__eyebrow">Scan complete</span>
              <h2 id="barcode-result-heading">Decoded result{results.length === 1 ? '' : 's'} ({results.length})</h2>
            </div>
            <span className="barcode-scanner__status"><Check size={14} /> Successful</span>
          </div>
          {results.map((result, index) => {
            const digit = checkRetailBarcodeDigit(result.format, result.value);
            return (
              <article className="barcode-scanner__result" key={result.id}>
                {results.length > 1 && <h3>Barcode {index + 1}</h3>}
                <dl className="barcode-scanner__metadata">
                  <div><dt>Format</dt><dd>{result.format}</dd></div>
                  <div><dt>Scan method</dt><dd>{result.method === 'camera' ? 'Camera' : 'Uploaded image'}</dd></div>
                  <div><dt>Scanned</dt><dd>{formatDate(result.scannedAt)}</dd></div>
                  <div><dt>Scan status</dt><dd>{result.status === 'success' ? 'Decoded successfully' : result.status}</dd></div>
                </dl>
                <pre className="barcode-scanner__value" aria-label={`Decoded barcode value ${index + 1}`}>{result.value}</pre>
                {digit.applicable && (
                  <p className={`barcode-scanner__check-digit${digit.valid ? ' barcode-scanner__check-digit--valid' : ' barcode-scanner__check-digit--invalid'}`}>
                    {digit.valid
                      ? 'Check digit is valid.'
                      : `Check digit is invalid; expected ${digit.expected}.`}
                    {' '}A valid check digit does not prove that the product identifier is officially registered.
                  </p>
                )}
                <div className="barcode-scanner__actions">
                  <button type="button" className="barcode-scanner__button" onClick={() => void copyValues([result.value], 'Barcode value')}>
                    <Clipboard size={16} /> Copy This Value
                  </button>
                </div>
              </article>
            );
          })}
          <div className="barcode-scanner__actions">
            <button type="button" className="barcode-scanner__button barcode-scanner__button--primary" onClick={() => void copyValues(results.map((result) => result.value), results.length > 1 ? 'All barcode values' : 'Barcode value')}>
              <Clipboard size={16} /> {results.length > 1 ? 'Copy All Values' : 'Copy Value'}
            </button>
            <button type="button" className="barcode-scanner__button" onClick={() => exportResults('txt')}>
              <Download size={16} /> Export TXT
            </button>
            <button type="button" className="barcode-scanner__button" onClick={() => exportResults('csv')}>
              <Download size={16} /> Export CSV
            </button>
            <button type="button" className="barcode-scanner__button" onClick={scanAgain}>
              <RefreshCw size={16} /> Scan Again
            </button>
            <button type="button" className="barcode-scanner__button barcode-scanner__button--text" onClick={clearResults}>
              <X size={16} /> Clear Results
            </button>
          </div>
        </section>
      )}

      {feedback && (
        <p className={`barcode-scanner__feedback barcode-scanner__feedback--${feedback.kind}`} role="status">
          {feedback.message}
        </p>
      )}

      <section className="barcode-scanner__card" aria-labelledby="barcode-history-heading">
        <div className="barcode-scanner__section-heading">
          <div>
            <span className="barcode-scanner__eyebrow">Stored on this device only</span>
            <h2 id="barcode-history-heading">Recent scans</h2>
          </div>
          {history.length > 0 && (
            <button type="button" className="barcode-scanner__button barcode-scanner__button--text" onClick={clearHistory}>
              <Trash2 size={15} /> Clear History
            </button>
          )}
        </div>
        <p className="barcode-scanner__hint barcode-scanner__hint--history">
          Up to {BARCODE_HISTORY_LIMIT} successful scans are kept in this browser’s local storage. No images or scan history are sent to a server.
        </p>
        {history.length === 0 ? (
          <div className="barcode-scanner__empty">
            <Barcode size={24} aria-hidden="true" />
            <strong>No scans yet</strong>
            <span>Successfully decoded barcodes will appear here.</span>
          </div>
        ) : (
          <ul className="barcode-scanner__history">
            {history.map((entry) => (
              <li key={entry.id} className="barcode-scanner__history-entry">
                <div className="barcode-scanner__history-copy">
                  <span className="barcode-scanner__format-label">{entry.format}</span>
                  <p title={entry.value}>{entry.value}</p>
                  <span>{formatDate(entry.scannedAt)} · {entry.method === 'camera' ? 'Camera' : 'Image'}</span>
                </div>
                <div className="barcode-scanner__history-actions">
                  <button type="button" aria-label="Copy previous barcode scan" title="Copy" onClick={() => void copyValues([entry.value], 'Previous barcode value')}>
                    <Clipboard size={15} />
                  </button>
                  <button type="button" aria-label="Remove previous barcode scan" title="Remove" onClick={() => removeHistoryEntry(entry.id)}>
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
