import Icon from '../../components/common/Icon';
import ImagePixelate from '../../components/tools/image-pixelate/ImagePixelate';

export default function ImagePixelatePage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Pixelate Tool</h1>
          <p className="tool-view__desc">
            Pixelate entire images or selected areas to create mosaic effects and hide sensitive details. Processing stays on your device.
          </p>
        </div>
      </div>
      <ImagePixelate />
    </div>
  );
}
