import Icon from '../../components/common/Icon';
import ImageWatermark from '../../components/tools/image-watermark/ImageWatermark';

export default function ImageWatermarkPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="stamp" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Watermark Tool</h1>
          <p className="tool-view__desc">
            Add text or logo watermarks to your images. Works entirely in your browser — images never leave your device.
          </p>
        </div>
      </div>

      <ImageWatermark />
    </div>
  );
}