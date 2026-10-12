export function formatCurrency(
  value: number,
  currencyCode: string,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: currencyCode,
    ...options,
  }).format(value);
}

export function formatPlainNumber(value: number, options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}): string {
  return new Intl.NumberFormat("en-GH", {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
  }).format(value);
}

export function getCurrencySymbol(code: string): string {
  const currencyMap: Record<string, string> = {
    AUD: "A$",
    CAD: "CA$",
    CHF: "CHF",
    CNY: "¥",
    EUR: "€",
    GBP: "£",
    GHS: "₵",
    INR: "₹",
    JPY: "¥",
    NGN: "₦",
    RUB: "₽",
    USD: "$",
    ZAR: "R",
  };
  return currencyMap[code] ?? code;
}