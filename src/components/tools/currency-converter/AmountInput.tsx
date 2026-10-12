import { useState, useEffect, type ChangeEvent } from 'react';

interface AmountInputProps {
  value: number | string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function AmountInput({
  value,
  onChange,
  disabled,
  placeholder = 'Enter amount',
}: AmountInputProps) {
  const [inputValue, setInputValue] = useState<string>(value === null || value === undefined ? '' : String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newValue = value === null || value === undefined ? '' : String(value);
    if (newValue !== inputValue) {
      setInputValue(newValue);
      setError(null);
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputValue(text);
    setError(null);

    if (text.trim() === '') {
      onChange(null);
      return;
    }

    const trimmed = text.trim();
    const num = parseFloat(trimmed);

    if (isNaN(num) || !isFinite(num)) {
      setError('Please enter a valid amount.');
      return;
    }

    if (num < 0) {
      setError('Negative amounts are not supported. Please enter a positive value.');
      return;
    }

    onChange(text);
  };

  return (
    <div className="amount-input">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`amount-input__input${error ? ' amount-input__input--error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? 'amount-input-error' : undefined}
      />
      {error && (
        <div
          id="amount-input-error"
          className="amount-input__error"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}