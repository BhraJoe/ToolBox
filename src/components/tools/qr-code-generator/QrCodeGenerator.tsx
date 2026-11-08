import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Printer, RotateCcw } from 'lucide-react';
import QrCodeContentForm from './QrCodeContentForm';
import QrCodeCustomization from './QrCodeCustomization';
import {
  buildQrPayload,
  DEFAULT_QR_CUSTOMIZATION,
  DEFAULT_QR_VALUES,
  generateQrPng,
  generateQrSvg,
  isValidHexColor,
  type QrContentType,
  type QrContentValues,
  type QrCustomization,
} from '../../../utils/qrCode';
import './qr-code-generator.css';

type Feedback = { message: string; kind: 'success' | 'error' } | null;

const CONTENT_LABELS: Record<QrContentType, string> = {
  url: 'website',
  text: 'text',
  email: 'email',
  phone: 'phone number',
  sms: 'SMS message',
  wifi: 'Wi-Fi network',
  contact: 'contact',
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function QrCodeGenerator() {
  const [type, setType] = useState<QrContentType>('url');
  const [values, setValues] = useState<QrContentValues>(DEFAULT_QR_VALUES);
  const [customization, setCustomization] = useState<QrCustomization>(DEFAULT_QR_CUSTOMIZATION);
  const [generated, setGenerated] = useState<{ key: string; image: string; error: string }>({
    key: '',
    image: '',
    error: '',
  });
  const [feedback, setFeedback] = useState<Feedback>(null);

  const payloadResult = useMemo(() => {
    try {
      return { payload: buildQrPayload(type, values), error: '' };
    } catch (error) {
      return { payload: '', error: getErrorMessage(error, 'Check the content and try again.') };
    }
  }, [type, values]);

  const colorError = isValidHexColor(customization.foregroundColor) && isValidHexColor(customization.backgroundColor)
    ? ''
    : 'Enter valid six-digit hexadecimal colors before generating.';
  const generationKey = JSON.stringify([payloadResult.payload, customization]);
  const qrImage = generated.key === generationKey ? generated.image : '';
  const generationError = generated.key === generationKey ? generated.error : '';

  useEffect(() => {
    if (!payloadResult.payload || payloadResult.error || colorError) {
      return;
    }

    let active = true;
    generateQrPng(payloadResult.payload, customization)
      .then((image) => {
        if (active) setGenerated({ key: generationKey, image, error: '' });
      })
      .catch((error: unknown) => {
        if (active) {
          setGenerated({
            key: generationKey,
            image: '',
            error: getErrorMessage(error, 'QR generation failed. Try a shorter payload or different settings.'),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [payloadResult.payload, payloadResult.error, customization, colorError, generationKey]);

  const updateContent = (updates: Partial<QrContentValues>) => {
    setValues((current) => ({ ...current, ...updates }));
  };

  const updateCustomization = (updates: Partial<QrCustomization>) => {
    setCustomization((current) => ({ ...current, ...updates }));
  };

  const showFeedback = (message: string, kind: NonNullable<Feedback>['kind']) => {
    setFeedback({ message, kind });
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const reset = () => {
    setType('url');
    setValues({ ...DEFAULT_QR_VALUES });
    setCustomization({ ...DEFAULT_QR_CUSTOMIZATION });
    setFeedback(null);
  };

  const downloadPng = () => {
    if (!qrImage) {
      showFeedback('Enter valid content to generate a QR code first.', 'error');
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = 'toolbox-qr-code.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      showFeedback('PNG download started.', 'success');
    } catch (error) {
      showFeedback(getErrorMessage(error, 'The PNG could not be downloaded in this browser.'), 'error');
    }
  };

  const downloadSvg = async () => {
    if (!payloadResult.payload || payloadResult.error || colorError) return;
    try {
      const svg = await generateQrSvg(payloadResult.payload, customization);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'toolbox-qr-code.svg';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showFeedback('SVG download started.', 'success');
    } catch (error) {
      showFeedback(getErrorMessage(error, 'The SVG could not be generated.'), 'error');
    }
  };

  const copyPayload = async () => {
    if (!payloadResult.payload || payloadResult.error) return;
    try {
      await navigator.clipboard.writeText(payloadResult.payload);
      showFeedback('Encoded content copied to the clipboard.', 'success');
    } catch {
      showFeedback('Could not copy content. Check your browser clipboard permissions.', 'error');
    }
  };

  const copyImage = async () => {
    if (!qrImage) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      showFeedback('Image copying is not supported by this browser. Download the PNG instead.', 'error');
      return;
    }
    try {
      const imageBlob = await (await fetch(qrImage)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })]);
      showFeedback('QR code image copied to the clipboard.', 'success');
    } catch {
      showFeedback('Could not copy the image. Use Download PNG or check clipboard permissions.', 'error');
    }
  };

  const printQr = () => {
    if (!qrImage) return;
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showFeedback('Printing was blocked by the browser. Allow pop-ups and try again.', 'error');
        return;
      }
      printWindow.document.title = 'ToolBox QR Code';
      printWindow.document.body.innerHTML = '';
      printWindow.document.body.style.cssText = 'margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;';
      const image = printWindow.document.createElement('img');
      image.src = qrImage;
      image.alt = 'Generated QR code';
      image.style.cssText = 'width:min(80vmin,512px);height:auto;image-rendering:pixelated;';
      printWindow.document.body.appendChild(image);
      image.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      image.onerror = () => {
        printWindow.close();
        showFeedback('The QR code could not be prepared for printing.', 'error');
      };
      showFeedback('Print dialog opened.', 'success');
    } catch (error) {
      showFeedback(getErrorMessage(error, 'Printing is not available in this browser.'), 'error');
    }
  };

  const contentError = payloadResult.error || colorError || generationError;

  return (
    <div className="qr-tool">
      <div className="qr-tool__workspace">
        <div className="qr-tool__controls">
          <QrCodeContentForm
            type={type}
            values={values}
            error={contentError}
            onTypeChange={setType}
            onChange={updateContent}
          />
          <QrCodeCustomization value={customization} onChange={updateCustomization} />
          <button type="button" className="qr-tool__reset" onClick={reset}>
            <RotateCcw size={16} />
            Reset all settings
          </button>
        </div>

        <section className="qr-tool__card qr-tool__preview-card" aria-labelledby="qr-preview-heading">
          <div className="qr-tool__section-heading">
            <div>
              <span className="qr-tool__eyebrow">Live preview</span>
              <h2 id="qr-preview-heading">Your QR code</h2>
            </div>
            {qrImage && <span className="qr-tool__ready"><Check size={14} /> Ready</span>}
          </div>

          <div className={`qr-tool__preview${customization.transparentBackground ? ' qr-tool__preview--transparent' : ''}`}>
            {qrImage ? (
              <img src={qrImage} alt={`QR code encoding ${CONTENT_LABELS[type]}`} width={customization.size} height={customization.size} />
            ) : contentError ? (
              <div className="qr-tool__empty qr-tool__empty--error" role="alert">
                <ImageIcon size={34} aria-hidden="true" />
                <strong>We couldn’t generate this QR code</strong>
                <span>{contentError}</span>
              </div>
            ) : (
              <div className="qr-tool__empty">
                <ImageIcon size={34} aria-hidden="true" />
                <strong>Your preview will appear here</strong>
                <span>Enter content to generate a scannable QR code.</span>
              </div>
            )}
          </div>

          <p className="qr-tool__scan-help">Point your phone camera at the code to scan it. For reliable scanning, use high contrast and keep the margin enabled.</p>

          <div className="qr-tool__actions">
            <button type="button" className="qr-tool__action qr-tool__action--primary" onClick={downloadPng} disabled={!qrImage}>
              <Download size={16} /> Download PNG
            </button>
            <button type="button" className="qr-tool__action" onClick={downloadSvg} disabled={!qrImage}>
              <Download size={16} /> Download SVG
            </button>
            <button type="button" className="qr-tool__action" onClick={copyImage} disabled={!qrImage}>
              <Copy size={16} /> Copy image
            </button>
            <button type="button" className="qr-tool__action" onClick={copyPayload} disabled={!payloadResult.payload || Boolean(payloadResult.error)}>
              <Copy size={16} /> Copy content
            </button>
            <button type="button" className="qr-tool__action" onClick={printQr} disabled={!qrImage}>
              <Printer size={16} /> Print
            </button>
          </div>

          {feedback && (
            <p className={`qr-tool__feedback qr-tool__feedback--${feedback.kind}`} role="status">
              {feedback.message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
