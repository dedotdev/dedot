import * as $ from '@delightfuldot/shape';
import { $AccountId32 } from '../../generic';

export * from './TransactionValidityError';
export * from './DispatchError';
export * from './ApplyExtrinsicResult';

/**
 * A multi-format address wrapper for on-chain accounts.
 */
export const $MultiAddress = $.Enum({
  /// It's an account ID (pubkey).
  Id: $AccountId32,
  /// It's an account index.
  Index: $.compactU32,
  /// It's some arbitrary raw bytes.
  Raw: $.PrefixedHex,
  /// It's a 32 byte representation.
  Address32: $.FixedHex(32),
  /// Its a 20 byte representation.
  Address20: $.FixedHex(20),
});

export type MultiAddress = $.Input<typeof $MultiAddress>;
