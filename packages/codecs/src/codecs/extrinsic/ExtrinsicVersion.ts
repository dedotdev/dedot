import * as $ from '@dedot/shape';
import { assert } from '@dedot/utils';

export const EXTRINSIC_FORMAT_VERSION = 4;

// Only support V4 for now!
const verifyExtrinsicVersion = (actualVersion: number) => {
  assert(actualVersion === EXTRINSIC_FORMAT_VERSION, `Unsupported extrinsic format version, found: ${actualVersion}`);
};

export type ExtrinsicVersion = {
  signed: boolean;
  version: number;
};

export const $ExtrinsicVersion: $.Shape<ExtrinsicVersion> = $.createShape({
  metadata: $.metadata('$ExtrinsicVersion'),
  staticSize: 1,
  subDecode(buffer: $.DecodeBuffer): ExtrinsicVersion {
    const firstByte = buffer.array[buffer.index++]!;

    // https://github.com/paritytech/polkadot-sdk/blob/943697fa693a4da6ef481ef93df522accb7d0583/substrate/primitives/runtime/src/generic/unchecked_extrinsic.rs#L266-L270
    const signed = (firstByte & 0b1000_0000) !== 0;
    const version = firstByte & 0b0111_1111;
    verifyExtrinsicVersion(version);

    return {
      signed,
      version,
    };
  },
  subEncode(buffer: $.EncodeBuffer, value): void {
    const { signed, version } = value;
    verifyExtrinsicVersion(version);

    // https://github.com/paritytech/polkadot-sdk/blob/943697fa693a4da6ef481ef93df522accb7d0583/substrate/primitives/runtime/src/generic/unchecked_extrinsic.rs#L300-L308
    buffer.array[buffer.index++] = (+signed << 7) | version;
  },
});
