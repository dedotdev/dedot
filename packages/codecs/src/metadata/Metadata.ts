import * as $ from '@delightfuldot/shape';
import { $MetadataV14 } from './v14';

export const $NotSupported: $.Shape<never> = $.createShape({
  metadata: $.metadata('$.NotSupported'),
  staticSize: 0,
  subEncode(buffer: $.EncodeBuffer, value) {
    throw new Error('Not supported!');
  },
  subDecode(buffer: $.DecodeBuffer) {
    throw new Error('Not supported!');
  },
  subAssert(state: $.AssertState) {
    throw new Error('Not supported!');
  },
});

export const $NS = $NotSupported;

export const $MetadataVersioned = $.Enum({
  V0: $NS,
  V1: $NS,
  V2: $NS,
  V3: $NS,
  V4: $NS,
  V5: $NS,
  V6: $NS,
  V7: $NS,
  V8: $NS,
  V9: $NS,
  V10: $NS,
  V11: $NS,
  V12: $NS,
  V13: $NS,
  V14: $MetadataV14,
});

export type MetadataVersioned = $.Input<typeof $MetadataVersioned>;

const MAGIC_NUMBER = 1635018093; // 0x6174656d

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

  get latest(): MetadataLatest {
    return this.metadataVersioned.value;
  }
}

export const $Metadata: $.Shape<Metadata> = $.instance(
  Metadata,
  $.Tuple($.u32, $MetadataVersioned),
  (metadata: Metadata) => [metadata.magicNumber, metadata.metadataVersioned],
);

export const $MetadataLatest = $MetadataV14;

export type MetadataLatest = $.Input<typeof $MetadataLatest>;
