import { DedotError } from './error.js';

export interface FormatBalanceOptions {
  symbol?: string;
  decimals?: number;
  withAll?: boolean;
  locale?: string;
}

/**
 * Format a balance value to a human-readable string.
 *
 * @param value - The balance value.
 * @param options - The formatting options.
 * @param options.symbol - The currency symbol.
 * @param options.decimals - The decimals of network. (default: 0)
 * @param options.withAll - Whether to show all decimals. (default: false, only show up to 4 decimals)
 * @param options.locale - The locale to use for formatting. (default: 'en')
 *
 * @returns The formatted balance.
 */
export function formatBalance(value: number | bigint | string | undefined, options: FormatBalanceOptions): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const { decimals = 0, symbol, withAll = false, locale = 'en' } = options;

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new DedotError(`Invalid decimals: ${decimals}, an positive integer is expected`);
  }

  let valueStr = value.toString();

  const isNegative = valueStr.at(0) === '-';
  if (isNegative) {
    valueStr = valueStr.slice(1);
  }

  const badChars = valueStr.match(/[^0-9]/);
  if (badChars) {
    throw new DedotError(`Invalid value: ${valueStr} at position ${badChars.index ?? 0}, bigint was expected`);
  }

  const tmpStr = valueStr.padStart(decimals, '0');

  // If wholePart is empty, pad it with 0
  const wholePart = tmpStr.slice(0, tmpStr.length - decimals).padStart(1, '0');
  const decimalPart = tmpStr
    .slice(tmpStr.length - decimals)
    // To avoid Intl.NumberFormat auto rounding
    .substring(0, withAll ? decimals : Math.min(4, decimals))
    .replace(/0+$/, '');

  return [
    isNegative && '-',
    Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: withAll ? Math.max(2, decimals) : 4,
    }).format(+`${wholePart}.${decimalPart}`),
    symbol && ` ${symbol}`,
  ]
    .filter(Boolean)
    .join('');
}
