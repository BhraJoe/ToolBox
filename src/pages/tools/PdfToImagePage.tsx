import Icon from '../../components/common/Icon';
import PdfToImage from '../../components/tools/pdf-to-image/PdfToImage';

export default function PdfToImagePage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="file-image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">PDF to Image Converter</h1>
          <p className="tool-view__desc">
            Convert PDF pages into high-quality images entirely in your browser. Select specific pages, choose output format and resolution, then download each image or all as a ZIP archive.
          </p>
        </div>
      </div>

      <PdfToImage />
    </div>
  );
}