import * as $ from '@dedot/shape';
import { assert } from '@dedot/utils';

// Bit masks for v5
const VERSION_MASK = 0b0011_1111; // bits 0-5 for version
const TYPE_MASK = 0b1100_0000; // bits 6-7 for type

// Extrinsic types for v5
const BARE_EXTRINSIC = 0b0000_0000;
const SIGNED_EXTRINSIC = 0b1000_0000;
const GENERAL_EXTRINSIC = 0b0100_0000;

export const LEGACY_EXTRINSIC_FORMAT_VERSION = 4;
export const EXTRINSIC_FORMAT_VERSION = 5;

// Support both V4 and V5
const verifyExtrinsicVersion = (actualVersion: number) => {
  assert(
    actualVersion === LEGACY_EXTRINSIC_FORMAT_VERSION || actualVersion === EXTRINSIC_FORMAT_VERSION,
    `Unsupported extrinsic format version, found: ${actualVersion}`,
  );
};

export type ExtrinsicVersion = {
  version: number;
  type: 'bare' | 'signed' | 'general';
};

export const $ExtrinsicVersion: $.Shape<ExtrinsicVersion> = $.createShape({
  metadata: $.metadata('$ExtrinsicVersion'),
  staticSize: 1,
  subDecode(buffer: $.DecodeBuffer): ExtrinsicVersion {
    const firstByte = buffer.array[buffer.index++]!;

    // For v4: bit 7 is signed flag, bits 0-6 are version
    // For v5: bits 6-7 are type, bits 0-5 are version
    const version = firstByte & VERSION_MASK;
    const typeBits = firstByte & TYPE_MASK;

    let type: 'bare' | 'signed' | 'general';

    if (version === LEGACY_EXTRINSIC_FORMAT_VERSION) {
      // V4 compatibility: use old logic where bit 7 indicates signed
      const signed = (firstByte & 0b1000_0000) !== 0;
      type = signed ? 'signed' : 'bare';
    } else if (version === EXTRINSIC_FORMAT_VERSION) {
      // V5: use new type bits
      switch (typeBits) {
        case BARE_EXTRINSIC:
          type = 'bare';
          break;
        case SIGNED_EXTRINSIC:
          type = 'signed';
          break;
        case GENERAL_EXTRINSIC:
          type = 'general';
          break;
        default:
          throw new Error(`Invalid extrinsic type bits: ${typeBits.toString(2)}`);
      }
    } else {
      throw new Error(`Unsupported extrinsic format version: ${version}`);
    }

    return { version, type };
  },
  subEncode(buffer: $.EncodeBuffer, value): void {
    const { version, type } = value;
    verifyExtrinsicVersion(version);

    let byte: number;

    if (version === LEGACY_EXTRINSIC_FORMAT_VERSION) {
      // V4 compatibility: encode with old format (bit 7 for signed)
      const signed = type === 'signed';
      byte = (+signed << 7) | version;
    } else if (version === EXTRINSIC_FORMAT_VERSION) {
      // V5: encode with new format (bits 6-7 for type)
      let typeBits: number;
      switch (type) {
        case 'bare':
          typeBits = BARE_EXTRINSIC;
          break;
        case 'signed':
          typeBits = SIGNED_EXTRINSIC;
          break;
        case 'general':
          typeBits = GENERAL_EXTRINSIC;
          break;
        default:
          throw new Error(`Invalid extrinsic type: ${type}`);
      }
      byte = typeBits | version;
    } else {
      throw new Error(`Unsupported extrinsic format version: ${version}`);
    }

    buffer.array[buffer.index++] = byte;
  },
});
