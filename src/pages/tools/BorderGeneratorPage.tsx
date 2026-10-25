import Icon from '../../components/common/Icon';
import BorderGenerator from '../../components/tools/border-generator/BorderGenerator';

export default function BorderGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="palette" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">CSS Border Generator</h1>
          <p className="tool-view__desc">
            Customize border width, style, color, radius, and preview live CSS.
          </p>
        </div>
      </div>

      <BorderGenerator />
    </div>
  );
}