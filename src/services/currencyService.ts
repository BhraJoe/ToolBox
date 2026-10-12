import type { ExchangeRateResponse, CachedRates } from '../types/currency';

const API_KEY = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
const API_BASE_URL = import.meta.env.VITE_EXCHANGE_RATE_API_URL;

// Simple in-memory cache for exchange rates.
let rateCache: CachedRates | null = null;

// Cache duration: 15 minutes.
const CACHE_DURATION_MS = 15 * 60 * 1000;

export class CurrencyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyServiceError';
  }
}

export function isCacheValid(): boolean {
  if (!rateCache) {
    return false;
  }
  return Date.now() - rateCache.timestamp < CACHE_DURATION_MS;
}

export function getCachedRates(): CachedRates | null {
  if (isCacheValid()) {
    return rateCache;
  }
  return null;
}

export function setCachedRates(rates: Record<string, number>, base: string, date: string): CachedRates {
  rateCache = {
    rates,
    base,
    timestamp: Date.now(),
    date,
  };
  return rateCache;
}

export function clearCache(): void {
  rateCache = null;
}

function validateResponse(data: any, expectedAmount: number): ExchangeRateResponse {
  if (!data || typeof data !== 'object') {
    throw new CurrencyServiceError('Invalid response: response is not an object');
  }

  if (data.result !== 'success') {
    throw new CurrencyServiceError('Invalid response: API request was not successful');
  }

  if (typeof data.base_code !== 'string' || !data.base_code) {
    throw new CurrencyServiceError('Invalid response: missing or invalid base currency');
  }

  if (!data.conversion_rates || typeof data.conversion_rates !== 'object') {
    throw new CurrencyServiceError('Invalid response: missing or invalid conversion_rates object');
  }

  // Validate that rates values are numbers.
  for (const [code, rate] of Object.entries(data.conversion_rates)) {
    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
      throw new CurrencyServiceError(`Invalid response: rate for ${code} is not a valid positive number`);
    }
  }

  return {
    amount: expectedAmount,
    base: data.base_code.toUpperCase(),
    date: data.time_last_update_utc ? data.time_last_update_utc.split(',')[0] : new Date().toISOString().split('T')[0],
    rates: data.conversion_rates as Record<string, number>,
  };
}

export async function fetchExchangeRates(
  baseCurrency: string,
  amount: number = 1
): Promise<ExchangeRateResponse> {
  const url = `${API_BASE_URL}/${API_KEY}/latest/${baseCurrency.toUpperCase()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 0 || response.status >= 500) {
        throw new CurrencyServiceError(
          'Unable to fetch the latest exchange rate. Please check your internet connection and try again.'
        );
      }
      throw new CurrencyServiceError(
        `Request failed with status ${response.status}. Please try again later.`
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new CurrencyServiceError('Invalid response: unable to parse JSON');
    }

    const validated = validateResponse(data, amount);

    // Cache the rates (convert to a single base rate mapping).
    // The API returns rates relative to the requested base, so we cache those.
    const ratesForBase: Record<string, number> = { [validated.base]: 1 };
    for (const [code, rate] of Object.entries(validated.rates)) {
      ratesForBase[code] = rate;
    }

    setCachedRates(ratesForBase, validated.base, validated.date);

    return validated;
  } catch (error) {
    if (error instanceof CurrencyServiceError) {
      throw error;
    }
    if (error instanceof TypeError) {
      // TypeError typically indicates a network failure.
      throw new CurrencyServiceError(
        'Unable to fetch the latest exchange rate. Please check your internet connection and try again.'
      );
    }
    // Unknown error.
    throw new CurrencyServiceError(
      'An unexpected error occurred while fetching exchange rates. Please try again.'
    );
  }
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Same currency: rate is always 1.
  if (from === to) {
    return 1;
  }

  // Check cache first.
  const cached = getCachedRates();
  if (cached && cached.base === from && cached.rates[to]) {
    return cached.rates[to];
  }

  // Fetch fresh rates.
  const response = await fetchExchangeRates(from, 1);

  if (!response.rates[to]) {
    throw new CurrencyServiceError(
      `Exchange rate for ${to} is not available.`
    );
  }

  return response.rates[to];
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ result: number; rate: number; date: string }> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return { result: amount, rate: 1, date: new Date().toISOString().split('T')[0] };
  }

  const rate = await getExchangeRate(from, to);
  const result = amount * rate;

  const cached = getCachedRates();
  const date = cached ? cached.date : new Date().toISOString().split('T')[0];

  return { result, rate, date };
}