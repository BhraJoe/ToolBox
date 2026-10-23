import Icon from '../../components/common/Icon';
import GridGenerator from '../../components/tools/grid-generator/GridGenerator';

export default function GridGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="layout-dashboard" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">CSS Grid Generator</h1>
          <p className="tool-view__desc">
            Design grid layouts, configure tracks and gaps, and export CSS.
          </p>
        </div>
      </div>

      <GridGenerator />
    </div>
  );
}