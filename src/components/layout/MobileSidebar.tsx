import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, Wrench } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { categories, getToolsByCategory, searchTools, type Tool } from '../../data/tools';
import SidebarCategory from '../navigation/SidebarCategory';
import ToolSearch from '../navigation/ToolSearch';
import Icon from '../common/Icon';

export default function MobileSidebar() {
  const { isMobileOpen, closeMobile } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const searchResults = searchQuery ? searchTools(searchQuery) : [];

  if (!isMobileOpen) return null;

  const handleNavClick = () => {
    setSearchQuery('');
    closeMobile();
  };

  return (
    <>
      <div className="mobile-overlay" onClick={closeMobile} />
      <div className="mobile-sidebar">
        {/* Brand */}
        <div className="sidebar__brand">
          <span className="sidebar__brand-icon">
            <Wrench size={22} color="var(--color-primary)" />
          </span>
          <span className="sidebar__brand-text">ToolBox</span>
          <button
            className="sidebar__collapse-btn"
            onClick={closeMobile}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
            }
            onClick={handleNavClick}
          >
            <span className="sidebar-item__icon">
              <Icon name="layout-dashboard" size={18} />
            </span>
            <span className="sidebar-item__label">Dashboard</span>
          </NavLink>

          <ToolSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
          />

          {searchQuery ? (
            <div className="sidebar-search__results">
              {searchResults.length === 0 ? (
                <div className="sidebar-item" style={{ color: 'var(--text-tertiary)', fontSize: 13, cursor: 'default' }}>
                  No tools found
                </div>
              ) : (
                searchResults.map((tool: Tool) => (
                  <NavLink
                    key={tool.id}
                    to={tool.route}
                    className={({ isActive }) =>
                      `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
                    }
                    onClick={handleNavClick}
                  >
                    <span className="sidebar-item__icon">
                      <Icon name={tool.icon} size={16} />
                    </span>
                    <span className="sidebar-item__label">{tool.name}</span>
                  </NavLink>
                ))
              )}
            </div>
          ) : (
            categories.map((cat) => (
              <SidebarCategory
                key={cat.id}
                category={cat}
                tools={getToolsByCategory(cat.id)}
                currentPath={location.pathname}
                onItemClick={handleNavClick}
              />
            ))
          )}
        </nav>

        <div className="sidebar__footer">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
            }
            onClick={handleNavClick}
          >
            <span className="sidebar-item__icon">
              <Icon name="settings" size={18} />
            </span>
            <span className="sidebar-item__label">Settings</span>
          </NavLink>
        </div>
      </div>
    </>
  );
}
