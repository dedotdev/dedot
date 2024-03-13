import { describe, expect, it } from 'vitest';
import { assert, assertFalse, ensurePresence } from '../assert.js';

describe('assert', () => {
  it('should throw error', function () {
    expect(() => {
      assert(false, 'Error message');
    }).toThrowError(new Error('Error message'));
  });

  it('should be silent', function () {
    assert(true, 'Nothing thrown out');
  });
});

describe('assertFalse', () => {
  it('should throw error', function () {
    expect(() => {
      assertFalse(true, 'Error message');
    }).toThrowError(new Error('Error message'));
  });

  it('should be silent', function () {
    assertFalse(false, 'Nothing thrown out');
  });
});

describe('ensurePresence', () => {
  it('should throw error for null value', () => {
    expect(() => {
      ensurePresence(null);
    }).toThrowError(new Error('Value is not present (null or undefined)'));
  });

  it('should throw error for undefined value', () => {
    expect(() => {
      ensurePresence(undefined);
    }).toThrowError(new Error('Value is not present (null or undefined)'));
  });

  it('should be silent', () => {
    ensurePresence(0);
    ensurePresence('');
    ensurePresence(false);
    ensurePresence(true);
    ensurePresence('Hello');
  });
});
