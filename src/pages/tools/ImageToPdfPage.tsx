import Icon from '../../components/common/Icon';
import ImageToPdf from '../../components/tools/image-to-pdf/ImageToPdf';

export default function ImageToPdfPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image to PDF Converter</h1>
          <p className="tool-view__desc">
            Convert images into PDF documents locally in your browser. Upload one or more images and export them as a multi-page PDF.
          </p>
        </div>
      </div>

      <ImageToPdf />
    </div>
  );
}