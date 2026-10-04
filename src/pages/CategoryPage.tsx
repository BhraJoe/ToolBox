import { Link, useLocation } from 'react-router-dom';
import { getCategoryById, getToolsByCategory } from '../data/tools';
import Icon from '../components/common/Icon';
import { CheckCircle2, Clock } from 'lucide-react';

export default function CategoryPage() {
  const location = useLocation();
  const segment = location.pathname.split('/').filter(Boolean)[0];
  const category = segment ? getCategoryById(segment) : undefined;
  const tools = segment ? getToolsByCategory(segment) : [];

  if (!category) {
    return (
      <div className="tool-page">
        <div className="tool-page__icon">
          <Icon name="help-circle" size={48} />
        </div>
        <h1 className="tool-page__title">Category Not Found</h1>
        <p className="tool-page__desc">This category does not exist.</p>
        <Link to="/" className="tool-page__back">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="category-page__header">
        <span className="category-page__icon">
          <Icon name={category.icon} size={32} />
        </span>
        <div className="category-page__info">
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
      </div>

      <div className="tools-grid">
        {tools.map((tool) => (
          <Link key={tool.id} to={tool.route} className="tool-card">
            <div className="tool-card__icon">
              <Icon name={tool.icon} size={24} />
            </div>
            <div className="tool-card__name">{tool.name}</div>
            <div className="tool-card__desc">{tool.description}</div>
            <div className={`tool-card__status tool-card__status--${tool.status}`}>
              {tool.status === 'available' ? (
                <>
                  <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Available
                </>
              ) : (
                <>
                  <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Coming Soon
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
