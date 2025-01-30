import { describe, it, expect } from 'vitest';
import { DedotError } from '../error.js';
import { formatBalance } from '../formatBalance.js';

describe('formatBalance', () => {
  it('should work probably (withAll = true)', () => {
    expect(formatBalance(1e12, { decimals: 12, symbol: 'AZERO', withAll: true })).toEqual('1.00 AZERO');
    expect(formatBalance(1e12, { decimals: 13, symbol: 'AZERO', withAll: true })).toEqual('0.10 AZERO');
    expect(formatBalance(12_023_172_837_123, { decimals: 12, withAll: true })).toEqual('12.023172837123');
    expect(formatBalance('1', { decimals: 12, withAll: true })).toEqual('0.000000000001');
    expect(formatBalance(1e12, { decimals: 13, withAll: true })).toEqual('0.10');
    expect(formatBalance(-10000, { decimals: 4, withAll: true })).toEqual('-1.00');
    expect(formatBalance('-10200', { decimals: 4, withAll: true })).toEqual('-1.02');
    expect(formatBalance(-1e12, { decimals: 12, symbol: 'AZERO', withAll: true })).toEqual('-1.00 AZERO');
    expect(formatBalance(12_172_837, { decimals: 1, withAll: true })).toEqual('1,217,283.70');
  });

  it('should work probably (withAll = false)', () => {
    expect(formatBalance(1e12, { decimals: 12, symbol: 'AZERO' })).toEqual('1.00 AZERO');
    expect(formatBalance(1e12, { decimals: 13, symbol: 'AZERO' })).toEqual('0.10 AZERO');
    expect(formatBalance(12_023_172_837_123, { decimals: 12 })).toEqual('12.0231');
    expect(formatBalance('1', { decimals: 12 })).toEqual('0.00');
    expect(formatBalance(1e12, { decimals: 13 })).toEqual('0.10');
    expect(formatBalance(-10000, { decimals: 4 })).toEqual('-1.00');
    expect(formatBalance('-10200', { decimals: 4 })).toEqual('-1.02');
    expect(formatBalance(-1e12, { decimals: 12, symbol: 'AZERO' })).toEqual('-1.00 AZERO');
  });

  it('should work probably with locale', () => {
    expect(formatBalance(12_172_837, { decimals: 1, locale: 'en' })).toEqual('1,217,283.70');
    expect(formatBalance(12_172_837, { decimals: 1, locale: 'sl' })).toEqual('1.217.283,70');
    expect(formatBalance(12_172_837, { decimals: 1, locale: 'sl-si' })).toEqual('1.217.283,70');
    expect(formatBalance(12_172_837, { decimals: 1, locale: 'it-it' })).toEqual('1.217.283,70');
    expect(formatBalance(12_172_837, { decimals: 1, locale: 'ja-jp' })).toEqual('1,217,283.70');
  });

  it('should throw error if input has bad chars', () => {
    expect(() => formatBalance('1.000000000001', { decimals: 12 })).toThrow(
      new DedotError('Invalid value: 1.000000000001 at position 1, bigint was expected'),
    );
    expect(() => formatBalance('1,2', { decimals: 12, symbol: 'AZERO' })).toThrow(
      new DedotError('Invalid value: 1,2 at position 1, bigint was expected'),
    );
  });

  it('should throw error if decimals is invalid', () => {
    expect(() => formatBalance('1', { decimals: 12.2, symbol: 'AZERO' })).toThrow(
      new DedotError('Invalid decimals: 12.2, an positive integer is expected'),
    );
    expect(() => formatBalance('1', { decimals: -12, symbol: 'AZERO' })).toThrow(
      new DedotError('Invalid decimals: -12, an positive integer is expected'),
    );
  });
});
