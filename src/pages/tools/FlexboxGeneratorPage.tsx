import Icon from '../../components/common/Icon';
import FlexboxGenerator from '../../components/tools/flexbox-generator/FlexboxGenerator';

export default function FlexboxGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="layout-dashboard" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">CSS Flexbox Generator</h1>
          <p className="tool-view__desc">
            Build responsive Flexbox layouts, tune each item, and export ready-to-use CSS.
          </p>
        </div>
      </div>

      <FlexboxGenerator />
    </div>
  );
}
