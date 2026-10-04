import CalculatorButton from './CalculatorButton';
import type { Operator } from './types';
import { Delete } from 'lucide-react';

interface CalculatorKeypadProps {
  onDigit: (digit: string) => void;
  onOperator: (operator: Operator) => void;
  onEquals: () => void;
  onClear: () => void;
  onDelete: () => void;
  onToggleSign: () => void;
  onPercentage: () => void;
  onDecimal: () => void;
  activeOperator: Operator | null;
}

export default function CalculatorKeypad({
  onDigit,
  onOperator,
  onEquals,
  onClear,
  onDelete,
  onToggleSign,
  onPercentage,
  onDecimal,
  activeOperator,
}: CalculatorKeypadProps) {
  return (
    <div className="calculator-keypad" role="group" aria-label="Calculator keypad">
      {/* Row 1 */}
      <CalculatorButton
        label="AC"
        onClick={onClear}
        type="action"
        ariaLabel="All Clear"
      />
      <CalculatorButton
        label={<Delete size={18} />}
        onClick={onDelete}
        type="action"
        ariaLabel="Backspace"
      />
      <CalculatorButton
        label="%"
        onClick={onPercentage}
        type="action"
        ariaLabel="Percentage"
      />
      <CalculatorButton
        label="÷"
        onClick={() => onOperator('/')}
        type="operator"
        ariaLabel="Divide"
        className={activeOperator === '/' ? 'calculator-btn--active' : ''}
      />

      {/* Row 2 */}
      <CalculatorButton label="7" onClick={() => onDigit('7')} />
      <CalculatorButton label="8" onClick={() => onDigit('8')} />
      <CalculatorButton label="9" onClick={() => onDigit('9')} />
      <CalculatorButton
        label="×"
        onClick={() => onOperator('*')}
        type="operator"
        ariaLabel="Multiply"
        className={activeOperator === '*' ? 'calculator-btn--active' : ''}
      />

      {/* Row 3 */}
      <CalculatorButton label="4" onClick={() => onDigit('4')} />
      <CalculatorButton label="5" onClick={() => onDigit('5')} />
      <CalculatorButton label="6" onClick={() => onDigit('6')} />
      <CalculatorButton
        label="−"
        onClick={() => onOperator('-')}
        type="operator"
        ariaLabel="Subtract"
        className={activeOperator === '-' ? 'calculator-btn--active' : ''}
      />

      {/* Row 4 */}
      <CalculatorButton label="1" onClick={() => onDigit('1')} />
      <CalculatorButton label="2" onClick={() => onDigit('2')} />
      <CalculatorButton label="3" onClick={() => onDigit('3')} />
      <CalculatorButton
        label="+"
        onClick={() => onOperator('+')}
        type="operator"
        ariaLabel="Add"
        className={activeOperator === '+' ? 'calculator-btn--active' : ''}
      />

      {/* Row 5 */}
      <CalculatorButton
        label="+/-"
        onClick={onToggleSign}
        type="action"
        ariaLabel="Toggle positive or negative"
      />
      <CalculatorButton label="0" onClick={() => onDigit('0')} />
      <CalculatorButton label="." onClick={onDecimal} ariaLabel="Decimal point" />
      <CalculatorButton
        label="="
        onClick={onEquals}
        type="equals"
        ariaLabel="Equals"
      />
    </div>
  );
}
