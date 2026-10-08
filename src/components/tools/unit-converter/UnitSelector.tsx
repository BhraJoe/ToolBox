// ─── Unit Selector Component ────────────────────────────────────────────────

import { useState } from 'react';
import type { UnitDefinition } from '../../../utils/unitConverter';

interface UnitSelectorProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  unitValue: string;
  onUnitChange: (value: string) => void;
  units: UnitDefinition[];
  disabled?: boolean;
  error?: string;
}

export default function UnitSelector({
  label,
  value,
  onValueChange,
  unitValue,
  onUnitChange,
  units,
  disabled,
  error,
}: UnitSelectorProps) {
  const [isUnitOpen, setIsUnitOpen] = useState(false);

  const findCurrentUnit = () => {
    return units.find(unit => unit.id === unitValue) || units[0];
  };

  const handleUnitSelect = (unitId: string) => {
    onUnitChange(unitId);
    setIsUnitOpen(false);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onValueChange(newValue);
  };

  return (
    <div className="unit-selector">
      <label htmlFor={`unit-value-${label}`} className="unit-selector__label">
        {label}
      </label>
      <div className={`unit-selector__input-wrapper${error ? ' unit-selector__input-wrapper--error' : ''}`}>
        <input
          id={`unit-value-${label}`}
          type="text"
          value={value}
          onChange={handleValueChange}
          disabled={disabled}
          className={`unit-selector__input${error ? ' unit-selector__input--error' : ''}`}
          placeholder="Enter value"
        />
      </div>
      <div
        className={`unit-selector__header${isUnitOpen ? ' unit-selector__header--open' : ''}`}
      >
        <span className="unit-selector__unit">
          {findCurrentUnit().name}
          <span className="unit-selector__symbol">
            {findCurrentUnit().symbol ? ` (${findCurrentUnit().symbol})` : ''}
          </span>
        </span>
        <span className="unit-selector__arrow">
          {isUnitOpen ? '▲' : '▼'}
        </span>
      </div>

      {isUnitOpen && (
        <div className="unit-selector__list">
          {units.map(unit => (
            <button
              key={unit.id}
              type="button"
              className={`unit-selector__item${unit.id === unitValue ? ' unit-selector__item--active' : ''}`}
              onClick={() => handleUnitSelect(unit.id)}
            >
              {unit.name}
              {unit.symbol ? <span className="unit-selector__item-symbol">{unit.symbol}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}