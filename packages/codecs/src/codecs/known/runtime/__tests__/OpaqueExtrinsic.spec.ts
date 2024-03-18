import { describe, expect, it } from 'vitest';
import { HexString, hexToU8a } from '@dedot/utils';
import { $OpaqueExtrinsic } from '../OpaqueExtrinsic.js';

describe('OpaqueExtrinsic', () => {
  const prefixedTx: HexString = '0x280403000b51d93fda8d01';

  it('should decode', () => {
    expect($OpaqueExtrinsic.tryDecode(prefixedTx)).toEqual(prefixedTx);
  });

  it('should encode', () => {
    expect($OpaqueExtrinsic.tryEncode(prefixedTx)).toEqual(hexToU8a(prefixedTx));
  });
});
