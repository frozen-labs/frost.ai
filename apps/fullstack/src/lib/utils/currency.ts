/**
 * Currency utility functions for converting between dollars and cents
 * and formatting currency values consistently using Intl.NumberFormat
 */

/**
 * Convert dollars to cents (for storage)
 * @param dollars - Dollar amount as number (e.g., 1.50)
 * @returns Cents as integer (e.g., 150)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars (for display)
 * @param cents - Cents as integer (e.g., 150)
 * @returns Dollar amount as number (e.g., 1.50)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format currency for display using Intl.NumberFormat
 * @param cents - Price in cents
 * @param locale - Locale for formatting (defaults to 'en-US')
 * @returns Formatted currency string (e.g., "$1.50")
 */
export function formatCurrency(cents: number, locale: string = 'en-US'): string {
  const dollars = centsToDollars(cents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Parse a currency input string to cents
 * @param input - User input string (e.g., "1.50", "$1.50", "1")
 * @returns Cents as integer, or 0 if invalid
 */
export function parseCurrencyInput(input: string): number {
  // Remove $ and any whitespace
  const cleaned = input.replace(/[$\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed) || parsed < 0) {
    return 0;
  }
  
  return dollarsToCents(parsed);
}

/**
 * Format cents for currency input field (shows dollars)
 * @param cents - Price in cents
 * @returns Dollar string for input (e.g., "1.50")
 */
export function formatCurrencyInput(cents: number): string {
  return centsToDollars(cents).toFixed(2);
}

/**
 * Format token costs with high precision (up to 6 decimal places)
 * @param cents - Price in cents
 * @param locale - Locale for formatting (defaults to 'en-US')
 * @returns Formatted currency string with high precision
 */
export function formatTokenCost(cents: number, locale: string = 'en-US'): string {
  const dollars = centsToDollars(cents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(dollars);
}