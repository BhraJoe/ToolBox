import Icon from '../../components/common/Icon';
import Base64ToImageConverter from '../../components/tools/base64-to-image/Base64ToImageConverter';

export default function Base64ToImagePage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Base64 to Image Converter</h1>
          <p className="tool-view__desc">
            Decode Base64 data or Data URLs into PNG, JPEG, WEBP, GIF and SVG images, inspect them and download the result. Images stay on your device.
          </p>
        </div>
      </div>

      <Base64ToImageConverter />
    </div>
  );
}
