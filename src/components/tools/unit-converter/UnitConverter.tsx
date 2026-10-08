// ─── Unit Converter Component ──────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import type { UnitCategory } from '../../../utils/unitConverter';
import { getUnitsByCategory, convertValue, formatValue, getConversionFormula } from '../../../utils/unitConverter';
import CategorySelector from './CategorySelector';
import UnitSelector from './UnitSelector';
import ConversionResult from './ConversionResult';

const CATEGORIES: { id: UnitCategory; name: string }[] = [
  { id: 'length', name: 'Length' },
  { id: 'weight', name: 'Weight' },
  { id: 'temperature', name: 'Temperature' },
  { id: 'area', name: 'Area' },
  { id: 'volume', name: 'Volume' },
  { id: 'speed', name: 'Speed' },
  { id: 'time', name: 'Time' },
  { id: 'data', name: 'Data' },
];

export default function UnitConverter() {
  const [category, setCategory] = useState<UnitCategory>('length');
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [toUnit, setToUnit] = useState<string>('km');
  const [inputValue, setInputValue] = useState<string>('1');

  const units = getUnitsByCategory(category);
  const fromUnitObj = units.find(u => u.id === fromUnit) || units[0];
  const toUnitObj = units.find(u => u.id === toUnit) || units[1] || units[0];
  const fromUnitName = fromUnitObj?.name || '';
  const toUnitName = toUnitObj?.name || '';

  const { result, error, formula } = useMemo(() => {
    if (!inputValue || inputValue === '.') {
      return { result: '', error: '', formula: null };
    }

    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      return { result: '', error: 'Please enter a valid number', formula: null };
    }

    try {
      const convertedValue = convertValue(numValue, category, fromUnit, toUnit);
      return {
        result: formatValue(convertedValue),
        error: '',
        formula: getConversionFormula(category, fromUnit, toUnit, numValue),
      };
    } catch {
      return { result: '', error: 'Conversion error', formula: null };
    }
  }, [inputValue, category, fromUnit, toUnit]);

  const handleSwapUnits = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }, [fromUnit, toUnit]);

  const handleReset = useCallback(() => {
    setCategory('length');
    setFromUnit('m');
    setToUnit('km');
    setInputValue('1');
  }, []);

  const handleCopyResult = useCallback(() => {
    if (result && result !== 'Error' && result !== '') {
      const text = `${inputValue} ${fromUnitName} = ${result} ${toUnitName}`;
      void navigator.clipboard.writeText(text);
      
      const button = document.activeElement as HTMLButtonElement | null;
      const originalText = button?.textContent || 'Copy';
      if (button) {
        button.textContent = '✓ Copied';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    }
  }, [result, inputValue, fromUnitName, toUnitName]);

  const handleCategoryChange = useCallback((value: string) => {
    const newCategory = value as UnitCategory;
    setCategory(newCategory);
    const newUnits = getUnitsByCategory(newCategory);
    const firstUnit = newUnits[0];
    const secondUnit = newUnits[1] || newUnits[0];
    setFromUnit(firstUnit.id);
    setToUnit(secondUnit.id);
  }, []);

  const handleFromUnitChange = useCallback((value: string) => {
    if (value === toUnit) {
      setFromUnit(toUnit);
      setToUnit(fromUnit);
    } else {
      setFromUnit(value);
    }
  }, [fromUnit, toUnit]);

  const handleToUnitChange = useCallback((value: string) => {
    if (value === fromUnit) {
      setFromUnit(toUnit);
      setToUnit(fromUnit);
    } else {
      setToUnit(value);
    }
  }, [fromUnit, toUnit]);

  return (
    <div className="unit-converter">
      <div className="unit-converter__card">
        <div className="unit-converter__header">
          <h2>Unit Converter</h2>
          <p>Convert values between different units of measurement.</p>
        </div>

        <div className="unit-converter__controls">
          <CategorySelector
            value={category}
            onChange={handleCategoryChange}
            categories={CATEGORIES}
          />

          <div className="unit-converter__conversion-row">
            <UnitSelector
              label="From"
              value={inputValue}
              onValueChange={setInputValue}
              unitValue={fromUnit}
              onUnitChange={handleFromUnitChange}
              units={units}
              error={error}
            />

            <button
              type="button"
              className="unit-converter__swap-btn"
              onClick={handleSwapUnits}
              aria-label="Swap units"
            >
              ⇅
            </button>

            <UnitSelector
              label="To"
              value={result}
              onValueChange={() => {}}
              unitValue={toUnit}
              onUnitChange={handleToUnitChange}
              units={units}
              disabled={true}
            />
          </div>

          {error && (
            <div className="unit-converter__error" role="alert">
              {error}
            </div>
          )}

          <ConversionResult
            result={result}
            onCopy={handleCopyResult}
            fromValue={inputValue}
            fromUnitName={fromUnitName}
            toUnitName={toUnitName}
          />

          <div className="unit-converter__actions">
            <button
              type="button"
              className="unit-converter__btn unit-converter__btn--secondary"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>

          {formula && (
            <div className="unit-converter__formula">
              <h4>Conversion</h4>
              <p>{formula}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}