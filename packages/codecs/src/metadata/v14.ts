import * as $ from '@delightfuldot/shape';
import { $PortableType, $TypeId } from './scale-info';

export const $Hasher = $.FlatEnum([
  'blake2_128',
  'blake2_256',
  'blake2_128Concat',
  'twox128',
  'twox256',
  'twox64Concat',
  'identity',
]);

export const $StorageEntry = $.Struct({
  name: $.str,
  modifier: $.FlatEnum(['Optional', 'Default']),
  type: $.Enum({
    Plain: $.Struct({ valueTypeId: $TypeId }),
    Map: $.Struct({
      hashers: $.Vec($Hasher),
      keyTypeId: $TypeId,
      valueTypeId: $TypeId,
    }),
  }),
  default: $.PrefixedHex,
  docs: $.Vec($.str),
});

export type StorageEntry = $.Input<typeof $StorageEntry>;

export const $Constants = $.Struct({
  name: $.str,
  typeId: $TypeId,
  value: $.PrefixedHex,
  docs: $.Vec($.str),
});

export const $Pallet = $.Struct({
  name: $.str,
  storage: $.Option(
    $.Struct({
      prefix: $.str,
      entries: $.Vec($StorageEntry),
    }),
  ),
  calls: $.Option($TypeId),
  event: $.Option($TypeId),
  constants: $.Vec($Constants),
  error: $.Option($TypeId),
  index: $.u8,
});

export type Pallet = $.Input<typeof $Pallet>;

export const $ExtrinsicDef = $.Struct({
  typeId: $TypeId,
  version: $.u8,
  signedExtensions: $.Vec(
    $.Struct({
      ident: $.str,
      typeId: $TypeId,
      additionalSigned: $TypeId,
    }),
  ),
});

export type ExtrinsicDef = $.Input<typeof $ExtrinsicDef>;

/**
 * Ref: https://github.com/paritytech/frame-metadata/blob/a07b2451b82809501fd797691046c1164f7e8840/frame-metadata/src/v14.rs#L45-L54
 */
export const $MetadataV14 = $.Struct({
  types: $.Vec($PortableType),
  pallets: $.Vec($Pallet),
  extrinsic: $ExtrinsicDef,
  runtimeType: $TypeId,
});

export type MetadataV14 = $.Input<typeof $MetadataV14>;
