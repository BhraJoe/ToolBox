import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { searchTools, type Tool } from '../../data/tools';
import Icon from '../common/Icon';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { openMobile } = useSidebar();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = searchQuery ? searchTools(searchQuery) : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (tool: Tool) => {
    navigate(tool.route);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <header className="header">
      <button className="header__menu-btn" onClick={openMobile} aria-label="Open menu">
        <Menu size={22} />
      </button>

      <h1 className="header__title">{title}</h1>

      <div className="header__actions">
        {/* Search */}
        <div className="header-search" ref={searchRef}>
          <Search size={16} className="header-search__icon" />
          <input
            className="header-search__input"
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          {showResults && searchQuery && (
            <div className="header-search__results">
              {searchResults.length === 0 ? (
                <div className="header-search__empty">No tools found</div>
              ) : (
                searchResults.map((tool) => (
                  <div
                    key={tool.id}
                    className="header-search__result-item"
                    onClick={() => handleResultClick(tool)}
                  >
                    <span className="header-search__result-icon">
                      <Icon name={tool.icon} size={16} />
                    </span>
                    <div className="header-search__result-info">
                      <div className="header-search__result-name">{tool.name}</div>
                      <div className="header-search__result-category">{tool.category}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Settings */}
        <button
          className="icon-btn"
          onClick={() => navigate('/settings')}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
