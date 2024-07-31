import { Phase } from '@dedot/codecs';
import { PalletEvent } from '@dedot/types';
import { describe, expect, it } from 'vitest';
import { isEventRecord, isPalletEvent } from '../utils.js';

describe('utils', () => {
  const validPhase: Phase = {
    type: 'ApplyExtrinsic',
    value: 1,
  };

  const validPalletEvent: PalletEvent = {
    pallet: 'System',
    palletEvent: {
      name: 'Remarked',
      data: {
        sender: '...',
        hash: '0x',
      },
    },
  };

  describe('isPalletEvent', () => {
    it('should return true for valid PalletEvent', () => {
      expect(isPalletEvent(validPalletEvent)).toBe(true);
    });

    it('should return false for invalid PalletEvent (missing pallet)', () => {
      const invalidEvent = {
        palletEvent: {
          name: 'Remarked',
          data: { sender: '', hash: '0x01' },
        },
      };
      expect(isPalletEvent(invalidEvent)).toBe(false);
    });

    it('should return false for invalid PalletEvent (missing palletEvent)', () => {
      const invalidEvent = {
        pallet: 'System',
      };
      expect(isPalletEvent(invalidEvent)).toBe(false);
    });

    it('should return false for invalid PalletEvent (palletEvent is not an object or string)', () => {
      const invalidEvent = {
        pallet: 'System',
        palletEvent: 123,
      };
      expect(isPalletEvent(invalidEvent)).toBe(false);
    });
  });

  describe('isEventRecord', () => {
    it('should return true for valid IEventRecord', () => {
      const validEvent = {
        phase: validPhase,
        event: validPalletEvent,
        topics: ['0x1234567890abcdef'],
      };
      expect(isEventRecord(validEvent)).toBe(true);
    });

    it('should return false for invalid IEventRecord (missing phase)', () => {
      const invalidEvent = {
        event: validPalletEvent,
        topics: ['0x1234567890abcdef'],
      };
      expect(isEventRecord(invalidEvent)).toBe(false);
    });

    it('should return false for invalid IEventRecord (missing event)', () => {
      const invalidEvent = {
        phase: validPhase,
        topics: ['0x1234567890abcdef'],
      };
      expect(isEventRecord(invalidEvent)).toBe(false);
    });

    it('should return false for invalid IEventRecord (missing topics)', () => {
      const invalidEvent = {
        phase: validPhase,
        event: validPalletEvent,
      };
      expect(isEventRecord(invalidEvent)).toBe(false);
    });

    it('should return false for invalid IEventRecord (topics is not an array)', () => {
      const invalidEvent = {
        phase: validPhase,
        event: validPalletEvent,
        topics: '0x1234567890abcdef',
      };
      expect(isEventRecord(invalidEvent)).toBe(false);
    });
    it('should return false when event field is not a PalletEvent', () => {
      const invalidEvent = {
        phase: { type: 'ApplyExtrinsic', value: 1 },
        event: {
          pallet: 'System',
          palletEvent: 123, // Invalid palletEvent (not an object or string)
        },
        topics: ['0x1234567890abcdef'],
      };
      expect(isEventRecord(invalidEvent)).toBe(false);
    });

    it('should return false when event field is a PalletEvent without required properties', () => {
      const invalidEvent = {
        phase: { type: 'ApplyExtrinsic', value: 1 },
        event: {
          pallet: 'System', // Missing palletEvent
        },
        topics: ['0x1234567890abcdef'],
      };
      expect(isEventRecord(invalidEvent)).toBe(false);
    });
  });
});
