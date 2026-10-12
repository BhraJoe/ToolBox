import { useState, type FormEvent } from "react";
import {
  calculateDateDifference,
  calculateNewDate,
  formatDateOnly,
  getWeekday,
  parseDateOnly,
} from "../../../utils/dateCalculator";
import type {
  DateDifferenceResult,
  DateOperation,
  DateUnit,
} from "../../../utils/dateCalculator";

type CalculatorMode = "difference" | "add-subtract";
type FieldErrors = Record<string, string>;
const UNIT_LABELS: Record<DateUnit, string> = {
  days: "day",
  weeks: "week",
  months: "month",
  years: "year",
};

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function formatDuration(result: DateDifferenceResult): string {
  const parts = [
    result.years > 0 ? pluralize(result.years, "year") : "",
    result.months > 0 ? pluralize(result.months, "month") : "",
    result.days > 0 ? pluralize(result.days, "day") : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "0 days";
}

export default function DateCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("difference");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeEndDate, setIncludeEndDate] = useState(false);
  const [differenceResult, setDifferenceResult] = useState<DateDifferenceResult | null>(null);
  const [differenceErrors, setDifferenceErrors] = useState<FieldErrors>({});

  const [calculationStartDate, setCalculationStartDate] = useState("");
  const [operation, setOperation] = useState<DateOperation>("add");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<DateUnit>("days");
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [dateErrors, setDateErrors] = useState<FieldErrors>({});
  const [copyError, setCopyError] = useState("");
  const [copied, setCopied] = useState(false);

  const calculateDifference = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopied(false);
    setCopyError("");
    const errors: FieldErrors = {};
    const parsedStart = parseDateOnly(startDate);
    const parsedEnd = parseDateOnly(endDate);

    if (!parsedStart) errors.startDate = "Choose a valid start date.";
    if (!parsedEnd) errors.endDate = "Choose a valid end date.";
    if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
      errors.endDate = "The end date must be on or after the start date.";
    }

    if (Object.keys(errors).length > 0) {
      setDifferenceErrors(errors);
      setDifferenceResult(null);
      return;
    }

    if (!parsedStart || !parsedEnd) return;
    setDifferenceErrors({});
    setDifferenceResult(calculateDateDifference(parsedStart, parsedEnd, includeEndDate));
  };

  const calculateAddedDate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopied(false);
    setCopyError("");
    const errors: FieldErrors = {};
    const parsedStart = parseDateOnly(calculationStartDate);
    const parsedAmount = amount.trim() === "" ? Number.NaN : Number(amount);

    if (!parsedStart) errors.startDate = "Choose a valid starting date.";
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount < 0) {
      errors.amount = "Enter a non-negative whole number.";
    }

    if (Object.keys(errors).length > 0) {
      setDateErrors(errors);
      setNewDate(null);
      return;
    }

    if (!parsedStart) return;
    try {
      const result = calculateNewDate(parsedStart, operation, parsedAmount, unit);
      setDateErrors({});
      setNewDate(result.date);
    } catch (error) {
      setDateErrors({
        general: error instanceof Error ? error.message : "Unable to calculate the new date.",
      });
      setNewDate(null);
    }
  };

  const resetDifference = () => {
    setStartDate("");
    setEndDate("");
    setIncludeEndDate(false);
    setDifferenceErrors({});
    setDifferenceResult(null);
    setCopied(false);
    setCopyError("");
  };

  const resetDateCalculation = () => {
    setCalculationStartDate("");
    setOperation("add");
    setAmount("");
    setUnit("days");
    setDateErrors({});
    setNewDate(null);
    setCopied(false);
    setCopyError("");
  };

  const copyResult = async () => {
    let text: string;
    if (mode === "difference" && differenceResult) {
      const parsedStart = parseDateOnly(startDate);
      const parsedEnd = parseDateOnly(endDate);
      if (!parsedStart || !parsedEnd) return;
      const countingLabel = includeEndDate ? "inclusive" : "exclusive";
      text = [
        "Date Difference",
        `Duration: ${formatDuration(differenceResult)}`,
        `Total difference: ${differenceResult.totalDays} days (${countingLabel} of the end date)`,
        `${differenceResult.weeks} weeks and ${differenceResult.remainingWeekDays} days`,
        `${differenceResult.totalMonths} complete months and ${differenceResult.days} remaining days`,
        `Start date: ${formatDateOnly(parsedStart)} (${differenceResult.startWeekday})`,
        `End date: ${formatDateOnly(parsedEnd)} (${differenceResult.endWeekday})`,
      ].join("\n");
    } else if (mode === "add-subtract" && newDate) {
      const parsedStart = parseDateOnly(calculationStartDate);
      if (!parsedStart) return;
      text = [
        `Calculated date: ${formatDateOnly(newDate)} (${getWeekday(newDate)})`,
        `Starting date: ${formatDateOnly(parsedStart)}`,
        `Operation: ${operation === "add" ? "Add" : "Subtract"} ${pluralize(Number(amount), UNIT_LABELS[unit])}`,
        `${formatDateOnly(parsedStart)} ${operation === "add" ? "plus" : "minus"} ${pluralize(Number(amount), UNIT_LABELS[unit])} is ${formatDateOnly(newDate)}.`,
      ].join("\n");
    } else {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Could not copy the result. Check your browser clipboard permissions.");
    }
  };

  const parsedCalculationStartDate = parseDateOnly(calculationStartDate);

  return (
    <section className="date-calculator" aria-label="Date calculator">
      <div className="date-calculator__card">
        <div className="date-calculator__mode-switch" aria-label="Calculation mode">
          <button
            type="button"
            className={`date-calculator__mode${mode === "difference" ? " date-calculator__mode--active" : ""}`}
            aria-pressed={mode === "difference"}
            onClick={() => {
              setMode("difference");
              setCopyError("");
              setCopied(false);
            }}
          >
            Date Difference
          </button>
          <button
            type="button"
            className={`date-calculator__mode${mode === "add-subtract" ? " date-calculator__mode--active" : ""}`}
            aria-pressed={mode === "add-subtract"}
            onClick={() => {
              setMode("add-subtract");
              setCopyError("");
              setCopied(false);
            }}
          >
            Add or Subtract Time
          </button>
        </div>

        {mode === "difference" ? (
          <form className="date-calculator__form" onSubmit={calculateDifference} noValidate>
            <div className="date-calculator__fields">
              <div className="date-calculator__field">
                <label className="date-calculator__label" htmlFor="date-difference-start">
                  Start date
                </label>
                <input
                  id="date-difference-start"
                  className="date-calculator__input"
                  type="date"
                  value={startDate}
                  aria-invalid={Boolean(differenceErrors.startDate)}
                  aria-describedby={differenceErrors.startDate ? "date-difference-start-error" : undefined}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setDifferenceErrors({});
                    setDifferenceResult(null);
                    setCopied(false);
                  }}
                />
                {differenceErrors.startDate && (
                  <p id="date-difference-start-error" className="date-calculator__error" role="alert">
                    {differenceErrors.startDate}
                  </p>
                )}
              </div>
              <div className="date-calculator__field">
                <label className="date-calculator__label" htmlFor="date-difference-end">
                  End date
                </label>
                <input
                  id="date-difference-end"
                  className="date-calculator__input"
                  type="date"
                  value={endDate}
                  aria-invalid={Boolean(differenceErrors.endDate)}
                  aria-describedby={differenceErrors.endDate ? "date-difference-end-error" : undefined}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setDifferenceErrors({});
                    setDifferenceResult(null);
                    setCopied(false);
                  }}
                />
                {differenceErrors.endDate && (
                  <p id="date-difference-end-error" className="date-calculator__error" role="alert">
                    {differenceErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            <label className="date-calculator__checkbox">
              <input
                type="checkbox"
                checked={includeEndDate}
                onChange={(event) => {
                  setIncludeEndDate(event.target.checked);
                  setDifferenceResult(null);
                  setCopied(false);
                }}
                aria-describedby="date-calculator-inclusion-help"
              />
              <span>Include end date</span>
            </label>
            <p id="date-calculator-inclusion-help" className="date-calculator__help">
              By default, elapsed time counts the days between dates exclusively. Including the end
              date adds one day to the count.
            </p>

            <div className="date-calculator__actions">
              <button className="date-calculator__button date-calculator__button--primary" type="submit">
                Calculate Difference
              </button>
              <button className="date-calculator__button date-calculator__button--secondary" type="button" onClick={resetDifference}>
                Reset
              </button>
              {differenceResult && (
                <button className="date-calculator__button date-calculator__button--secondary" type="button" onClick={copyResult}>
                  {copied ? "Copied!" : "Copy Result"}
                </button>
              )}
            </div>
          </form>
        ) : (
          <form className="date-calculator__form" onSubmit={calculateAddedDate} noValidate>
            <div className="date-calculator__fields date-calculator__fields--time">
              <div className="date-calculator__field">
                <label className="date-calculator__label" htmlFor="date-calculation-start">
                  Starting date
                </label>
                <input
                  id="date-calculation-start"
                  className="date-calculator__input"
                  type="date"
                  value={calculationStartDate}
                  aria-invalid={Boolean(dateErrors.startDate)}
                  aria-describedby={dateErrors.startDate ? "date-calculation-start-error" : undefined}
                  onChange={(event) => {
                    setCalculationStartDate(event.target.value);
                    setDateErrors({});
                    setNewDate(null);
                    setCopied(false);
                  }}
                />
                {dateErrors.startDate && (
                  <p id="date-calculation-start-error" className="date-calculator__error" role="alert">
                    {dateErrors.startDate}
                  </p>
                )}
              </div>
              <div className="date-calculator__field">
                <label className="date-calculator__label" htmlFor="date-calculation-operation">
                  Operation
                </label>
                <select
                  id="date-calculation-operation"
                  className="date-calculator__input"
                  value={operation}
                  onChange={(event) => {
                    setOperation(event.target.value as DateOperation);
                    setDateErrors({});
                    setNewDate(null);
                    setCopied(false);
                  }}
                >
                  <option value="add">Add</option>
                  <option value="subtract">Subtract</option>
                </select>
              </div>
              <div className="date-calculator__field">
                <label className="date-calculator__label" htmlFor="date-calculation-amount">
                  Amount
                </label>
                <input
                  id="date-calculation-amount"
                  className="date-calculator__input"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={amount}
                  aria-invalid={Boolean(dateErrors.amount)}
                  aria-describedby={dateErrors.amount ? "date-calculation-amount-error" : undefined}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setDateErrors({});
                    setNewDate(null);
                    setCopied(false);
                  }}
                />
                {dateErrors.amount && (
                  <p id="date-calculation-amount-error" className="date-calculator__error" role="alert">
                    {dateErrors.amount}
                  </p>
                )}
              </div>
              <div className="date-calculator__field">
                <label className="date-calculator__label" htmlFor="date-calculation-unit">
                  Unit
                </label>
                <select
                  id="date-calculation-unit"
                  className="date-calculator__input"
                  value={unit}
                  onChange={(event) => {
                    setUnit(event.target.value as DateUnit);
                    setDateErrors({});
                    setNewDate(null);
                    setCopied(false);
                  }}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>

            {dateErrors.general && <p className="date-calculator__error" role="alert">{dateErrors.general}</p>}
            <div className="date-calculator__actions">
              <button className="date-calculator__button date-calculator__button--primary" type="submit">
                Calculate New Date
              </button>
              <button className="date-calculator__button date-calculator__button--secondary" type="button" onClick={resetDateCalculation}>
                Reset
              </button>
              {newDate && (
                <button className="date-calculator__button date-calculator__button--secondary" type="button" onClick={copyResult}>
                  {copied ? "Copied!" : "Copy Result"}
                </button>
              )}
            </div>
          </form>
        )}

        {copyError && <p className="date-calculator__error" role="alert">{copyError}</p>}

        {mode === "difference" && differenceResult ? (
          <section className="date-calculator__result" aria-live="polite" aria-labelledby="date-difference-result-title">
            <h2 id="date-difference-result-title" className="date-calculator__result-title">
              Date Difference
            </h2>
            <p className="date-calculator__result-duration">{formatDuration(differenceResult)}</p>
            <div className="date-calculator__result-grid">
              <div className="date-calculator__result-item">
                <span>Total difference ({includeEndDate ? "inclusive" : "exclusive"})</span>
                <strong>{pluralize(differenceResult.totalDays, "day")}</strong>
              </div>
              <div className="date-calculator__result-item">
                <span>Weeks and days</span>
                <strong>{pluralize(differenceResult.weeks, "week")} and {pluralize(differenceResult.remainingWeekDays, "day")}</strong>
              </div>
              <div className="date-calculator__result-item">
                <span>Complete months</span>
                <strong>{pluralize(differenceResult.totalMonths, "month")} and {pluralize(differenceResult.days, "day")}</strong>
              </div>
              <div className="date-calculator__result-item">
                <span>Start date</span>
                <strong>{differenceResult.startWeekday}</strong>
              </div>
              <div className="date-calculator__result-item">
                <span>End date</span>
                <strong>{differenceResult.endWeekday}</strong>
              </div>
            </div>
          </section>
        ) : mode === "add-subtract" && newDate && parsedCalculationStartDate ? (
          <section className="date-calculator__result" aria-live="polite" aria-labelledby="new-date-result-title">
            <h2 id="new-date-result-title" className="date-calculator__result-title">Calculated date</h2>
            <p className="date-calculator__result-duration">{formatDateOnly(newDate)}</p>
            <div className="date-calculator__result-grid">
              <div className="date-calculator__result-item">
                <span>Day of the week</span>
                <strong>{getWeekday(newDate)}</strong>
              </div>
              <div className="date-calculator__result-item">
                <span>Original date</span>
                <strong>{formatDateOnly(parsedCalculationStartDate)}</strong>
              </div>
              <div className="date-calculator__result-item">
                <span>Time {operation === "add" ? "added" : "subtracted"}</span>
                <strong>{pluralize(Number(amount), UNIT_LABELS[unit])}</strong>
              </div>
            </div>
            <p className="date-calculator__explanation">
              {formatDateOnly(parsedCalculationStartDate)} {operation === "add" ? "plus" : "minus"}{" "}
              {pluralize(Number(amount), UNIT_LABELS[unit])} is {formatDateOnly(newDate)}.
            </p>
          </section>
        ) : (
          <div className="date-calculator__empty" role="status">
            Choose your dates and calculate to see your result here.
          </div>
        )}
      </div>
    </section>
  );
}
