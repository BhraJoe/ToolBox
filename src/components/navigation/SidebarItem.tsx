import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';

interface SidebarItemProps {
  to: string;
  icon: string;
  label: string;
  onClick?: () => void;
}

export default function SidebarItem({ to, icon, label, onClick }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
      }
      onClick={onClick}
    >
      <span className="sidebar-item__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="sidebar-item__label">{label}</span>
    </NavLink>
  );
}
