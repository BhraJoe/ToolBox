import { useState, useEffect, useCallback } from 'react';
import {
  parseLocalDate,
  formatDateForInput,
  cloneDate,
  calculateAge,
  validateDob,
  validateAsOf,
  formatDateDisplay,
} from '../../../utils/age-calculator/ageCalculator';
import type { AgeResult } from '../../../utils/age-calculator/ageCalculator';
import AgeResultDisplay from './AgeResultDisplay';
import AgeStatistics from './AgeStatistics';

export default function AgeCalculator() {
  const today = formatDateForInput(cloneDate(new Date()));
  const [dob, setDob] = useState<string>('');
  const [asOf, setAsOf] = useState<string>(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AgeResult | null>(null);
  const [needsRecalc, setNeedsRecalc] = useState<boolean>(false);

  useEffect(() => {
    if (dob || asOf !== today) {
      // will validate on calculate; just mark needs recalc if we had results
      if (result) setNeedsRecalc(true);
    }
  }, [dob, asOf]);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDob(e.target.value);
    setNeedsRecalc(true);
    setErrors((prev) => ({ ...prev, dob: '' }));
  };

  const handleAsOfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAsOf(e.target.value);
    setNeedsRecalc(true);
    setErrors((prev) => ({ ...prev, asOf: '' }));
  };

  const handleCalculate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    const dobValidation = validateDob(dob, asOf);
    if (!dobValidation.valid) {
      newErrors.dob = dobValidation.message;
    }

    const asOfValidation = validateAsOf(asOf, dob);
    if (!asOfValidation.valid) {
      newErrors.asOf = asOfValidation.message;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setResult(null);
      setNeedsRecalc(false);
      return;
    }

    const dobDate = parseLocalDate(dob);
    const asOfDate = parseLocalDate(asOf);
    if (!dobDate || !asOfDate) {
      setErrors({ general: 'Invalid dates' });
      setResult(null);
      setNeedsRecalc(false);
      return;
    }

    try {
      const ageResult = calculateAge(dobDate, asOfDate);
      setResult(ageResult);
      setErrors({});
      setNeedsRecalc(false);
    } catch (e) {
      setErrors({ general: e instanceof Error ? e.message : 'Calculation error' });
      setResult(null);
      setNeedsRecalc(false);
    }
  }, [dob, asOf]);

  const handleReset = () => {
    setDob('');
    setAsOf(today);
    setErrors({});
    setResult(null);
    setNeedsRecalc(false);
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!result) return;
    const dobDate = parseLocalDate(dob);
    const asOfDate = parseLocalDate(asOf);
    const cleanSummary = `Age: ${result.years} years, ${result.months} months, ${result.days} days
Date of Birth: ${dobDate ? formatDateDisplay(dobDate) : dob}
Calculated As Of: ${asOfDate ? formatDateDisplay(asOfDate) : asOf}
Total days lived: ${result.totalDays.toLocaleString()}
Total completed weeks: ${result.totalWeeks.toLocaleString()}
Total hours lived (approx): ${result.totalHours.toLocaleString()}
Born on: ${result.bornOnWeekday}
Next birthday: ${formatDateDisplay(result.nextBirthday)}
Days until next birthday: ${result.isBirthdayToday ? '0 (Today!)' : result.daysUntilBirthday.toString()}
`;
    try {
      await navigator.clipboard.writeText(cleanSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  const maxDob = asOf ? asOf : today;

  return (
    <div className="age-calculator__card">
      <div className="age-calculator__fields">
        <div className="age-calculator__field">
          <label className="age-calculator__label">Date of Birth *</label>
          <input
            type="date"
            className="age-calculator__input"
            value={dob}
            onChange={handleDobChange}
            max={maxDob}
            aria-label="Date of birth"
          />
          {errors.dob && <p className="age-calculator__error">{errors.dob}</p>}
        </div>
        <div className="age-calculator__field">
          <label className="age-calculator__label">Calculate Age As Of *</label>
          <input
            type="date"
            className="age-calculator__input"
            value={asOf}
            onChange={handleAsOfChange}
            aria-label="Calculation date"
          />
          {errors.asOf && <p className="age-calculator__error">{errors.asOf}</p>}
        </div>
      </div>

      <div className="age-calculator__actions">
        <button className="age-calculator__button age-calculator__button--primary" onClick={handleCalculate}>
          Calculate Age
        </button>
        <button className="age-calculator__button age-calculator__button--secondary" onClick={handleReset}>
          Reset
        </button>
        {result && (
          <button className="age-calculator__button age-calculator__button--secondary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Result'}
          </button>
        )}
      </div>

      {errors.general && <p className="age-calculator__error">{errors.general}</p>}

      {needsRecalc && result && (
        <p className="age-calculator__notice">
          Dates changed - click Calculate Age to update results.
        </p>
      )}

      {result && <AgeResultDisplay result={result} />}
      {result && <AgeStatistics result={result} />}
    </div>
  );
}
