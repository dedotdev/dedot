import { IKeyringPair } from '@polkadot/types/types';
import type { AddressOrPair } from '@dedot/types';
import { blake2AsU8a, HexString, hexToU8a, isFunction } from '@dedot/utils';

export function isKeyringPair(account: AddressOrPair): account is IKeyringPair {
  return isFunction((account as IKeyringPair).sign);
}

/**
 * Sign a raw message
 * @param signerPair
 * @param raw
 */
export function signRaw(signerPair: IKeyringPair, raw: HexString): Uint8Array {
  const u8a = hexToU8a(raw);
  // Ref: https://github.com/paritytech/polkadot-sdk/blob/943697fa693a4da6ef481ef93df522accb7d0583/substrate/primitives/runtime/src/generic/unchecked_extrinsic.rs#L234-L238
  const toSignRaw = u8a.length > 256 ? blake2AsU8a(u8a, 256) : u8a;

  return signerPair.sign(toSignRaw, { withType: true });
}
