import Icon from '../../components/common/Icon';
import BarcodeGenerator from '../../components/tools/barcode-generator/BarcodeGenerator';

export default function BarcodeGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="tag" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Barcode Generator</h1>
          <p className="tool-view__desc">
            Generate customizable, downloadable barcodes for product labels, inventory, retail, and business applications.
          </p>
        </div>
      </div>

      <BarcodeGenerator />
    </div>
  );
}
