import * as $ from '@dedot/shape';
import { assert, DedotError } from '@dedot/utils';

// Bit masks for v5
const VERSION_MASK = 0b0011_1111; // bits 0-5 for version
const TYPE_MASK = 0b1100_0000; // bits 6-7 for type

// Extrinsic types for v5
const BARE_EXTRINSIC = 0b0000_0000;
const SIGNED_EXTRINSIC = 0b1000_0000;
const GENERAL_EXTRINSIC = 0b0100_0000;

export const EXTRINSIC_FORMAT_VERSION_V4 = 4;
export const EXTRINSIC_FORMAT_VERSION_V5 = 5;

// Support both V4 and V5
const verifyExtrinsicVersion = (actualVersion: number) => {
  assert(
    actualVersion === EXTRINSIC_FORMAT_VERSION_V4 || actualVersion === EXTRINSIC_FORMAT_VERSION_V5,
    `Unsupported extrinsic format version, found: ${actualVersion}`,
  );
};

export enum ExtrinsicType {
  Bare = 'bare',
  Signed = 'signed',
  General = 'general',
}

export type ExtrinsicVersion = {
  version: number;
  type: ExtrinsicType;
};

export const $ExtrinsicVersion: $.Shape<ExtrinsicVersion> = $.createShape({
  metadata: $.metadata('$ExtrinsicVersion'),
  staticSize: 1,
  subDecode(buffer: $.DecodeBuffer): ExtrinsicVersion {
    const firstByte = buffer.array[buffer.index++]!;

    // For v4: bit 7 is signed flag, bits 0-6 are version
    // For v5: bits 6-7 are type, bits 0-5 are version
    const version = firstByte & VERSION_MASK;

    let type: ExtrinsicType;

    if (version === EXTRINSIC_FORMAT_VERSION_V4) {
      // V4 compatibility: use old logic where bit 7 indicates signed
      const signed = (firstByte & SIGNED_EXTRINSIC) !== 0;
      type = signed ? ExtrinsicType.Signed : ExtrinsicType.Bare;
    } else if (version === EXTRINSIC_FORMAT_VERSION_V5) {
      const typeBits = firstByte & TYPE_MASK;

      // V5: use new type bits
      switch (typeBits) {
        case BARE_EXTRINSIC:
          type = ExtrinsicType.Bare;
          break;
        case SIGNED_EXTRINSIC:
          type = ExtrinsicType.Signed;
          break;
        case GENERAL_EXTRINSIC:
          type = ExtrinsicType.General;
          break;
        default:
          throw new DedotError(`Invalid extrinsic type bits: ${typeBits.toString(2)}`);
      }
    } else {
      throw new DedotError(`Unsupported extrinsic format version: ${version}`);
    }

    return { version, type };
  },
  subEncode(buffer: $.EncodeBuffer, value): void {
    const { version, type } = value;
    verifyExtrinsicVersion(version);

    let byte: number;

    if (version === EXTRINSIC_FORMAT_VERSION_V4) {
      // V4 compatibility: encode with old format (bit 7 for signed)
      const signed = type === ExtrinsicType.Signed;
      byte = (+signed << 7) | version;
    } else if (version === EXTRINSIC_FORMAT_VERSION_V5) {
      // V5: encode with new format (bits 6-7 for type)
      let typeBits: number;
      switch (type) {
        case ExtrinsicType.Bare:
          typeBits = BARE_EXTRINSIC;
          break;
        case ExtrinsicType.Signed:
          typeBits = SIGNED_EXTRINSIC;
          break;
        case ExtrinsicType.General:
          typeBits = GENERAL_EXTRINSIC;
          break;
        default:
          throw new DedotError(`Invalid extrinsic type: ${type}`);
      }
      byte = typeBits | version;
    } else {
      throw new DedotError(`Unsupported extrinsic format version: ${version}`);
    }

    buffer.array[buffer.index++] = byte;
  },
  subAssert(assert: $.AssertState) {
    // Validate it's an object with the required structure
    assert.typeof(this, 'object');
    assert.nonNull(this);

    const value = assert.value as ExtrinsicVersion;

    // Validate version field
    const versionAssert = assert.key(this, 'version');
    versionAssert.typeof(this, 'number');

    // Verify version is 4 or 5
    if (value.version !== EXTRINSIC_FORMAT_VERSION_V4 && value.version !== EXTRINSIC_FORMAT_VERSION_V5) {
      throw new $.ShapeAssertError(
        this,
        assert.value,
        `${assert.path}.version: Invalid extrinsic version: ${value.version}, expected 4 or 5`,
      );
    }

    // Validate type field
    const typeAssert = assert.key(this, 'type');
    typeAssert.typeof(this, 'string');

    // Verify type is a valid ExtrinsicType enum value
    const validTypes = Object.values(ExtrinsicType);
    if (!validTypes.includes(value.type)) {
      throw new $.ShapeAssertError(
        this,
        assert.value,
        `${assert.path}.type: Invalid extrinsic type: ${value.type}, expected one of: ${validTypes.join(', ')}`,
      );
    }

    // Additional validation: V4 doesn't support General type
    if (value.version === EXTRINSIC_FORMAT_VERSION_V4 && value.type === ExtrinsicType.General) {
      throw new $.ShapeAssertError(
        this,
        assert.value,
        `${assert.path}: Extrinsic version 4 does not support type 'general'`,
      );
    }
  },
});
