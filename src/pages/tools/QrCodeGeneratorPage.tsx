import Icon from '../../components/common/Icon';
import QrCodeGenerator from '../../components/tools/qr-code-generator/QrCodeGenerator';

export default function QrCodeGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="qr-code" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">QR Code Generator</h1>
          <p className="tool-view__desc">
            Generate customizable QR codes for websites, text, contact information, Wi-Fi networks, and more.
          </p>
        </div>
      </div>

      <QrCodeGenerator />
    </div>
  );
}
