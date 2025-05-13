import { OpaqueMetadata } from '@dedot/codecs/codecs';
import * as $ from '@dedot/shape';
import { ensurePresence, HexString, u8aToHex } from '@dedot/utils';
import { toV15, toV16 } from './conversion/index.js';
import { $MetadataV14 } from './v14.js';
import { $MetadataV15 } from './v15.js';
import {
  $PalletDefV16,
  $RuntimeApiMethodDefV16,
  $SignedExtensionDefV16,
  $StorageEntryV16,
  PalletDefV16,
  SignedExtensionDefV16,
  RuntimeApiMethodDefV16,
  StorageEntryV16,
} from './v16.js';
import { $MetadataV16, MetadataV16 } from './v16.js';

export const notSupportedCodec = (msg = 'Not supported!'): $.Shape<never> => {
  return $.createShape({
    metadata: $.metadata('$.NotSupported'),
    staticSize: 0,
    subEncode(buffer: $.EncodeBuffer, value) {
      throw new Error(msg);
    },
    subDecode(buffer: $.DecodeBuffer) {
      throw new Error(msg);
    },
  });
};

export const $NotSupported = notSupportedCodec();

export const $MetadataVersioned = $.Enum({
  V0: notSupportedCodec('Metadata V0 is not supported'),
  V1: notSupportedCodec('Metadata V1 is not supported'),
  V2: notSupportedCodec('Metadata V2 is not supported'),
  V3: notSupportedCodec('Metadata V3 is not supported'),
  V4: notSupportedCodec('Metadata V4 is not supported'),
  V5: notSupportedCodec('Metadata V5 is not supported'),
  V6: notSupportedCodec('Metadata V6 is not supported'),
  V7: notSupportedCodec('Metadata V7 is not supported'),
  V8: notSupportedCodec('Metadata V8 is not supported'),
  V9: notSupportedCodec('Metadata V9 is not supported'),
  V10: notSupportedCodec('Metadata V10 is not supported'),
  V11: notSupportedCodec('Metadata V11 is not supported'),
  V12: notSupportedCodec('Metadata V12 is not supported'),
  V13: notSupportedCodec('Metadata V13 is not supported'),
  V14: $MetadataV14,
  V15: $MetadataV15,
  V16: $MetadataV16,
});

export type MetadataVersioned = $.Input<typeof $MetadataVersioned>;

// Ref: https://github.com/paritytech/frame-metadata/blob/a07b2451b82809501fd797691046c1164f7e8840/frame-metadata/src/v14.rs#L30
export const MAGIC_NUMBER = 1635018093; // 0x6174656d

export const $MetadataLatest = $MetadataV16;
export type MetadataLatest = MetadataV16;

export const $PalletDefLatest = $PalletDefV16;
export type PalletDefLatest = PalletDefV16;

export const $StorageEntryLatest = $StorageEntryV16;
export type StorageEntryLatest = StorageEntryV16;

export const $SignedExtensionDefLatest = $SignedExtensionDefV16;
export type SignedExtensionDefLatest = SignedExtensionDefV16;

export const $RuntimeApiMethodDefLatest = $RuntimeApiMethodDefV16;
export type RuntimeApiMethodDefLatest = RuntimeApiMethodDefV16;

export class Metadata {
  magicNumber: number;
  metadataVersioned: MetadataVersioned;

  constructor(magicNumber: number, metadata: MetadataVersioned) {
    if (magicNumber !== MAGIC_NUMBER) {
      throw new Error('Invalid magic number');
    }

    this.magicNumber = magicNumber;
    this.metadataVersioned = metadata;
  }

  get versionNumber(): number {
    return parseInt(this.version.substring(1));
  }

  get version() {
    return this.metadataVersioned.type;
  }

  get latest(): MetadataLatest {
    const currentVersion = this.metadataVersioned.type;
    if (currentVersion === 'V16') {
      return this.metadataVersioned.value;
    } else if (currentVersion === 'V15') {
      return toV16(this.metadataVersioned.value);
    } else if (currentVersion === 'V14') {
      return toV16(toV15(this.metadataVersioned.value));
    }

    throw new Error(`Unsupported metadata version, found: ${currentVersion}`);
  }
}

export const $Metadata: $.Shape<Metadata> = $.instance(
  Metadata,
  $.Tuple($.u32, $MetadataVersioned),
  (metadata: Metadata) => [metadata.magicNumber, metadata.metadataVersioned],
);

export const decodeOpaqueMetadata = (opaqueMetadata: OpaqueMetadata): Metadata => {
  return ensurePresence(
    $.Option($.lenPrefixed($Metadata)).tryDecode(opaqueMetadata), // prettier-end-here
    'Invalid opaque metadata',
  );
};

export const unwrapOpaqueMetadata = (opaqueMetadata: OpaqueMetadata): HexString => {
  return u8aToHex($Metadata.tryEncode(decodeOpaqueMetadata(opaqueMetadata)));
};
