import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Exchange Rate Service
 * Handles currency conversion with automatic API fallback and manual rate support
 */

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: '$' }
];

// Cache for exchange rates (in-memory)
let ratesCache = null;
let cacheExpiry = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch exchange rates from API
 * Uses exchangerate-api.com (free tier: 1500 requests/month)
 */
const fetchExchangeRatesFromAPI = async (baseCurrency = 'USD') => {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    if (!response.ok) {
      throw new Error('Exchange rate API request failed');
    }
    const data = await response.json();
    return {
      base: data.base,
      date: data.date,
      rates: data.rates,
      source: 'API',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching exchange rates from API:', error);
    return null;
  }
};

/**
 * Get exchange rates from Firestore (fallback/manual rates)
 */
const getStoredExchangeRates = async (companyId) => {
  try {
    const ratesDoc = await getDoc(doc(db, 'exchangeRates', companyId));
    if (ratesDoc.exists()) {
      const data = ratesDoc.data();
      return {
        base: data.base || 'USD',
        date: data.date,
        rates: data.rates || {},
        source: data.source || 'MANUAL',
        timestamp: data.timestamp?.toDate() || new Date()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching stored exchange rates:', error);
    return null;
  }
};

/**
 * Store exchange rates in Firestore
 */
const storeExchangeRates = async (companyId, ratesData) => {
  try {
    await setDoc(doc(db, 'exchangeRates', companyId), {
      ...ratesData,
      timestamp: Timestamp.fromDate(ratesData.timestamp),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error storing exchange rates:', error);
  }
};

/**
 * Get current exchange rates (with caching)
 * Priority: Cache > API > Firestore > Fallback
 */
export const getExchangeRates = async (companyId, baseCurrency = 'USD', forceRefresh = false) => {
  // Check cache first
  if (!forceRefresh && ratesCache && cacheExpiry && Date.now() < cacheExpiry) {
    return ratesCache;
  }

  // Try to fetch from API
  const apiRates = await fetchExchangeRatesFromAPI(baseCurrency);
  if (apiRates) {
    ratesCache = apiRates;
    cacheExpiry = Date.now() + CACHE_DURATION;
    
    // Store in Firestore for fallback
    if (companyId) {
      await storeExchangeRates(companyId, apiRates);
    }
    
    return apiRates;
  }

  // Fallback to stored rates
  const storedRates = await getStoredExchangeRates(companyId);
  if (storedRates) {
    ratesCache = storedRates;
    cacheExpiry = Date.now() + CACHE_DURATION;
    return storedRates;
  }

  // Final fallback: default rates (approximate, for offline mode)
  const fallbackRates = {
    base: 'USD',
    date: new Date().toISOString().split('T')[0],
    rates: {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      ZAR: 18.5,
      BWP: 13.5,
      NAD: 18.5
    },
    source: 'FALLBACK',
    timestamp: new Date()
  };
  
  ratesCache = fallbackRates;
  cacheExpiry = Date.now() + CACHE_DURATION;
  
  return fallbackRates;
};

/**
 * Convert amount from one currency to another
 */
export const convertCurrency = async (amount, fromCurrency, toCurrency, companyId) => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates(companyId, 'USD');
  
  // Convert to USD first (base currency)
  const amountInUSD = amount / (rates.rates[fromCurrency] || 1);
  
  // Convert from USD to target currency
  const convertedAmount = amountInUSD * (rates.rates[toCurrency] || 1);
  
  return parseFloat(convertedAmount.toFixed(2));
};

/**
 * Get exchange rate between two currencies
 */
export const getExchangeRate = async (fromCurrency, toCurrency, companyId) => {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const rates = await getExchangeRates(companyId, 'USD');
  
  // Calculate cross rate via USD
  const rate = (rates.rates[toCurrency] || 1) / (rates.rates[fromCurrency] || 1);
  
  return parseFloat(rate.toFixed(6));
};

/**
 * Update manual exchange rates (admin override)
 */
export const updateManualExchangeRates = async (companyId, baseCurrency, rates) => {
  const ratesData = {
    base: baseCurrency,
    date: new Date().toISOString().split('T')[0],
    rates,
    source: 'MANUAL',
    timestamp: new Date()
  };

  await storeExchangeRates(companyId, ratesData);
  
  // Clear cache to force refresh
  ratesCache = null;
  cacheExpiry = null;
  
  return ratesData;
};

/**
 * Format currency with proper symbol and decimals
 */
export const formatCurrencyAmount = (amount, currencyCode) => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;
  
  return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};
