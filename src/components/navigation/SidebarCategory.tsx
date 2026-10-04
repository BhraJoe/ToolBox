import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Category, Tool } from '../../data/tools';
import Icon from '../common/Icon';

interface SidebarCategoryProps {
  category: Category;
  tools: Tool[];
  currentPath: string;
  onItemClick?: () => void;
}

export default function SidebarCategory({ category, tools, currentPath, onItemClick }: SidebarCategoryProps) {
  const isActiveCategory = currentPath.startsWith(category.route);
  const [isOpen, setIsOpen] = useState(isActiveCategory);

  return (
    <div className="sidebar-category">
      <button
        className="sidebar-category__header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="sidebar-item__icon">
          <Icon name={category.icon} size={16} />
        </span>
        <span className="sidebar-item__label">{category.name}</span>
        <ChevronRight
          size={14}
          className={`sidebar-category__arrow${isOpen ? ' sidebar-category__arrow--open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="sidebar-category__items">
          {tools.map((tool) => (
            <NavLink
              key={tool.id}
              to={tool.route}
              className={({ isActive }) =>
                `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
              }
              onClick={onItemClick}
            >
              <span className="sidebar-item__icon">
                <Icon name={tool.icon} size={15} />
              </span>
              <span className="sidebar-item__label">{tool.name}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
