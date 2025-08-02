import { describe, it, expect, vi } from 'vitest';
import { DedotError } from '@dedot/utils';
import { ExtrinsicType, EXTRINSIC_FORMAT_VERSION_V4, EXTRINSIC_FORMAT_VERSION_V5 } from '../ExtrinsicVersion.js';
import { GenericExtrinsic, PreambleV4Bare, PreambleV4Signed, PreambleV5Bare, PreambleV5General } from '../GenericExtrinsic.js';

// We need to test the private isPreamble function indirectly through the GenericExtrinsic constructor
describe('isPreamble validation', () => {
  describe('returns false for invalid basic structure', () => {
    it('should return false for null preamble', () => {
      // null preamble defaults to v4 bare (no signature)
      const extrinsic = new GenericExtrinsic({} as any, {}, null as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Bare);
    });

    it('should return false for undefined preamble', () => {
      // undefined preamble defaults to v4 bare (no signature)
      const extrinsic = new GenericExtrinsic({} as any, {}, undefined);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Bare);
    });

    it('should return false for string preamble', () => {
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, 'invalid' as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should return false for number preamble', () => {
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, 42 as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should return false for array preamble', () => {
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, [] as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should return false for missing version property', () => {
      const preamble = {
        extrinsicType: ExtrinsicType.Bare,
      };
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should return false for missing extrinsicType property', () => {
      const preamble = {
        version: 4,
      };
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });
  });

  describe('returns false for unsupported versions', () => {
    it('should return false for version 0', () => {
      const preamble = {
        version: 0,
        extrinsicType: ExtrinsicType.Bare,
      };
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should return false for version 3', () => {
      const preamble = {
        version: 3,
        extrinsicType: ExtrinsicType.Bare,
      };
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should return false for version 6', () => {
      const preamble = {
        version: 6,
        extrinsicType: ExtrinsicType.Bare,
      };
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });
  });

  describe('throws exceptions for invalid version/type combinations', () => {
    it('should throw for V4 with General type', () => {
      const preamble = {
        version: 4,
        extrinsicType: ExtrinsicType.General,
      };

      expect(() => new GenericExtrinsic({} as any, {}, preamble as any)).toThrow(
        new DedotError('Version 4 does not support General extrinsic type')
      );
    });

    it('should throw for V5 with Signed type', () => {
      const preamble = {
        version: 5,
        extrinsicType: ExtrinsicType.Signed,
      };

      expect(() => new GenericExtrinsic({} as any, {}, preamble as any)).toThrow(
        new DedotError('Version 5 does not support Signed extrinsic type')
      );
    });
  });

  describe('accepts valid preambles', () => {
    it('should accept valid V4 bare preamble', () => {
      const preamble: PreambleV4Bare = {
        version: 4,
        extrinsicType: ExtrinsicType.Bare,
      };

      const extrinsic = new GenericExtrinsic({} as any, {}, preamble);
      expect(extrinsic.version).toBe(4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Bare);
    });

    it('should accept valid V4 signed preamble', () => {
      const preamble: PreambleV4Signed = {
        version: 4,
        extrinsicType: ExtrinsicType.Signed,
        signature: {
          address: 'test_address',
          signature: 'test_signature',
          extra: [],
        },
      };

      const extrinsic = new GenericExtrinsic({} as any, {}, preamble);
      expect(extrinsic.version).toBe(4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
      expect(extrinsic.signature).toEqual(preamble.signature);
    });

    it('should accept valid V5 bare preamble', () => {
      const preamble: PreambleV5Bare = {
        version: 5,
        extrinsicType: ExtrinsicType.Bare,
      };

      const extrinsic = new GenericExtrinsic({} as any, {}, preamble);
      expect(extrinsic.version).toBe(5);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Bare);
    });

    it('should accept valid V5 general preamble', () => {
      const preamble: PreambleV5General = {
        version: 5,
        extrinsicType: ExtrinsicType.General,
        versionedExtensions: {
          extensionVersion: 0,
          extra: [],
        },
      };

      const extrinsic = new GenericExtrinsic({} as any, {}, preamble);
      expect(extrinsic.version).toBe(5);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.General);
      expect(extrinsic.extensions).toEqual(preamble.versionedExtensions);
    });
  });

  describe('returns false for other invalid cases', () => {
    it('should return false for V4 with invalid extrinsic type', () => {
      const preamble = {
        version: 4,
        extrinsicType: 'invalid_type',
      };
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should return false for V5 with invalid extrinsic type', () => {
      const preamble = {
        version: 5,
        extrinsicType: 'invalid_type',
      };
      // When isPreamble returns false but preamble is truthy, it's treated as legacy signature (v4 signed)
      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(EXTRINSIC_FORMAT_VERSION_V4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });
  });

  describe('edge cases', () => {
    it('should handle objects with extra properties', () => {
      const preamble = {
        version: 4,
        extrinsicType: ExtrinsicType.Bare,
        extraProperty: 'should be ignored',
        anotherExtra: 123,
      };

      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Bare);
    });

    it('should handle V4 Signed with extra properties', () => {
      const preamble = {
        version: 4,
        extrinsicType: ExtrinsicType.Signed,
        signature: { address: 'test', signature: 'test', extra: [] },
        extraProperty: 'should be ignored',
      };

      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(4);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.Signed);
    });

    it('should handle V5 General with extra properties', () => {
      const preamble = {
        version: 5,
        extrinsicType: ExtrinsicType.General,
        versionedExtensions: { extensionVersion: 0, extra: [] },
        extraProperty: 'should be ignored',
      };

      const extrinsic = new GenericExtrinsic({} as any, {}, preamble as any);
      expect(extrinsic.version).toBe(5);
      expect(extrinsic.extrinsicType).toBe(ExtrinsicType.General);
    });
  });
});