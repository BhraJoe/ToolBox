import Icon from '../../components/common/Icon';
import ImageCompressor from '../../components/tools/image-compressor/ImageCompressor';

export default function ImageCompressorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Compressor</h1>
          <p className="tool-view__desc">
            Reduce image file sizes, adjust dimensions and convert formats. Images stay on your device.
          </p>
        </div>
      </div>

      <ImageCompressor />
    </div>
  );
}