import Calculator from '../../components/tools/calculator/Calculator';
import Icon from '../../components/common/Icon';
import { Keyboard } from 'lucide-react';

export default function CalculatorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="calculator" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Calculator</h1>
          <p className="tool-view__desc">
            Perform basic and percentage calculations with full keyboard support and history.
          </p>
        </div>
      </div>

      <Calculator />

      <div className="calculator-shortcuts">
        <div className="calculator-shortcuts__title">
          <Keyboard size={16} />
          <span>Keyboard Shortcuts</span>
        </div>
        <div className="calculator-shortcuts__grid">
          <div className="calculator-shortcut">
            <kbd>0</kbd>–<kbd>9</kbd> <span>Numbers</span>
          </div>
          <div className="calculator-shortcut">
            <kbd>+</kbd> <kbd>−</kbd> <kbd>*</kbd> <kbd>/</kbd> <span>Operators</span>
          </div>
          <div className="calculator-shortcut">
            <kbd>Enter</kbd> / <kbd>=</kbd> <span>Calculate</span>
          </div>
          <div className="calculator-shortcut">
            <kbd>Backspace</kbd> <span>Delete</span>
          </div>
          <div className="calculator-shortcut">
            <kbd>Esc</kbd> <span>Clear (AC)</span>
          </div>
          <div className="calculator-shortcut">
            <kbd>%</kbd> <span>Percentage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
