import { describe, expect, it } from 'vitest';
import { HexString } from '@dedot/utils';
import { $OpaqueExtrinsic } from '../OpaqueExtrinsic';
import { hexToU8a } from '@polkadot/util';

describe('OpaqueExtrinsic', () => {
  const prefixedTx: HexString = '0x280403000b51d93fda8d01';

  it('should decode', () => {
    expect($OpaqueExtrinsic.tryDecode(prefixedTx)).toEqual(prefixedTx);
  });

  it('should encode', () => {
    expect($OpaqueExtrinsic.tryEncode(prefixedTx)).toEqual(hexToU8a(prefixedTx));
  });
});
