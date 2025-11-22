import { HexString, hexToU8a } from '@dedot/utils';
import { assert } from '@dedot/shape';
import { describe, expect, it } from 'vitest';
import { $OpaqueExtrinsic } from '../OpaqueExtrinsic.js';

describe('OpaqueExtrinsic', () => {
  const prefixedTx: HexString = '0x280403000b51d93fda8d01';

  it('should decode', () => {
    expect($OpaqueExtrinsic.tryDecode(prefixedTx)).toEqual(prefixedTx);
  });

  it('should encode', () => {
    expect($OpaqueExtrinsic.tryEncode(prefixedTx)).toEqual(hexToU8a(prefixedTx));
  });

  describe('subAssert', () => {
    describe('valid HexString inputs', () => {
      it('should accept valid hex string with 0x prefix', () => {
        expect(() => assert($OpaqueExtrinsic, '0x280403000b51d93fda8d01')).not.toThrow();
        expect(() => assert($OpaqueExtrinsic, '0x1234')).not.toThrow();
      });

      it('should accept long hex string', () => {
        expect(() => assert($OpaqueExtrinsic, '0x' + '00'.repeat(100))).not.toThrow();
      });

      it('should accept empty hex', () => {
        expect(() => assert($OpaqueExtrinsic, '0x')).not.toThrow();
      });
    });

    describe('valid Uint8Array inputs', () => {
      it('should accept Uint8Array', () => {
        expect(() => assert($OpaqueExtrinsic, new Uint8Array([1, 2, 3, 4]))).not.toThrow();
      });

      it('should accept empty Uint8Array', () => {
        expect(() => assert($OpaqueExtrinsic, new Uint8Array([]))).not.toThrow();
      });

      it('should accept large Uint8Array', () => {
        expect(() => assert($OpaqueExtrinsic, new Uint8Array(1000))).not.toThrow();
      });
    });

    describe('invalid type errors', () => {
      it('should throw for number', () => {
        expect(() => assert($OpaqueExtrinsic, 123 as any)).toThrow();
      });

      it('should throw for boolean', () => {
        expect(() => assert($OpaqueExtrinsic, true as any)).toThrow();
        expect(() => assert($OpaqueExtrinsic, false as any)).toThrow();
      });

      it('should throw for null', () => {
        expect(() => assert($OpaqueExtrinsic, null as any)).toThrow();
      });

      it('should throw for undefined', () => {
        expect(() => assert($OpaqueExtrinsic, undefined as any)).toThrow();
      });

      it('should throw for object', () => {
        expect(() => assert($OpaqueExtrinsic, {} as any)).toThrow();
        expect(() => assert($OpaqueExtrinsic, { hex: '0x1234' } as any)).toThrow();
      });

      it('should throw for array (not Uint8Array)', () => {
        expect(() => assert($OpaqueExtrinsic, [1, 2, 3] as any)).toThrow();
      });
    });

    describe('invalid hex string errors', () => {
      it('should throw for invalid hex string', () => {
        expect(() => assert($OpaqueExtrinsic, '0xGGGG')).toThrow();
        expect(() => assert($OpaqueExtrinsic, '0xZZZZ')).toThrow();
      });

      it('should throw for string without 0x prefix and not hex', () => {
        expect(() => assert($OpaqueExtrinsic, 'not-hex')).toThrow();
        expect(() => assert($OpaqueExtrinsic, 'hello')).toThrow();
      });

      it('should throw for string with invalid hex characters', () => {
        expect(() => assert($OpaqueExtrinsic, '0x12XY')).toThrow();
      });

      it('should throw for string without 0x prefix', () => {
        expect(() => assert($OpaqueExtrinsic, '1234')).toThrow();
      });
    });
  });
});
