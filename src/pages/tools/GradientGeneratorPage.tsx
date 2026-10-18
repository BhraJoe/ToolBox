import Icon from '../../components/common/Icon';
import GradientGenerator from '../../components/tools/gradient-generator/GradientGenerator';

export default function GradientGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="layers" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">CSS Gradient Generator</h1>
          <p className="tool-view__desc">
            Create beautiful CSS gradients and export ready-to-use code.
          </p>
        </div>
      </div>

      <GradientGenerator />
    </div>
  );
}