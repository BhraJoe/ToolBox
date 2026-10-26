import Icon from '../../components/common/Icon';
import TransformGenerator from '../../components/tools/transform-generator/TransformGenerator';

export default function TransformGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="maximize2" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">CSS Transform Generator</h1>
          <p className="tool-view__desc">
            Apply and preview CSS transforms, generate clean transform CSS.
          </p>
        </div>
      </div>

      <TransformGenerator />
    </div>
  );
}