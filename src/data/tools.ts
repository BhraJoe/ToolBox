// ─── Tool Registry ─────────────────────────────────────────────────────────

export type ToolStatus = "available" | "coming-soon";

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  route: string;
  status: ToolStatus;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  route: string;
}

// ─── Categories ────────────────────────────────────────────────────────────

export const categories: Category[] = [
  {
    id: "calculators",
    name: "Calculators",
    icon: "calculator",
    description: "Math, finance, date and unit calculators for everyday use.",
    route: "/calculators",
  },
  {
    id: "developer",
    name: "Developer",
    icon: "code",
    description: "Essential tools for software developers and engineers.",
    route: "/developer",
  },
  {
    id: "text",
    name: "Text",
    icon: "file-text",
    description: "Text manipulation, formatting and analysis tools.",
    route: "/text",
  },
  {
    id: "web",
    name: "Web",
    icon: "globe",
    description: "URL utilities, SEO and web development helpers.",
    route: "/web",
  },
  {
    id: "design",
    name: "Design",
    icon: "palette",
    description: "Color, image and visual design utilities.",
    route: "/design",
  },
  {
    id: "business",
    name: "Business",
    icon: "briefcase",
    description: "Invoice, expense and business management tools.",
    route: "/business",
  },
  {
    id: "ghana",
    name: "Ghana",
    icon: "map-pin",
    description: "Tools tailored for Ghanaian users and businesses.",
    route: "/ghana",
  },
  {
    id: "ai",
    name: "AI",
    icon: "bot",
    description: "AI-powered content, code and productivity tools.",
    route: "/ai",
  },
];

// ─── Tools ─────────────────────────────────────────────────────────────────

