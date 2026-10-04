import Welcome from '../components/dashboard/Welcome';
import StatsCard from '../components/dashboard/StatsCard';
import CategoryCard from '../components/dashboard/CategoryCard';
import { categories, getToolCount, getCategoryCount, getComingSoonCount, getToolCountByCategory } from '../data/tools';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <Welcome />

      <div className="stats-grid">
        <StatsCard icon="wrench" label="Total Tools" value={getToolCount()} />
        <StatsCard icon="folder" label="Categories" value={getCategoryCount()} />
        <StatsCard icon="star" label="Favorites" value={0} />
        <StatsCard icon="rocket" label="Coming Soon" value={getComingSoonCount()} />
      </div>

      <div>
        <h2 className="categories-section__title">Categories</h2>
        <div className="categories-grid">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              toolCount={getToolCountByCategory(cat.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
