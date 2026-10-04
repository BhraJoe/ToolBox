import Icon from '../common/Icon';

interface StatsCardProps {
  icon: string;
  label: string;
  value: number | string;
}

export default function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
    </div>
  );
}