export const tools: Tool[] = [
  // ── Calculators ────────────────────────────────────────────────────────
  {
    id: "calculator",
    name: "Calculator",
    description: "A standard calculator for everyday math.",
    category: "calculators",
    icon: "calculator",
    route: "/calculators/calculator",
    status: "coming-soon",
  },
  {
    id: "percentage-calculator",
    name: "Percentage Calculator",
    description: "Calculate percentages, increases and decreases.",
    category: "calculators",
    icon: "percent",
    route: "/calculators/percentage-calculator",
    status: "available",
  },
  {
    id: "age-calculator",
    name: "Age Calculator",
    description: "Calculate exact age from a date of birth.",
    category: "calculators",
    icon: "calendar",
    route: "/calculators/age-calculator",
    status: "available",
  },
  {
    id: "date-calculator",
    name: "Date Calculator",
    description: "Calculate date differences or add and subtract time.",
    category: "calculators",
    icon: "calendar-days",
    route: "/calculators/date-calculator",
    status: "available",
  },
  {
    id: "loan-calculator",
    name: "Loan Calculator",
    description: "Calculate loan payments, interest and amortization.",
    category: "calculators",
    icon: "landmark",
    route: "/calculators/loan-calculator",
    status: "coming-soon",
  },
  {
    id: "salary-calculator",
    name: "Salary Calculator",
    description: "Calculate net salary, deductions and taxes.",
    category: "calculators",
    icon: "coins",
    route: "/calculators/salary-calculator",
    status: "coming-soon",
  },
    {
      id: "unit-converter",
      name: "Unit Converter",
      description: "Convert between units of measurement.",
      category: "calculators",
      icon: "ruler",
      route: "/calculators/unit-converter",
      status: "available",
    },
    {
      id: "currency-converter",
      name: "Currency Converter",
      description: "Convert currencies using live exchange rates.",
      category: "calculators",
      icon: "arrow-left-right",
      route: "/calculators/currency-converter",
      status: "available",
    },

  // ── Developer ──────────────────────────────────────────────────────────
  {
    id: "json-formatter",
    name: "JSON Formatter & Validator",
    description: "Format, validate, minify and inspect JSON data.",
    category: "developer",
    icon: "braces",
    route: "/developer/json-formatter",
    status: "available",
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Generate strong and secure random passwords.",
    category: "developer",
    icon: "key",
    route: "/developer/password-generator",
    status: "available",
  },
  {
    id: "json-validator",
    name: "JSON Validator",
    description: "Validate JSON syntax and structure.",
    category: "developer",
    icon: "file-check",
    route: "/developer/json-validator",
    status: "coming-soon",
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test and debug regular expressions.",
    category: "developer",
    icon: "search",
    route: "/developer/regex-tester",
    status: "coming-soon",
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode and inspect JSON Web Tokens.",
    category: "developer",
    icon: "key-round",
    route: "/developer/jwt-decoder",
    status: "coming-soon",
  },
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64 strings.",
    category: "developer",
    icon: "binary",
    route: "/developer/base64-encoder",
    status: "coming-soon",
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate universally unique identifiers.",
    category: "developer",
    icon: "fingerprint",
    route: "/developer/uuid-generator",
    status: "coming-soon",
  },
  {
    id: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert between timestamp formats and timezones.",
    category: "developer",
    icon: "clock",
    route: "/developer/timestamp-converter",
    status: "coming-soon",
  },

  // ── Text ───────────────────────────────────────────────────────────────
  {
    id: "word-counter",
    name: "Word Counter",
    description: "Count words, characters and sentences in text.",
    category: "text",
    icon: "file-text",
    route: "/text/word-counter",
    status: "available",
  },
  {
    id: "character-counter",
    name: "Character Counter",
    description: "Count characters with and without spaces.",
    category: "text",
    icon: "type",
    route: "/text/character-counter",
    status: "coming-soon",
  },
  {
    id: "case-converter",
    name: "Text Case Converter",
    description: "Change text capitalization and naming formats.",
    category: "text",
    icon: "case-sensitive",
    route: "/text/case-converter",
    status: "available",
  },
  {
    id: "text-diff-checker",
    name: "Text Diff Checker",
    description: "Compare two text versions and highlight additions and removals.",
    category: "text",
    icon: "file-diff",
    route: "/text/diff-checker",
    status: "available",
  },
  {
    id: "text-formatter",
    name: "Text Formatter",
    description: "Format and clean up text content.",
    category: "text",
    icon: "align-left",
    route: "/text/text-formatter",
    status: "coming-soon",
  },
  {
    id: "slug-generator",
    name: "Slug Generator",
    description: "Generate URL-friendly slugs from text.",
    category: "text",
    icon: "link",
    route: "/text/slug-generator",
    status: "coming-soon",
  },
  {
    id: "markdown",
    name: "Markdown",
    description: "Preview and edit Markdown content.",
    category: "text",
    icon: "file-code",
    route: "/text/markdown",
    status: "coming-soon",
  },

  // ── Web ────────────────────────────────────────────────────────────────
  {
    id: "url-tools",
    name: "URL Tools",
    description: "Parse, encode and decode URLs.",
    category: "web",
    icon: "link-2",
    route: "/web/url-tools",
    status: "coming-soon",
  },
  {
    id: "meta-tag-generator",
    name: "Meta Tag Generator",
    description: "Generate HTML meta tags for SEO.",
    category: "web",
    icon: "tag",
    route: "/web/meta-tag-generator",
    status: "coming-soon",
  },
  {
    id: "sitemap-generator",
    name: "Sitemap Generator",
    description: "Generate XML sitemaps for websites.",
    category: "web",
    icon: "network",
    route: "/web/sitemap-generator",
    status: "coming-soon",
  },
  {
    id: "robots-txt",
    name: "Robots.txt",
    description: "Generate robots.txt files for search engines.",
    category: "web",
    icon: "bot",
    route: "/web/robots-txt",
    status: "coming-soon",
  },

  // ── Design ─────────────────────────────────────────────────────────────
  {
    id: "color-picker",
    name: "Color Picker",
    description: "Pick and explore colors visually.",
    category: "design",
    icon: "pipette",
    route: "/design/color-picker",
    status: "coming-soon",
  },
  {
    id: "color-converter",
    name: "Color Converter",
    description: "Convert colors between HEX, RGB, HSL and more.",
    category: "design",
    icon: "palette",
    route: "/design/color-converter",
    status: "coming-soon",
  },
  {
    id: "gradient-generator",
    name: "Gradient Generator",
    description: "Create beautiful CSS gradients.",
    category: "design",
    icon: "layers",
    route: "/design/gradient-generator",
    status: "coming-soon",
  },
  {
    id: "image-tools",
    name: "Image Tools",
    description: "Resize, compress and convert images.",
    category: "design",
    icon: "image",
    route: "/design/image-tools",
    status: "coming-soon",
  },
  {
    id: "svg-tools",
    name: "SVG Tools",
    description: "Optimize and convert SVG files.",
    category: "design",
    icon: "pen-tool",
    route: "/design/svg-tools",
    status: "coming-soon",
  },

  // ── Business ───────────────────────────────────────────────────────────
  {
    id: "invoice-generator",
    name: "Invoice Generator",
    description: "Create professional invoices quickly.",
    category: "business",
    icon: "receipt",
    route: "/business/invoice-generator",
    status: "coming-soon",
  },
  {
    id: "receipt-generator",
    name: "Receipt Generator",
    description: "Generate receipts for transactions.",
    category: "business",
    icon: "receipt-text",
    route: "/business/receipt-generator",
    status: "coming-soon",
  },
  {
    id: "quotation-generator",
    name: "Quotation Generator",
    description: "Create price quotations for clients.",
    category: "business",
    icon: "file-spreadsheet",
    route: "/business/quotation-generator",
    status: "coming-soon",
  },
  {
    id: "expense-tracker",
    name: "Expense Tracker",
    description: "Track and manage your expenses.",
    category: "business",
    icon: "wallet",
    route: "/business/expense-tracker",
    status: "coming-soon",
  },
  {
    id: "profit-calculator",
    name: "Profit Calculator",
    description: "Calculate profit margins and markup.",
    category: "business",
    icon: "trending-up",
    route: "/business/profit-calculator",
    status: "coming-soon",
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Manage product inventory and stock.",
    category: "business",
    icon: "package",
    route: "/business/inventory",
    status: "coming-soon",
  },

  // ── Ghana ──────────────────────────────────────────────────────────────
  {
    id: "momo-tools",
    name: "MoMo Tools",
    description: "Mobile Money fee calculators and tools.",
    category: "ghana",
    icon: "smartphone",
    route: "/ghana/momo-tools",
    status: "coming-soon",
  },
  {
    id: "vat-calculator",
    name: "VAT Calculator",
    description: "Calculate Ghana VAT and taxes.",
    category: "ghana",
    icon: "building-2",
    route: "/ghana/vat-calculator",
    status: "coming-soon",
  },
  {
    id: "ghana-salary-calculator",
    name: "Salary Calculator",
    description: "Calculate Ghana SSNIT, tax and net salary.",
    category: "ghana",
    icon: "coins",
    route: "/ghana/salary-calculator",
    status: "coming-soon",
  },
  {
    id: "ghanapost-gps",
    name: "GhanaPost GPS",
    description: "Look up GhanaPost GPS digital addresses.",
    category: "ghana",
    icon: "navigation",
    route: "/ghana/ghanapost-gps",
    status: "coming-soon",
  },
  {
    id: "cedi-converter",
    name: "Cedi Converter",
    description: "Convert Ghana Cedi to other currencies.",
    category: "ghana",
    icon: "arrow-left-right",
    route: "/ghana/cedi-converter",
    status: "coming-soon",
  },

  // ── AI ─────────────────────────────────────────────────────────────────
  {
    id: "ai-summarizer",
    name: "AI Summarizer",
    description: "Summarize long text using AI.",
    category: "ai",
    icon: "file-signature",
    route: "/ai/ai-summarizer",
    status: "coming-soon",
  },
  {
    id: "ai-cv-builder",
    name: "AI CV Builder",
    description: "Build professional CVs with AI assistance.",
    category: "ai",
    icon: "user-check",
    route: "/ai/ai-cv-builder",
    status: "coming-soon",
  },
  {
    id: "ai-content-writer",
    name: "AI Content Writer",
    description: "Generate content using AI.",
    category: "ai",
    icon: "pen",
    route: "/ai/ai-content-writer",
    status: "coming-soon",
  },
  {
    id: "ai-code-explainer",
    name: "AI Code Explainer",
    description: "Explain code using AI.",
    category: "ai",
    icon: "cpu",
    route: "/ai/ai-code-explainer",
    status: "coming-soon",
  },
];

// ─── Helper Functions ──────────────────────────────────────────────────────

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter((tool) => tool.category === categoryId);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find((cat) => cat.id === categoryId);
}

export function getToolById(toolId: string): Tool | undefined {
  return tools.find((tool) => tool.id === toolId);
}

export function getToolByRoute(route: string): Tool | undefined {
  return tools.find((tool) => tool.route === route);
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q)
  );
}

export function getToolCount(): number {
  return tools.length;
}

export function getCategoryCount(): number {
  return categories.length;
}

export function getToolCountByCategory(categoryId: string): number {
  return tools.filter((tool) => tool.category === categoryId).length;
}

export function getComingSoonCount(): number {
  return tools.filter((tool) => tool.status === "coming-soon").length;
}

export function getAvailableCount(): number {
  return tools.filter((tool) => tool.status === "available").length;
}
