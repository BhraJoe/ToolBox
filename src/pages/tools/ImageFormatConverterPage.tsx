import Icon from '../../components/common/Icon';
import ImageFormatConverter from '../../components/tools/image-format-converter/ImageFormatConverter';

export default function ImageFormatConverterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Format Converter</h1>
          <p className="tool-view__desc">
            Convert images between PNG, JPEG and WEBP formats locally in your browser. Images stay on your device.
          </p>
        </div>
      </div>

      <ImageFormatConverter />
    </div>
  );
}