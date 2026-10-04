import { useNavigate } from 'react-router-dom';
import type { Category } from '../../data/tools';
import Icon from '../common/Icon';

interface CategoryCardProps {
  category: Category;
  toolCount: number;
}

export default function CategoryCard({ category, toolCount }: CategoryCardProps) {
  const navigate = useNavigate();

  return (
    <div className="category-card">
      <div className="category-card__icon">
        <Icon name={category.icon} size={28} />
      </div>
      <div className="category-card__name">{category.name}</div>
      <div className="category-card__desc">{category.description}</div>
      <div className="category-card__footer">
        <span className="category-card__count">{toolCount} tools</span>
        <button
          className="category-card__btn"
          onClick={() => navigate(category.route)}
        >
          Explore
        </button>
      </div>
    </div>
  );
}
