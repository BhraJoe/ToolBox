import { useState, useEffect, useCallback } from 'react';
import CalculatorDisplay from './CalculatorDisplay';
import CalculatorKeypad from './CalculatorKeypad';
import CalculatorHistory from './CalculatorHistory';
import type { Operator, HistoryItem } from './types';

function formatNumber(num: number): string {
  if (!isFinite(num) || isNaN(num)) {
    return 'Error';
  }
  // Remove floating-point artifacts e.g. 0.1 + 0.2 = 0.30000000000000004
  const rounded = parseFloat(num.toPrecision(12));
  return String(rounded);
}

function getOperatorSymbol(op: Operator): string {
  switch (op) {
    case '+':
      return '+';
    case '-':
      return '−';
    case '*':
      return '×';
    case '/':
      return '÷';
    default:
      return op;
  }
}

export default function Calculator() {
  const [currentValue, setCurrentValue] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [expression, setExpression] = useState<string>('');
  const [isNewNumber, setIsNewNumber] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Clear all
  const handleClear = useCallback(() => {
    setCurrentValue('0');
    setPreviousValue(null);
    setOperator(null);
    setExpression('');
    setIsNewNumber(true);
    setError(null);
  }, []);

  // Delete last digit (Backspace)
  const handleDelete = useCallback(() => {
    if (error) {
      handleClear();
      return;
    }
    if (isNewNumber) {
      return;
    }
    if (currentValue.length === 1 || (currentValue.length === 2 && currentValue.startsWith('-'))) {
      setCurrentValue('0');
      setIsNewNumber(true);
    } else {
      setCurrentValue(currentValue.slice(0, -1));
    }
  }, [currentValue, isNewNumber, error, handleClear]);

  // Handle digit input
  const handleDigit = useCallback(
    (digit: string) => {
      if (error) {
        setError(null);
        setCurrentValue(digit);
        setIsNewNumber(false);
        return;
      }

      if (isNewNumber) {
        setCurrentValue(digit);
        setIsNewNumber(false);
      } else {
        if (currentValue === '0' && digit !== '.') {
          setCurrentValue(digit);
        } else if (currentValue.length < 16) {
          setCurrentValue(currentValue + digit);
        }
      }
    },
    [currentValue, isNewNumber, error]
  );

  // Decimal
  const handleDecimal = useCallback(() => {
    if (error) {
      setError(null);
      setCurrentValue('0.');
      setIsNewNumber(false);
      return;
    }

    if (isNewNumber) {
      setCurrentValue('0.');
      setIsNewNumber(false);
    } else if (!currentValue.includes('.')) {
      setCurrentValue(currentValue + '.');
    }
  }, [currentValue, isNewNumber, error]);

  // Toggle positive/negative
  const handleToggleSign = useCallback(() => {
    if (error) return;
    if (currentValue === '0') return;

    if (currentValue.startsWith('-')) {
      setCurrentValue(currentValue.slice(1));
    } else {
      setCurrentValue('-' + currentValue);
    }
  }, [currentValue, error]);

  // Percentage
  const handlePercentage = useCallback(() => {
    if (error) return;
    const current = parseFloat(currentValue);
    if (isNaN(current)) return;

    if (previousValue !== null && operator !== null) {
      const prev = parseFloat(previousValue);
      // For addition/subtraction, calculate percentage of previous value (e.g. 50 + 25% = 50 + 12.5)
      let pctValue: number;
      if (operator === '+' || operator === '-') {
        pctValue = (prev * current) / 100;
      } else {
        pctValue = current / 100;
      }
      const formatted = formatNumber(pctValue);
      setCurrentValue(formatted);
      setExpression(`${previousValue} ${getOperatorSymbol(operator)} ${formatted}`);
    } else {
      const pctValue = current / 100;
      const formatted = formatNumber(pctValue);
      setCurrentValue(formatted);
      setExpression(`${currentValue}%`);
      setIsNewNumber(true);
    }
  }, [currentValue, previousValue, operator, error]);

  // Core execution helper
  const compute = useCallback(
    (prevStr: string, currentStr: string, op: Operator): { result?: string; error?: string } => {
      const prev = parseFloat(prevStr);
      const current = parseFloat(currentStr);

      if (isNaN(prev) || isNaN(current)) {
        return { error: 'Invalid calculation' };
      }

      let res: number;
      switch (op) {
        case '+':
          res = prev + current;
          break;
        case '-':
          res = prev - current;
          break;
        case '*':
          res = prev * current;
          break;
        case '/':
          if (current === 0) {
            return { error: 'Cannot divide by zero' };
          }
          res = prev / current;
          break;
        default:
          return { error: 'Unknown operator' };
      }

      return { result: formatNumber(res) };
    },
    []
  );

  // Operator selection (+, -, *, /)
  const handleOperator = useCallback(
    (nextOperator: Operator) => {
      if (error) {
        setError(null);
      }

      if (previousValue === null) {
        setPreviousValue(currentValue);
        setOperator(nextOperator);
        setExpression(`${currentValue} ${getOperatorSymbol(nextOperator)}`);
        setIsNewNumber(true);
      } else if (operator !== null) {
        if (isNewNumber) {
          // Change operator if no new digit entered
          setOperator(nextOperator);
          setExpression(`${previousValue} ${getOperatorSymbol(nextOperator)}`);
        } else {
          // Chain operation
          const outcome = compute(previousValue, currentValue, operator);
          if (outcome.error) {
            setError(outcome.error);
            setPreviousValue(null);
            setOperator(null);
            setExpression('');
            setIsNewNumber(true);
          } else if (outcome.result !== undefined) {
            const exp = `${previousValue} ${getOperatorSymbol(operator)} ${currentValue}`;
            setHistory((prev) => [
              {
                id: Date.now().toString(),
                expression: exp,
                result: outcome.result!,
                timestamp: new Date(),
              },
              ...prev.slice(0, 19),
            ]);
            setCurrentValue(outcome.result);
            setPreviousValue(outcome.result);
            setOperator(nextOperator);
            setExpression(`${outcome.result} ${getOperatorSymbol(nextOperator)}`);
            setIsNewNumber(true);
          }
        }
      }
    },
    [currentValue, previousValue, operator, isNewNumber, error, compute]
  );

  // Equals (=)
  const handleEquals = useCallback(() => {
    if (error || previousValue === null || operator === null) {
      return;
    }

    const outcome = compute(previousValue, currentValue, operator);
    if (outcome.error) {
      setError(outcome.error);
      setPreviousValue(null);
      setOperator(null);
      setExpression('');
      setIsNewNumber(true);
    } else if (outcome.result !== undefined) {
      const exp = `${previousValue} ${getOperatorSymbol(operator)} ${currentValue}`;
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          expression: exp,
          result: outcome.result!,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19),
      ]);
      setExpression(`${exp} =`);
      setCurrentValue(outcome.result);
      setPreviousValue(null);
      setOperator(null);
      setIsNewNumber(true);
    }
  }, [previousValue, currentValue, operator, error, compute]);

  // Clear history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Load from history
  const handleSelectHistoryItem = useCallback((val: string) => {
    setCurrentValue(val);
    setIsNewNumber(true);
    setError(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is focused on an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('-');
      } else if (e.key === '*') {
        e.preventDefault();
        handleOperator('*');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('/');
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercentage();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleDigit,
    handleDecimal,
    handleOperator,
    handlePercentage,
    handleEquals,
    handleDelete,
    handleClear,
  ]);

  return (
    <div className="calculator-container">
      <div className="calculator-card">
        <CalculatorDisplay
          expression={expression}
          value={currentValue}
          error={error}
        />
        <CalculatorKeypad
          onDigit={handleDigit}
          onOperator={handleOperator}
          onEquals={handleEquals}
          onClear={handleClear}
          onDelete={handleDelete}
          onToggleSign={handleToggleSign}
          onPercentage={handlePercentage}
          onDecimal={handleDecimal}
          activeOperator={operator}
        />
      </div>

      <CalculatorHistory
        history={history}
        onClearHistory={handleClearHistory}
        onSelectHistoryItem={handleSelectHistoryItem}
      />
    </div>
  );
}
