import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { categories, getToolsByCategory, searchTools, type Tool } from '../../data/tools';
import SidebarCategory from '../navigation/SidebarCategory';
import ToolSearch from '../navigation/ToolSearch';
import Icon from '../common/Icon';

export default function Sidebar() {
  const { isCollapsed, toggleCollapse } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const searchResults = searchQuery ? searchTools(searchQuery) : [];

  return (
    <aside className={`sidebar${isCollapsed ? ' sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">
          <Wrench size={22} color="var(--color-primary)" />
        </span>
        {!isCollapsed && <span className="sidebar__brand-text">ToolBox</span>}
        <button
          className="sidebar__collapse-btn"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {/* Dashboard link */}
        {!isCollapsed && (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
              }
            >
              <span className="sidebar-item__icon">
                <Icon name="layout-dashboard" size={18} />
              </span>
              <span className="sidebar-item__label">Dashboard</span>
            </NavLink>

            {/* Search */}
            <ToolSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              results={searchResults}
            />

            {/* Search Results or Categories */}
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
                      onClick={() => setSearchQuery('')}
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
                />
              ))
            )}
          </>
        )}

        {isCollapsed && (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
              }
              title="Dashboard"
            >
              <span className="sidebar-item__icon">
                <Icon name="layout-dashboard" size={18} />
              </span>
            </NavLink>
            {categories.map((cat) => (
              <NavLink
                key={cat.id}
                to={cat.route}
                className={({ isActive }) =>
                  `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
                }
                title={cat.name}
              >
                <span className="sidebar-item__icon">
                  <Icon name={cat.icon} size={18} />
                </span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="sidebar__footer">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
            }
          >
            <span className="sidebar-item__icon">
              <Icon name="settings" size={18} />
            </span>
            <span className="sidebar-item__label">Settings</span>
          </NavLink>
        </div>
      )}
      {isCollapsed && (
        <div className="sidebar__footer">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
            }
            title="Settings"
          >
            <span className="sidebar-item__icon">
              <Icon name="settings" size={18} />
            </span>
          </NavLink>
        </div>
      )}
    </aside>
  );
}
