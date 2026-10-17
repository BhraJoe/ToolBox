import Icon from '../../components/common/Icon';
import ColorConverter from '../../components/tools/color-converter/ColorConverter';

export default function ColorConverterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="palette" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Color Converter</h1>
          <p className="tool-view__desc">
            Convert colors between HEX, RGB, and HSL, preview them live, and copy ready-to-use CSS values.
          </p>
        </div>
      </div>

      <ColorConverter />
    </div>
  );
}
