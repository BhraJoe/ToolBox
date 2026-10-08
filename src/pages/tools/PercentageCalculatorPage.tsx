import PercentageCalculator from '../../components/tools/percentage-calculator/PercentageCalculator';
import Icon from '../../components/common/Icon';

export default function PercentageCalculatorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="percent" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Percentage Calculator</h1>
          <p className="tool-view__desc">
            Calculate percentages, increases, decreases, and more with ease.
          </p>
        </div>
      </div>

      <PercentageCalculator />
    </div>
  );
}