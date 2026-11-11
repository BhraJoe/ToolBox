import Icon from '../../components/common/Icon';
import QrCodeScanner from '../../components/tools/qr-code-scanner/QrCodeScanner';

export default function QrCodeScannerPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="qr-code" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">QR Code Scanner</h1>
          <p className="tool-view__desc">
            Scan QR codes with your camera or an image. All scanning happens locally in your browser.
          </p>
        </div>
      </div>

      <QrCodeScanner />
    </div>
  );
}
