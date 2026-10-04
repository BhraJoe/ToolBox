import { Search } from 'lucide-react';
import type { Tool } from '../../data/tools';

interface ToolSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: Tool[];
}

export default function ToolSearch({ query, onQueryChange }: ToolSearchProps) {
  return (
    <div className="sidebar-search">
      <div className="sidebar-search__wrapper">
        <Search size={14} className="sidebar-search__icon" />
        <input
          className="sidebar-search__input"
          type="text"
          placeholder="Search tools..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
    </div>
  );
}
