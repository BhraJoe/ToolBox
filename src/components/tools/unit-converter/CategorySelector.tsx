// ─── Category Selector Component ────────────────────────────────────────────

import { useState } from 'react';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  categories: { id: string; name: string }[];
}

export default function CategorySelector({ value, onChange, categories }: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCategorySelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  const findCurrentCategory = () => {
    return categories.find(cat => cat.id === value) || categories[0];
  };

  return (
    <div className="category-selector">
      <div
        className={`category-selector__header${isOpen ? ' category-selector__header--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="category-selector__label">
          {findCurrentCategory().name}
        </span>
        <span className="category-selector__arrow">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div className="category-selector__list">
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              className={`category-selector__item${category.id === value ? ' category-selector__item--active' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}