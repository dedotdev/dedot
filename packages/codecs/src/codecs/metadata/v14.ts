import * as $ from '@dedot/shape';
import { $PortableType, $TypeId } from './scale_info';

export const $Hasher = $.FlatEnum([
  'blake2_128',
  'blake2_256',
  'blake2_128Concat',
  'twox128',
  'twox256',
  'twox64Concat',
  'identity',
]);

export const $StorageEntryV14 = $.Struct({
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

export type StorageEntryV14 = $.Input<typeof $StorageEntryV14>;

export const $ConstantDefV14 = $.Struct({
  name: $.str,
  typeId: $TypeId,
  value: $.PrefixedHex,
  docs: $.Vec($.str),
});

export type ConstantDefV14 = $.Input<typeof $ConstantDefV14>;

export const $PalletDefV14 = $.Struct({
  name: $.str,
  storage: $.Option(
    $.Struct({
      prefix: $.str,
      entries: $.Vec($StorageEntryV14),
    }),
  ),
  calls: $.Option($TypeId),
  event: $.Option($TypeId),
  constants: $.Vec($ConstantDefV14),
  error: $.Option($TypeId),
  index: $.u8,
});

export type PalletDefV14 = $.Input<typeof $PalletDefV14>;

export const $SignedExtensionDefV14 = $.Struct({
  ident: $.str,
  typeId: $TypeId,
  additionalSigned: $TypeId,
});
export type SignedExtensionDefV14 = $.Input<typeof $SignedExtensionDefV14>;

export const $ExtrinsicDefV14 = $.Struct({
  typeId: $TypeId,
  version: $.u8,
  signedExtensions: $.Vec($SignedExtensionDefV14),
});

export type ExtrinsicDefV14 = $.Input<typeof $ExtrinsicDefV14>;

/**
 * Ref: https://github.com/paritytech/frame-metadata/blob/a07b2451b82809501fd797691046c1164f7e8840/frame-metadata/src/v14.rs#L45-L54
 */
export const $MetadataV14 = $.Struct({
  types: $.Vec($PortableType),
  pallets: $.Vec($PalletDefV14),
  extrinsic: $ExtrinsicDefV14,
  runtimeType: $TypeId,
});

export type MetadataV14 = $.Input<typeof $MetadataV14>;
