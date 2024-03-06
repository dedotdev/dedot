import * as $ from '@dedot/shape';
import { $AccountId32, AccountId32 } from '../../generic';

/**
 * A multi-format address wrapper for on-chain accounts.
 */
export const $MultiAddressBase = $.Enum({
  /// It's an account ID (pubkey).
  Id: $AccountId32, // TODO generalize AccountId
  /// It's an account index.
  Index: $.compactU32,
  /// It's some arbitrary raw bytes.
  Raw: $.PrefixedHex,
  /// It's a 32 byte representation.
  Address32: $.FixedHex(32),
  /// Its a 20 byte representation.
  Address20: $.FixedHex(20),
});

export const $MultiAddress: $.Shape<MultiAddressLike, MultiAddress> = $.transform({
  $base: $MultiAddressBase,
  encode: (value): $.Input<typeof $MultiAddressBase> => {
    if (typeof value === 'string' || value instanceof AccountId32) {
      return { tag: 'Id', value };
    }

    return value;
  },
  decode: (value) => value,
});

export type MultiAddressLike = $.Input<typeof $MultiAddressBase> | string | AccountId32;
export type MultiAddress = $.Output<typeof $MultiAddressBase>;
