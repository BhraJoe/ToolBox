import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Dashboard from '../pages/Dashboard';
import CategoryPage from '../pages/CategoryPage';
import ToolPage from '../pages/ToolPage';
import Settings from '../pages/Settings';
import CalculatorPage from '../pages/tools/CalculatorPage';
import PasswordGeneratorPage from '../pages/tools/PasswordGeneratorPage';
import UnitConverterPage from '../pages/tools/UnitConverterPage';
import PercentageCalculatorPage from '../pages/tools/PercentageCalculatorPage';
import { categories, tools } from '../data/tools';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        {/* Category routes */}
        {categories.map((cat) => (
          <Route key={cat.id} path={`/${cat.id}`} element={<CategoryPage />} />
        ))}

        {/* Dedicated Tool routes */}
        <Route path="/calculators/calculator" element={<CalculatorPage />} />
        <Route path="/developer/password-generator" element={<PasswordGeneratorPage />} />
        <Route path="/calculators/unit-converter" element={<UnitConverterPage />} />
        <Route path="/calculators/percentage-calculator" element={<PercentageCalculatorPage />} />

        {/* Placeholder tool routes */}
        {tools
          .filter((tool) => tool.route !== '/calculators/calculator' && tool.route !== '/developer/password-generator' && tool.route !== '/calculators/unit-converter')
          .map((t) => (
            <Route key={t.id} path={t.route} element={<ToolPage />} />
          ))}

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
