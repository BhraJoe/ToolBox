import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Info } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="settings">
      <h1 className="settings__title">Settings</h1>

      <div className="settings-card">
        <div className="settings-card__label">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Theme
          </h3>
          <p>Switch between light and dark mode.</p>
        </div>
        <label className="toggle">
          <input
            className="toggle__input"
            type="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
          <span className="toggle__slider" />
        </label>
      </div>

      <div className="settings-card">
        <div className="settings-card__label">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} /> About
          </h3>
          <p>ToolBox v1.0.0 — A collection of useful tools for everyone.</p>
        </div>
      </div>
    </div>
  );
}
