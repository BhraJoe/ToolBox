import { useState, useRef, useEffect } from 'react';
import type { CalculationType } from '../../../utils/percentageCalculator';
import { CALCULATION_CONFIGS } from '../../../utils/percentageCalculator';

interface CalculationSelectorProps {
  value: CalculationType;
  onChange: (type: CalculationType) => void;
}

export default function CalculationSelector({ value, onChange }: CalculationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConfig = CALCULATION_CONFIGS.find(c => c.type === value);
  const currentTitle = currentConfig?.title || "What is X% of Y?";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (type: CalculationType) => {
    onChange(type);
    setIsOpen(false);
  };

  return (
    <div className="percentage-calculator__selector-wrapper" ref={containerRef}>
      <label
        htmlFor="calculation-type-select"
        className="percentage-calculator__label"
      >
        Calculation Type
      </label>
      <button
        id="calculation-type-select"
        type="button"
        className={`percentage-calculator__select${isOpen ? " percentage-calculator__select--open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select calculation type"
      >
        <span>{currentTitle}</span>
        <span className="percentage-calculator__select-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="percentage-calculator__select-list" role="listbox">
          {CALCULATION_CONFIGS.map((config) => (
            <button
              key={config.type}
              type="button"
              className={`percentage-calculator__select-item${config.type === value ? " percentage-calculator__select-item--active" : ""}`}
              onClick={() => handleSelect(config.type)}
              role="option"
              aria-selected={config.type === value}
            >
              {config.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
