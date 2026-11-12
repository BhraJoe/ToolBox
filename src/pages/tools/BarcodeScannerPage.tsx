import Icon from '../../components/common/Icon';
import BarcodeScanner from '../../components/tools/barcode-scanner/BarcodeScanner';

export default function BarcodeScannerPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="tag" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Barcode Scanner</h1>
          <p className="tool-view__desc">
            Scan and decode supported barcodes using your device camera or uploaded images. Scanning stays local to your browser.
          </p>
        </div>
      </div>

      <BarcodeScanner />
    </div>
  );
}
