import { Link, useLocation } from 'react-router-dom';
import { getToolByRoute } from '../data/tools';
import Icon from '../components/common/Icon';

export default function ToolPage() {
  const location = useLocation();
  const tool = getToolByRoute(location.pathname);

  if (!tool) {
    return (
      <div className="tool-page">
        <div className="tool-page__icon">
          <Icon name="help-circle" size={48} />
        </div>
        <h1 className="tool-page__title">Tool Not Found</h1>
        <p className="tool-page__desc">This tool does not exist.</p>
        <Link to="/" className="tool-page__back">Back to Dashboard</Link>
      </div>
    );
  }

  const categoryRoute = `/${tool.category}`;

  return (
    <div className="tool-page">
      <div className="tool-page__icon">
        <Icon name={tool.icon} size={52} />
      </div>
      <h1 className="tool-page__title">{tool.name}</h1>
      {tool.status === 'coming-soon' ? (
        <>
          <span className="tool-page__badge">Coming Soon</span>
          <p className="tool-page__desc">This tool will be available soon.</p>
        </>
      ) : (
        <p className="tool-page__desc">{tool.description}</p>
      )}
      <Link to={categoryRoute} className="tool-page__back">← Back to {tool.category}</Link>
    </div>
  );
}
