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
import CurrencyConverterPage from '../pages/tools/CurrencyConverterPage';
import AgeCalculatorPage from '../pages/tools/AgeCalculatorPage';
import DateCalculatorPage from '../pages/tools/DateCalculatorPage';
import TextCaseConverterPage from '../pages/tools/TextCaseConverterPage';
import WordCounterPage from '../pages/tools/WordCounterPage';
import TextDiffCheckerPage from '../pages/tools/TextDiffCheckerPage';
import JsonFormatterPage from '../pages/tools/JsonFormatterPage';
import Base64EncoderDecoderPage from '../pages/tools/Base64EncoderDecoderPage';
import UrlEncoderDecoderPage from '../pages/tools/UrlEncoderDecoderPage';
import ColorConverterPage from '../pages/tools/ColorConverterPage';
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
        <Route path="/calculators/currency-converter" element={<CurrencyConverterPage />} />
        <Route path="/calculators/age-calculator" element={<AgeCalculatorPage />} />
        <Route path="/calculators/date-calculator" element={<DateCalculatorPage />} />
        <Route path="/text/case-converter" element={<TextCaseConverterPage />} />
        <Route path="/text/word-counter" element={<WordCounterPage />} />
        <Route path="/text/diff-checker" element={<TextDiffCheckerPage />} />
        <Route path="/developer/json-formatter" element={<JsonFormatterPage />} />
        <Route path="/developer/base64-encoder-decoder" element={<Base64EncoderDecoderPage />} />
        <Route path="/developer/url-encoder-decoder" element={<UrlEncoderDecoderPage />} />
        <Route path="/design/color-converter" element={<ColorConverterPage />} />

        {/* Placeholder tool routes */}
        {tools
          .filter((tool) => tool.route !== '/calculators/calculator' && tool.route !== '/developer/password-generator' && tool.route !== '/developer/json-formatter' && tool.route !== '/developer/base64-encoder-decoder' && tool.route !== '/developer/url-encoder-decoder' && tool.route !== '/calculators/unit-converter' && tool.route !== '/calculators/percentage-calculator' && tool.route !== '/calculators/currency-converter' && tool.route !== '/calculators/age-calculator' && tool.route !== '/calculators/date-calculator' && tool.route !== '/text/case-converter' && tool.route !== '/text/word-counter' && tool.route !== '/text/diff-checker' && tool.route !== '/design/color-converter')
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
