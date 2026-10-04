import type { ButtonType } from './types';
import type { ReactNode } from 'react';

interface CalculatorButtonProps {
  label: ReactNode;
  onClick: () => void;
  type?: ButtonType;
  ariaLabel?: string;
  className?: string;
  colSpan?: number;
  disabled?: boolean;
}

export default function CalculatorButton({
  label,
  onClick,
  type = 'digit',
  ariaLabel,
  className = '',
  colSpan = 1,
  disabled = false,
}: CalculatorButtonProps) {
  const typeClasses: Record<ButtonType, string> = {
    digit: 'calculator-btn--digit',
    operator: 'calculator-btn--operator',
    action: 'calculator-btn--action',
    equals: 'calculator-btn--equals',
  };

  return (
    <button
      type="button"
      className={`calculator-btn ${typeClasses[type]} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
      disabled={disabled}
      style={colSpan > 1 ? { gridColumn: `span ${colSpan}` } : undefined}
    >
      {label}
    </button>
  );
}
