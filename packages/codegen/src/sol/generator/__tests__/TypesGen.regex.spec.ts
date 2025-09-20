import type { SolABITypeDef } from '@dedot/contracts';
import { describe, expect, it } from 'vitest';
import { TypesGen } from '../TypesGen.js';

const gen = new TypesGen([]);

const td = (type: string, name = 'x', components?: SolABITypeDef[]): SolABITypeDef => ({
  name,
  type,
  ...(components ? { components } : {}),
});

describe('TypesGen regex coverage', () => {
  it('expect INT/UINT map to number for <=48 bits, bigint otherwise', () => {
    // Safe signed ints (<=48)
    expect(gen.generateType(td('int8'))).toBe('number');
    expect(gen.generateType(td('int16'))).toBe('number');
    expect(gen.generateType(td('int32'))).toBe('number');
    expect(gen.generateType(td('int48'))).toBe('number');
    expect(gen.generateType(td('int16[]'))).toBe('number[]');
    expect(gen.generateType(td('int48[3]'))).toBe('number[]');

    // Unsafe signed ints (>48) or unspecified (default 256)
    expect(gen.generateType(td('int'))).toBe('bigint');
    expect(gen.generateType(td('int256'))).toBe('bigint');
    expect(gen.generateType(td('int56'))).toBe('bigint');
    expect(gen.generateType(td('int56[]'))).toBe('bigint[]');

    // Safe unsigned ints (<=48)
    expect(gen.generateType(td('uint8'))).toBe('number');
    expect(gen.generateType(td('uint16'))).toBe('number');
    expect(gen.generateType(td('uint32'))).toBe('number');
    expect(gen.generateType(td('uint48'))).toBe('number');
    expect(gen.generateType(td('uint8[]'))).toBe('number[]');
    expect(gen.generateType(td('uint48[2]'))).toBe('number[]');

    // Unsafe unsigned ints (>48) or unspecified (default 256)
    expect(gen.generateType(td('uint'))).toBe('bigint');
    expect(gen.generateType(td('uint256'))).toBe('bigint');
    expect(gen.generateType(td('uint56'))).toBe('bigint');
    expect(gen.generateType(td('uint256[42]'))).toBe('bigint[]');
  });

  it('expect BYTES_TYPES handle bytes, bytesN arrays; input vs output', () => {
    // Input (typeOut=false)
    expect(gen.generateType(td('bytes'))).toBe('BytesLike');
    expect(gen.generateType(td('bytes[]'))).toBe('BytesLike[]');
    expect(gen.generateType(td('bytes32'))).toBe('FixedBytes<32>');
    expect(gen.generateType(td('bytes32[]'))).toBe('FixedBytes<32>[]');

    // Output (typeOut=true)
    expect(gen.generateType(td('bytes'), undefined, 0, true)).toBe('Bytes');
    expect(gen.generateType(td('bytes[]'), undefined, 0, true)).toBe('Bytes[]');
    expect(gen.generateType(td('bytes16'), undefined, 0, true)).toBe('FixedBytes<16>');
    expect(gen.generateType(td('bytes16[]'), undefined, 0, true)).toBe('FixedBytes<16>[]');
  });

  it('expect BOOL_TYPES handle bool with optional arrays', () => {
    expect(gen.generateType(td('bool'))).toBe('boolean');
    expect(gen.generateType(td('bool[]'))).toBe('boolean[]');
    expect(gen.generateType(td('bool[3]'))).toBe('boolean[]');
  });

  it('expect STRING_TYPES handle string with optional arrays', () => {
    expect(gen.generateType(td('string'))).toBe('string');
    expect(gen.generateType(td('string[]'))).toBe('string[]');
    expect(gen.generateType(td('string[2]'))).toBe('string[]');
  });

  it('expect ADDRESS_TYPES handle address arrays; input vs output', () => {
    // Input (typeOut=false)
    expect(gen.generateType(td('address'))).toBe('string');
    expect(gen.generateType(td('address[]'))).toBe('string[]');

    // Output (typeOut=true)
    expect(gen.generateType(td('address'), undefined, 0, true)).toBe('H160');
    expect(gen.generateType(td('address[]'), undefined, 0, true)).toBe('H160[]');
  });

  it('expect FUNCTION_TYPES handle function with optional arrays', () => {
    expect(gen.generateType(td('function'))).toBe('FixedBytes<24>');
    expect(gen.generateType(td('function[]'))).toBe('FixedBytes<24>[]');
  });

  it('expect FIXED_TYPES handle optional size and arrays', () => {
    expect(gen.generateType(td('fixed'))).toBe('number');
    expect(gen.generateType(td('fixed128x18'))).toBe('number');
    expect(gen.generateType(td('fixed[5]'))).toBe('number[]');
    expect(gen.generateType(td('fixed128x18[2]'))).toBe('number[]');
  });

  it('expect UNFIXED_TYPES handle optional size and arrays', () => {
    expect(gen.generateType(td('ufixed'))).toBe('number');
    expect(gen.generateType(td('ufixed128x18'))).toBe('number');
    expect(gen.generateType(td('ufixed[5]'))).toBe('number[]');
    expect(gen.generateType(td('ufixed[]'))).toBe('number[]');
  });

  it('expect COMPONENT_TYPES handle empty tuple and arrays', () => {
    expect(gen.generateType(td('tuple'))).toBe('{}');
    expect(gen.generateType(td('tuple[]'))).toBe('{}[]');
  });

  it('expect COMPONENT_TYPES with named components generate object type', () => {
    const t = td('tuple', 't', [td('uint', 'a'), td('string', 'b')]);
    expect(gen.generateType(t)).toBe('{' + 'a: bigint' + ',\n' + 'b: string' + '}');
  });

  it('expect COMPONENT_TYPES with anonymous components generate tuple-like type', () => {
    const t = td('tuple', 't', [td('uint', ''), td('string', '')]);
    expect(gen.generateType(t)).toBe('[bigint, string]');
  });

  it('expect COMPONENT_TYPES respect safe/unsafe int widths', () => {
    const t = td('tuple', 't', [td('uint32', 'a'), td('int56', 'b')]);
    expect(gen.generateType(t)).toBe('{' + 'a: number' + ',\n' + 'b: bigint' + '}');
  });

  it('expect to throw on unsupported type', () => {
    expect(() => gen.generateType(td('weirdtype'))).toThrowError(/Unsupported Solidity type/);
  });
});
