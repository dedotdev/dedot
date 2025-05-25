import { DedotError } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { pickRandomItem, validateEndpoint } from '../utils.js';

describe('utils', () => {
  describe('validateEndpoint', () => {
    describe('valid endpoints', () => {
      it('accepts ws:// endpoints', () => {
        const endpoint = 'ws://localhost:9944';
        expect(validateEndpoint(endpoint)).toBe(endpoint);
      });

      it('accepts wss:// endpoints', () => {
        const endpoint = 'wss://rpc.polkadot.io';
        expect(validateEndpoint(endpoint)).toBe(endpoint);
      });

      it('accepts endpoints with ports', () => {
        const endpoint = 'ws://127.0.0.1:9944';
        expect(validateEndpoint(endpoint)).toBe(endpoint);
      });

      it('accepts endpoints with paths', () => {
        const endpoint = 'wss://rpc.polkadot.io/ws';
        expect(validateEndpoint(endpoint)).toBe(endpoint);
      });
    });

    describe('invalid endpoints', () => {
      it('rejects http:// endpoints', () => {
        expect(() => validateEndpoint('http://localhost:8080')).toThrow(DedotError);
        expect(() => validateEndpoint('http://localhost:8080')).toThrow(
          'Invalid websocket endpoint http://localhost:8080, a valid endpoint should start with wss:// or ws://',
        );
      });

      it('rejects https:// endpoints', () => {
        expect(() => validateEndpoint('https://example.com')).toThrow(DedotError);
        expect(() => validateEndpoint('https://example.com')).toThrow(
          'Invalid websocket endpoint https://example.com, a valid endpoint should start with wss:// or ws://',
        );
      });

      it('rejects empty string', () => {
        expect(() => validateEndpoint('')).toThrow(DedotError);
        expect(() => validateEndpoint('')).toThrow(
          'Invalid websocket endpoint , a valid endpoint should start with wss:// or ws://',
        );
      });

      it('rejects endpoints without protocol', () => {
        expect(() => validateEndpoint('localhost:9944')).toThrow(DedotError);
        expect(() => validateEndpoint('localhost:9944')).toThrow(
          'Invalid websocket endpoint localhost:9944, a valid endpoint should start with wss:// or ws://',
        );
      });

      it('rejects malformed protocols', () => {
        expect(() => validateEndpoint('ws:/localhost:9944')).toThrow(DedotError);
        expect(() => validateEndpoint('wss//example.com')).toThrow(DedotError);
        expect(() => validateEndpoint('ws:localhost')).toThrow(DedotError);
      });

      it('rejects other protocols', () => {
        expect(() => validateEndpoint('ftp://example.com')).toThrow(DedotError);
        expect(() => validateEndpoint('tcp://localhost:9944')).toThrow(DedotError);
        expect(() => validateEndpoint('udp://localhost:9944')).toThrow(DedotError);
      });
    });

    describe('error handling', () => {
      it('throws DedotError for invalid endpoints', () => {
        expect(() => validateEndpoint('invalid')).toThrow(DedotError);
      });

      it('includes the invalid endpoint in error message', () => {
        const invalidEndpoint = 'http://invalid.com';
        expect(() => validateEndpoint(invalidEndpoint)).toThrow(
          `Invalid websocket endpoint ${invalidEndpoint}, a valid endpoint should start with wss:// or ws://`,
        );
      });

      it('provides helpful error message format', () => {
        expect(() => validateEndpoint('tcp://localhost')).toThrow(
          /Invalid websocket endpoint .*, a valid endpoint should start with wss:\/\/ or ws:\/\//,
        );
      });
    });
  });

  describe('pickRandomItem', () => {
    describe('basic functionality', () => {
      it('returns an item from a single-item array', () => {
        const items = ['item1'];
        const result = pickRandomItem(items);
        expect(result).toBe('item1');
      });

      it('returns an item from the array', () => {
        const items = ['item1', 'item2', 'item3'];
        const result = pickRandomItem(items);
        expect(items).toContain(result);
      });

      it('throws error for empty array', () => {
        expect(() => pickRandomItem([])).toThrow('Cannot pick from empty array');
      });
    });

    describe('exclusion functionality', () => {
      it('excludes specified item when possible', () => {
        const items = ['item1', 'item2', 'item3'];
        const excludeItem = 'item1';

        // Run multiple times to ensure exclusion works
        for (let i = 0; i < 10; i++) {
          const result = pickRandomItem(items, excludeItem);
          expect(result).not.toBe(excludeItem);
          expect(['item2', 'item3']).toContain(result);
        }
      });

      it('falls back to original array when only excluded item available', () => {
        const items = ['item1'];
        const excludeItem = 'item1';
        const result = pickRandomItem(items, excludeItem);
        expect(result).toBe('item1');
      });

      it('works when excluded item is not in array', () => {
        const items = ['item1', 'item2'];
        const excludeItem = 'item3';
        const result = pickRandomItem(items, excludeItem);
        expect(items).toContain(result);
      });

      it('handles undefined exclude item', () => {
        const items = ['item1', 'item2'];
        const result = pickRandomItem(items, undefined);
        expect(items).toContain(result);
      });
    });

    describe('type safety', () => {
      it('works with string arrays', () => {
        const items = ['a', 'b', 'c'];
        const result = pickRandomItem(items);
        expect(typeof result).toBe('string');
        expect(items).toContain(result);
      });

      it('works with number arrays', () => {
        const items = [1, 2, 3];
        const result = pickRandomItem(items);
        expect(typeof result).toBe('number');
        expect(items).toContain(result);
      });
    });
  });
});
