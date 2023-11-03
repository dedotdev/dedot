import { hexToBn, isHex } from '@polkadot/util';
import * as $ from '@delightfuldot/shape';
import { HexString } from '@delightfuldot/utils';

export const $BlockNumber = $.u32; // TODO docs: why fixed at u32?
$BlockNumber.registerDecoder(
  (input) => isHex(input, -1, true),
  ($shape, input) =>
    hexToBn(input, {
      isLe: false, // TODO docs: why Le=false here?
      isNegative: false,
    }).toNumber(),
);

export type BlockNumberLike = number | HexString;
export type BlockNumber = number;
