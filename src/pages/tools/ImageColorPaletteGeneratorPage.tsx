import Icon from '../../components/common/Icon';
import ImageColorPaletteGenerator from '../../components/tools/image-color-palette-generator/ImageColorPaletteGenerator';

export default function ImageColorPaletteGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="palette" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Color Palette Generator</h1>
          <p className="tool-view__desc">
            Extract, customize, and export color palettes from images locally in your browser.
          </p>
        </div>
      </div>
      <ImageColorPaletteGenerator />
    </div>
  );
}
