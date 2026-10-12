import type { AgeResult } from '../../../utils/age-calculator/ageCalculator';
import { formatDateDisplay } from '../../../utils/age-calculator/ageCalculator';

export default function AgeStatistics({ result }: { result: AgeResult }) {
  const totalCalendarMonths = result.years * 12 + result.months;

  return (
    <div className="age-calculator__statistics">
      <h3 className="age-calculator__statistics-title">Additional Information</h3>
      <div className="age-calculator__statistics-grid">
        <div className="age-calculator__statistic">
          <span className="age-calculator__statistic-label">Total Calendar Months:</span>
          <span className="age-calculator__statistic-value">{totalCalendarMonths.toLocaleString()}</span>
        </div>
        <div className="age-calculator__statistic">
          <span className="age-calculator__statistic-label">Total Weeks:</span>
          <span className="age-calculator__statistic-value">{result.totalWeeks.toLocaleString()}</span>
        </div>
        <div className="age-calculator__statistic">
          <span className="age-calculator__statistic-label">Total Days:</span>
          <span className="age-calculator__statistic-value">{result.totalDays.toLocaleString()}</span>
        </div>
        <div className="age-calculator__statistic">
          <span className="age-calculator__statistic-label">Total Hours (approx.):</span>
          <span className="age-calculator__statistic-value" title="Approximate because time of birth is not provided">
            {result.totalHours.toLocaleString()}*
          </span>
        </div>
        <div className="age-calculator__statistic">
          <span className="age-calculator__statistic-label">Born On:</span>
          <span className="age-calculator__statistic-value">{result.bornOnWeekday}</span>
        </div>
        <div className="age-calculator__statistic">
          <span className="age-calculator__statistic-label">Next Birthday:</span>
          <span className="age-calculator__statistic-value">{formatDateDisplay(result.nextBirthday)}</span>
        </div>
        <div className="age-calculator__statistic age-calculator__statistic--wide">
          <span className="age-calculator__statistic-label">Days Until Birthday:</span>
          <span className="age-calculator__statistic-value">
            {result.isBirthdayToday ? '0 (Today!)' : result.daysUntilBirthday.toLocaleString()}
          </span>
        </div>
      </div>
      <p className="age-calculator__footnote">
        * Hours are approximate since only the date of birth is provided, not the exact time of birth or time zone.
      </p>
    </div>
  );
}
