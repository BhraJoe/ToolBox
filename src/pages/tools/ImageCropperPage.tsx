import Icon from '../../components/common/Icon';
import ImageCropper from '../../components/tools/image-cropper/ImageCropper';

export default function ImageCropperPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="crop" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Cropper</h1>
          <p className="tool-view__desc">
            Crop images to custom dimensions and preset aspect ratios. Images stay on your device.
          </p>
        </div>
      </div>

      <ImageCropper />
    </div>
  );
}