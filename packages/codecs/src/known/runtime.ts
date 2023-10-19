import * as $ from '@delightfuldot/shape';
import { $AccountId32 } from '../generic';

export const $MultiAddress = $.Struct({
  Id: $AccountId32,
  Index: $.compactU32,
  Raw: $.PrefixedHex,
  Address32: $.FixedHex(32),
  Address20: $.FixedHex(20),
});

export type MultiAddress = $.Output<typeof $MultiAddress>;
