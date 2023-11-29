import { describe, it, expect } from 'vitest';
import { shortenAddress, trimOffUrlProtocol } from '../string';

describe('shortenAddress', () => {
  it.each(['', null, undefined])('should return empty string if input = %s', (input) => {
    expect(shortenAddress(input as string)).toEqual('');
  });

  it.each(['0x123456789123', '0x1234567891234'])(
    "should return the whole address if address's length <= 15 chars - (`%s`)",
    (input) => {
      expect(input.length).lessThanOrEqual(15);
      expect(shortenAddress(input)).toEqual(input);
    },
  );
  it.each([
    { input: '0x12345678912345', expected: '0x1234...912345' },
    { input: '0xdafea492d9c6733ae3d56b7ed1adb60692c98bc5', expected: '0xdafe...c98bc5' },
    { input: '1EgNYYD1g2dSYavyTT13wkMZ8co2MzELtWuRabjRdQoxXPp', expected: '1EgNYY...QoxXPp' },
  ])("should return the shortened address if address's length > 15 chars - $input", ({ input, expected }) => {
    expect(shortenAddress(input)).toEqual(expected);
  });
});

describe('trimOffUrlProtocol', () => {
  it.each([
    { input: 'http://example.com', expected: 'example.com' },
    { input: 'https://example.com', expected: 'example.com' },
    { input: 'https://example.com/path', expected: 'example.com/path' },
  ])('should trim off protocol from $input to $expected', ({ input, expected }) => {
    expect(trimOffUrlProtocol(input)).toEqual(expected);
  });
});
