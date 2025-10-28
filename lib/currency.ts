// Currency formatting utilities

export const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  gbp: '£',
  eur: '€',
  cad: 'CA$',
  aud: 'A$',
  nzd: 'NZ$',
  jpy: '¥',
  chf: 'CHF',
  sgd: 'S$',
  hkd: 'HK$',
  inr: '₹',
  mxn: 'MX$',
  brl: 'R$',
  zar: 'R',
};

export const CURRENCY_NAMES: Record<string, string> = {
  usd: 'US Dollar',
  gbp: 'British Pound',
  eur: 'Euro',
  cad: 'Canadian Dollar',
  aud: 'Australian Dollar',
  nzd: 'New Zealand Dollar',
  jpy: 'Japanese Yen',
  chf: 'Swiss Franc',
  sgd: 'Singapore Dollar',
  hkd: 'Hong Kong Dollar',
  inr: 'Indian Rupee',
  mxn: 'Mexican Peso',
  brl: 'Brazilian Real',
  zar: 'South African Rand',
};

/**
 * Format a price with the correct currency symbol
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., 'usd', 'gbp')
 * @param showSymbol - Whether to show the currency symbol
 * @returns Formatted price string
 */
export function formatPrice(amount: number, currency: string = 'usd', showSymbol: boolean = true): string {
  const currencyCode = currency.toLowerCase();
  const symbol = CURRENCY_SYMBOLS[currencyCode] || '$';
  
  // Format based on currency (some currencies don't use decimals like JPY)
  const decimals = currencyCode === 'jpy' ? 0 : 2;
  const formattedAmount = amount.toFixed(decimals);
  
  if (!showSymbol) {
    return formattedAmount;
  }
  
  // For most currencies, put symbol before amount
  // For some currencies like EUR, you might want to customize this
  return `${symbol}${formattedAmount}`;
}

/**
 * Get currency symbol
 * @param currency - The currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string = 'usd'): string {
  return CURRENCY_SYMBOLS[currency.toLowerCase()] || '$';
}

/**
 * Get currency name
 * @param currency - The currency code
 * @returns Currency name
 */
export function getCurrencyName(currency: string = 'usd'): string {
  return CURRENCY_NAMES[currency.toLowerCase()] || 'US Dollar';
}

/**
 * Convert amount to cents/smallest unit for Stripe
 * @param amount - The amount in major units (e.g., dollars)
 * @param currency - The currency code
 * @returns Amount in smallest unit (e.g., cents)
 */
export function toSmallestUnit(amount: number, currency: string = 'usd'): number {
  const currencyCode = currency.toLowerCase();
  
  // Zero-decimal currencies (no cents)
  const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp'];
  
  if (zeroDecimalCurrencies.includes(currencyCode)) {
    return Math.round(amount);
  }
  
  // Most currencies use 2 decimals (cents)
  return Math.round(amount * 100);
}


