import AgeCalculator from '../../components/tools/age-calculator/AgeCalculator';
import Icon from '../../components/common/Icon';

export default function AgeCalculatorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="calendar" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Age Calculator</h1>
          <p className="tool-view__desc">
            Calculate your exact age from your date of birth.
          </p>
        </div>
      </div>

      <AgeCalculator />
    </div>
  );
}
