import type {
  CalculationConfig,
  OriginalMode,
} from '../../../utils/percentageCalculator';

interface InputFormProps {
  config: CalculationConfig;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
  mode?: OriginalMode;
  onModeChange?: (mode: OriginalMode) => void;
}

export default function InputForm({
  config,
  values,
  onChange,
  errors,
  mode,
  onModeChange,
}: InputFormProps) {
  return (
    <div className="percentage-calculator__inputs">
      {config.inputs.map((field) => {
        const fieldValue = values[field.id] || "";
        const hasError = errors[field.id];
        const showValue = fieldValue.trim() !== "" || hasError;

        if (!showValue) {
          return null;
        }

        return (
          <div key={field.id} className="percentage-calculator__input-group">
            <label htmlFor={`${field.id}`} className="percentage-calculator__label">
              {field.label}
            </label>
            <div className="percentage-calculator__input-wrapper">
              <input
                id={field.id}
                type="text"
                value={fieldValue}
                onChange={(e) => onChange(field.id, e.target.value)}
                className={`percentage-calculator__input ${hasError ? "percentage-calculator__input--error" : ""}`}
                placeholder={field.placeholder}
              />
              {field.suffix && (
                <span className="percentage-calculator__input-suffix">{field.suffix}</span>
              )}
            </div>
            {hasError && (
              <div className="percentage-calculator__error">{hasError}</div>
            )}
          </div>
        );
      })}

      {config.type === "original" && mode && onModeChange && (
        <div key="mode-toggle" className="percentage-calculator__mode-toggle">
          <label
            htmlFor="mode-increase"
            className={`percentage-calculator__mode-label${mode === "increase" ? " percentage-calculator__mode-label--active" : ""}`}
          >
            <input
              type="radio"
              id="mode-increase"
              name="original-mode"
              value="increase"
              checked={mode === "increase"}
              onChange={() => onModeChange("increase")}
              className="percentage-calculator__mode-input"
            />
            <span>Percentage Increase</span>
          </label>
          <label
            htmlFor="mode-decrease"
            className={`percentage-calculator__mode-label${mode === "decrease" ? " percentage-calculator__mode-label--active" : ""}`}
          >
            <input
              type="radio"
              id="mode-decrease"
              name="original-mode"
              value="decrease"
              checked={mode === "decrease"}
              onChange={() => onModeChange("decrease")}
              className="percentage-calculator__mode-input"
            />
            <span>Percentage Decrease</span>
          </label>
        </div>
      )}
    </div>
  );
}