import Icon from '../../components/common/Icon';
import ImageColorPicker from '../../components/tools/image-color-picker/ImageColorPicker';

export default function ImageColorPickerPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="pipette" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Color Picker</h1>
          <p className="tool-view__desc">
            Extract exact pixel colors and dominant palettes locally in your browser.
          </p>
        </div>
      </div>
      <ImageColorPicker />
    </div>
  );
}
