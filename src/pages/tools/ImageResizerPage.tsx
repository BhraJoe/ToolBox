import Icon from '../../components/common/Icon';
import ImageResizer from '../../components/tools/image-resizer/ImageResizer';

export default function ImageResizerPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Resizer</h1>
          <p className="tool-view__desc">
            Resize images to custom dimensions, percentages, and preset sizes. Images stay on your device.
          </p>
        </div>
      </div>

      <ImageResizer />
    </div>
  );
}
