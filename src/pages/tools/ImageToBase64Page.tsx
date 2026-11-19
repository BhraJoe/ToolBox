import Icon from '../../components/common/Icon';
import ImageToBase64 from '../../components/tools/image-to-base64/ImageToBase64Converter';

export default function ImageToBase64Page() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="binary" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image to Base64 Converter</h1>
          <p className="tool-view__desc">
            Convert images into Base64 strings and Data URLs for HTML, CSS, JavaScript, JSON and Markdown. Images stay on your device.
          </p>
        </div>
      </div>

      <ImageToBase64 />
    </div>
  );
}
