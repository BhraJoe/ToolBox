import type { AgeResult } from '../../../utils/age-calculator/ageCalculator';

export default function AgeResultDisplay({ result }: { result: AgeResult }) {
  return (
    <div className="age-calculator__result">
      <h3 className="age-calculator__result-title">Your Age</h3>
      <p className="age-calculator__result-value">
        {result.years} Years, {result.months} Months, {result.days} Days
      </p>
      {result.isBirthdayToday && (
        <p className="age-calculator__birthday">It's your birthday today!</p>
      )}
    </div>
  );
}
