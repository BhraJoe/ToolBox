import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Currency } from '../../../types/currency';

interface CurrencySelectorProps {
  label: string;
  value: Currency;
  options: Currency[];
  onChange: (currency: Currency) => void;
  disabled?: boolean;
}

export default function CurrencySelector({
  label,
  value,
  options,
  onChange,
  disabled,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (selected: Currency) => {
    onChange(selected);
    setIsOpen(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleToggle = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <div className="currency-selector" ref={containerRef} style={{ position: 'relative' }}>
      <label htmlFor={`currency-${label}`} className="currency-selector__label">
        {label}
      </label>
      <div
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label} currency`}
        id={`currency-${label}`}
        className={`currency-selector__header${isOpen ? ' currency-selector__header--open' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
      >
        <span className="currency-selector__selected">
          <span className="currency-selector__code">{value.code}</span>
          <span className="currency-selector__name">{value.name}</span>
        </span>
        <span className="currency-selector__arrow">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div className="currency-selector__list">
          <input
            ref={searchInputRef}
            type="text"
            className="currency-selector__search"
            placeholder="Search currency..."
            value={search}
            onChange={handleSearchChange}
            onClick={(e) => e.stopPropagation()}
          />
          {filteredOptions.length === 0 ? (
            <div className="currency-selector__empty">No currencies found</div>
          ) : (
            filteredOptions.map((currency) => (
              <button
                key={currency.code}
                type="button"
                role="option"
                aria-selected={currency.code === value.code}
                className={`currency-selector__item${currency.code === value.code ? ' currency-selector__item--active' : ''}`}
                onClick={() => handleSelect(currency)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="currency-selector__item-code">{currency.code}</span>
                <span className="currency-selector__item-name">{currency.name}</span>
                <span className="currency-selector__item-symbol">{currency.symbol}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
