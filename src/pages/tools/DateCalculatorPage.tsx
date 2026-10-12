import DateCalculator from "../../components/tools/date-calculator/DateCalculator";
import Icon from "../../components/common/Icon";

export default function DateCalculatorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="calendar-days" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Date Calculator</h1>
          <p className="tool-view__desc">
            Find the time between two dates or add and subtract time from a date.
          </p>
        </div>
      </div>

      <DateCalculator />
    </div>
  );
}
