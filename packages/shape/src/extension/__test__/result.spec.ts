import { u8aToHex } from '@dedot/utils';
import { describe, it, expect, beforeEach } from 'vitest';
import { assert } from '../../deshape.js';
import * as $ from '../../index.js';

describe('Result', () => {
  let $x: $.Shape<any, any>;
  beforeEach(() => {
    $x = $.Result($.u8, $.bool);
  });

  it('should encode ok', () => {
    expect(u8aToHex($x.encode({ isOk: true, value: 42 }))).toEqual('0x002a');
  });

  it('should decode ok', () => {
    expect($x.tryDecode('0x002a')).toEqual({ isOk: true, isErr: false, value: 42 });
  });

  it('should encode err', () => {
    expect(u8aToHex($x.encode({ isErr: true, err: false }))).toEqual('0x0100');
  });

  it('should decode err', () => {
    expect($x.tryDecode('0x0100')).toEqual({ isOk: false, isErr: true, err: false });
  });

  describe('nested result', () => {
    let $x: $.Shape<any, any>;
    beforeEach(() => {
      $x = $.Result($.Result($.u8, $.bool), $.Struct({ index: $.u32 }));
    });

    it('should encode ok / ok', () => {
      expect(u8aToHex($x.encode({ isOk: true, value: { isOk: true, value: 42 } }))).toEqual('0x00002a');
      expect(u8aToHex($x.encode({ isOk: true, value: { isErr: false, value: 42 } }))).toEqual('0x00002a');
    });

    it('should decode ok / ok', () => {
      expect($x.tryDecode('0x00002a')).toEqual({
        isOk: true,
        isErr: false,
        value: { isOk: true, isErr: false, value: 42 },
      });
    });

    it('should encode ok / err', () => {
      expect(u8aToHex($x.encode({ isOk: true, value: { isErr: true, err: false } }))).toEqual('0x000100');
      expect(u8aToHex($x.encode({ isOk: true, value: { isOk: false, err: false } }))).toEqual('0x000100');
    });

    it('should decode ok / err', () => {
      expect($x.tryDecode('0x000100')).toEqual({
        isOk: true,
        isErr: false,
        value: { isOk: false, isErr: true, err: false },
      });
    });

    it('should encode err', () => {
      expect(u8aToHex($x.encode({ isErr: true, err: { index: 42 } }))).toEqual('0x012a000000');
    });

    it('should decode err', () => {
      expect($x.tryDecode('0x012a000000')).toEqual({
        isOk: false,
        isErr: true,
        err: { index: 42 },
      });
    });
  });

  describe('subAssert', () => {
    let $simpleResult: $.Shape<any, any>;
    let $nestedResult: $.Shape<any, any>;

    beforeEach(() => {
      $simpleResult = $.Result($.u8, $.bool);
      $nestedResult = $.Result($.Result($.u8, $.bool), $.Struct({ index: $.u32 }));
    });

    describe('valid inputs', () => {
      it('should accept valid Ok result', () => {
        expect(() => assert($simpleResult, { isOk: true, value: 42 })).not.toThrow();
      });

      it('should accept valid Err result', () => {
        expect(() => assert($simpleResult, { isErr: true, err: false })).not.toThrow();
      });

      it('should accept nested Ok/Ok result', () => {
        expect(() =>
          assert($nestedResult, { isOk: true, value: { isOk: true, value: 42 } }),
        ).not.toThrow();
      });

      it('should accept nested Ok/Err result', () => {
        expect(() =>
          assert($nestedResult, { isOk: true, value: { isErr: true, err: false } }),
        ).not.toThrow();
      });

      it('should accept nested Err result', () => {
        expect(() => assert($nestedResult, { isErr: true, err: { index: 42 } })).not.toThrow();
      });
    });

    describe('invalid type errors', () => {
      it('should throw for non-object input', () => {
        expect(() => assert($simpleResult, 'string' as any)).toThrow();
        expect(() => assert($simpleResult, 123 as any)).toThrow();
      });

      it('should throw for null input', () => {
        expect(() => assert($simpleResult, null as any)).toThrow();
      });

      it('should throw for array input', () => {
        expect(() => assert($simpleResult, [] as any)).toThrow();
      });
    });

    describe('invalid discriminant errors', () => {
      it('should throw when both isOk and isErr are false', () => {
        expect(() => assert($simpleResult, { isOk: false, isErr: false, value: 42 } as any)).toThrow();
      });

      it('should throw when both isOk and isErr are undefined', () => {
        expect(() => assert($simpleResult, { value: 42 } as any)).toThrow();
      });

      it('should throw when neither isOk nor isErr are true', () => {
        expect(() => assert($simpleResult, {} as any)).toThrow();
      });
    });

    describe('nested validation errors', () => {
      it('should throw when nested Ok value has invalid type', () => {
        expect(() =>
          assert($nestedResult, { isOk: true, value: { isOk: true, value: 'not-a-number' } } as any),
        ).toThrow();
      });

      it('should throw when nested Err value has invalid type', () => {
        expect(() =>
          assert($nestedResult, { isOk: true, value: { isErr: true, err: 123 } } as any),
        ).toThrow();
      });

      it('should throw when Err value has invalid structure', () => {
        expect(() => assert($nestedResult, { isErr: true, err: { wrong: 42 } } as any)).toThrow();
      });
    });
  });
});
