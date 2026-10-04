import { Sparkles } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome__header">
        <h2 className="welcome__title">Welcome to ToolBox</h2>
        <span className="welcome__badge">
          <Sparkles size={16} /> All-in-One Suite
        </span>
      </div>
      <p className="welcome__subtitle">
        A collection of useful tools for developers, designers, businesses and everyday tasks.
      </p>
    </div>
  );
}
