import Icon from '../../components/common/Icon';
import BoxShadowGenerator from '../../components/tools/box-shadow-generator/BoxShadowGenerator';

export default function BoxShadowGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="layers" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Box Shadow Generator</h1>
          <p className="tool-view__desc">
            Shape, layer, and export CSS shadows with a live preview.
          </p>
        </div>
      </div>

      <BoxShadowGenerator />
    </div>
  );
}