import Icon from '../../components/common/Icon';
import ImageBlur from '../../components/tools/image-blur/ImageBlur';

export default function ImageBlurPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Blur Tool</h1>
          <p className="tool-view__desc">
            Blur entire images or selected areas with adjustable effects. Processing stays on your device.
          </p>
        </div>
      </div>
      <ImageBlur />
    </div>
  );
}
