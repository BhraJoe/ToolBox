import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Currency } from '../../../types/currency';
import { currencies, getCurrency, DEFAULT_FROM_CURRENCY, DEFAULT_TO_CURRENCY, DEFAULT_AMOUNT } from '../../../data/currencies';
import { convertCurrency, fetchExchangeRates, CurrencyServiceError } from '../../../services/currencyService';
import { formatCurrency, formatPlainNumber } from '../../../utils/currencyFormatter';
import CurrencySelector from './CurrencySelector';
import AmountInput from './AmountInput';

export default function CurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState<Currency>(getCurrency(DEFAULT_FROM_CURRENCY)!);
  const [toCurrency, setToCurrency] = useState<Currency>(getCurrency(DEFAULT_TO_CURRENCY)!);
  const [amount, setAmount] = useState<string>(DEFAULT_AMOUNT);
  const [amountAsNumber, setAmountAsNumber] = useState<number>(parseFloat(DEFAULT_AMOUNT));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>('idle');

  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [resultAmount, setResultAmount] = useState<number>(0);

  const fetchRates = useCallback(async () => {
    if (!fromCurrency || !toCurrency) {
      setError('Please select both currencies.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const amountValue = parseFloat(amount) || 1;
      const { result, rate, date } = await convertCurrency(
        amountValue,
        fromCurrency.code,
        toCurrency.code
      );

      setExchangeRate(rate);
      setResultAmount(result);
      setLastUpdated(
        new Date(date + 'T00:00:00').toLocaleString('en-GH', {
          dateStyle: 'full',
          timeStyle: 'short',
        })
      );
    } catch (err) {
      if (err instanceof CurrencyServiceError) {
        setError(err.message);
      } else {
        setError('Unable to fetch exchange rates. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [fromCurrency, toCurrency, amount]);

  useEffect(() => {
    if (amountAsNumber > 0 && fromCurrency && toCurrency && !loading && !error) {
      fetchRates();
    }
  }, [amountAsNumber, fromCurrency, toCurrency, loading, error, fetchRates]);

  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && isFinite(numericAmount) && numericAmount >= 0) {
      setAmountAsNumber(numericAmount);
    } else if (amount === '') {
      setAmountAsNumber(0);
      setResultAmount(0);
      setExchangeRate(0);
    } else {
      setAmountAsNumber(0);
      setResultAmount(0);
      setExchangeRate(0);
    }
  }, [amount]);

  const handleAmountChange = useCallback((value: string | null) => {
    setError(null);
    if (value === null || value === '') {
      setAmount('');
      setAmountAsNumber(0);
      setResultAmount(0);
      setExchangeRate(0);
      return;
    }

    const num = parseFloat(value);
    if (isNaN(num) || !isFinite(num) || num < 0) {
      return; // Error displayed by AmountInput component;
    }

    setAmount(value);
    setAmountAsNumber(num);
  }, []);

  const handleFromCurrencyChange = useCallback((currency: Currency) => {
    if (currency.code === toCurrency.code) {
      setToCurrency(fromCurrency);
    }
    setFromCurrency(currency);
  }, [fromCurrency, toCurrency]);

  const handleToCurrencyChange = useCallback((currency: Currency) => {
    if (currency.code === fromCurrency.code) {
      setFromCurrency(toCurrency);
    }
    setToCurrency(currency);
  }, [fromCurrency, toCurrency]);

  const handleSwap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResultAmount(resultAmount * exchangeRate);
    setExchangeRate(1 / exchangeRate);
    setError(null);
  }, [fromCurrency, toCurrency, resultAmount, exchangeRate]);

  const handleRefresh = useCallback(async () => {
    setRefreshStatus('refreshing');
    setError(null);

    try {
      const amountValue = parseFloat(amount) || 1;

      await fetchExchangeRates(fromCurrency.code, toCurrency.code, amountValue);

      const { result, rate, date } = await convertCurrency(
        amountValue,
        fromCurrency.code,
        toCurrency.code
      );

      setExchangeRate(rate);
      setResultAmount(result);
      setLastUpdated(new Date(date + 'T00:00:00').toLocaleString('en-GH', {
        dateStyle: 'full',
        timeStyle: 'short',
      }));

      setRefreshStatus('success');
      setTimeout(() => setRefreshStatus('idle'), 2000);
    } catch {
      setRefreshStatus('error');
      setTimeout(() => setRefreshStatus('idle'), 2000);
    }
  }, [fromCurrency, toCurrency, amount]);

  const handleCopyResult = useCallback(() => {
    if (loading || !resultAmount || !fromCurrency || !toCurrency) return;

    const displayAmount = parseFloat(amount) || 0;
    const formattedAmount = formatCurrency(displayAmount, fromCurrency.code);
    const formattedResult = formatCurrency(resultAmount, toCurrency.code);
    const text = `${formattedAmount} = ${formattedResult}`;
    
    navigator.clipboard.writeText(text).catch(() => {});
  }, [loading, resultAmount, fromCurrency, toCurrency, amount]);

  const reverseRate = exchangeRate > 0 ? 1 / exchangeRate : 0;

  const displayResult = useMemo(() => {
    if (loading) return '—';
    if (error) return '—';
    if (resultAmount === 0) return '0';
    return formatCurrency(resultAmount, toCurrency.code);
  }, [loading, error, resultAmount, toCurrency.code]);

  return (
    <div className="currency-converter">
      <div className="currency-converter__card">
        <div className="currency-converter__header">
          <h2>Currency Converter</h2>
          <p>Convert currencies using live exchange rates.</p>
        </div>

        <div className="currency-converter__controls">
          <div className="currency-converter__amount-section">
            <label htmlFor="currency-amount" className="currency-converter__label">
              Amount
            </label>
            <AmountInput
              value={amount || null}
              onChange={handleAmountChange}
              placeholder="Enter amount"
            />
          </div>

          <div className="currency-converter__row-section">
            <div className="currency-converter__selectors">
              <CurrencySelector
                label="From"
                value={fromCurrency}
                options={currencies}
                onChange={handleFromCurrencyChange}
                disabled={loading}
              />
              <button
                type="button"
                className="currency-converter__swap-btn"
                onClick={handleSwap}
                disabled={loading}
                aria-label="Swap currencies"
              >
                ⇅
              </button>
              <CurrencySelector
                label="To"
                value={toCurrency}
                options={currencies}
                onChange={handleToCurrencyChange}
                disabled={loading}
              />
            </div>

            <div className="currency-converter__exchange-rate">
              <div className="currency-converter__rate-label">Exchange Rate</div>
              {loading ? (
                <div className="currency-converter__rate-value">Loading…</div>
              ) : error ? (
                <div className="currency-converter__rate-value currency-converter__rate-value--error">{error}</div>
              ) : (
                <div className="currency-converter__rate-value">
                  1 {fromCurrency.code} = {formatPlainNumber(exchangeRate)} {toCurrency.symbol}
                </div>
              )}
              {reverseRate > 0 && (
                <div className="currency-converter__rate-reverse">
                  1 {toCurrency.symbol} = {formatPlainNumber(reverseRate)} {fromCurrency.code}
                </div>
              )}
            </div>
          </div>

          <div className="currency-converter__result-section">
            <div className="currency-converter__result-label">
              Converted Amount
            </div>
            <div className="currency-converter__result-value">
              {displayResult}
            </div>
          </div>

          <div className="currency-converter__actions">
            <button
              type="button"
              className="currency-converter__copy-btn"
              onClick={handleCopyResult}
              disabled={loading || !resultAmount}
              aria-label="Copy result"
            >
              {resultAmount ? '📋 Copy Result' : '📋 Copy'}
            </button>
          </div>

          <div className="currency-converter__footer">
            <div className="currency-converter__timestamp">
              {lastUpdated ? `Last updated: ${lastUpdated}` : 'Exchange rates will load on conversion'}
            </div>
            <button
              type="button"
              className="currency-converter__refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
            >
              {refreshStatus === 'refreshing' ? 'Refreshing…' :
               refreshStatus === 'success' ? '✓ Rates updated' :
               refreshStatus === 'error' ? '✗ Failed' : '↻ Refresh Rates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}