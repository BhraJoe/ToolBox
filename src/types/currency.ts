export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface ExchangeRateResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface CachedRates {
  rates: Record<string, number>;
  base: string;
  timestamp: number;
  date: string;
}