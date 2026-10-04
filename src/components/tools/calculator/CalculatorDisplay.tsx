interface CalculatorDisplayProps {
  expression: string;
  value: string;
  error: string | null;
}

export default function CalculatorDisplay({
  expression,
  value,
  error,
}: CalculatorDisplayProps) {
  return (
    <div
      className="calculator-display"
      role="region"
      aria-label="Calculator display"
      aria-live="polite"
    >
      <div className="calculator-display__expression" title={expression}>
        {expression || '\u00A0'}
      </div>
      <div
        className={`calculator-display__value${
          error ? ' calculator-display__value--error' : ''
        }`}
        title={error || value}
      >
        {error ? (
          <div className="calculator-display__error-box">
            <span className="calculator-display__error-title">Error</span>
            <span className="calculator-display__error-desc">{error}</span>
          </div>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
