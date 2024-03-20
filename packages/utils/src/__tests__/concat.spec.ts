import { describe, expect, it } from 'vitest';
import { concatU8a } from '../concat.js';

describe('concatU8a', () => {
  it('returns a concatenated Uint8Array for multiple Uint8Array inputs', () => {
    const result = concatU8a(new Uint8Array([1, 2]), new Uint8Array([3, 4]));
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('returns an empty Uint8Array for no inputs', () => {
    const result = concatU8a();
    expect(result).toEqual(new Uint8Array([]));
  });

  it('returns the same Uint8Array for a single Uint8Array input', () => {
    const input = new Uint8Array([1, 2, 3, 4]);
    const result = concatU8a(input);
    expect(result).toEqual(input);
  });
});
