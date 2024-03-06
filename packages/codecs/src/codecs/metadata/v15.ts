import * as $ from '@dedot/shape';
import { $PortableType, $TypeId } from './scale_info';
import { $ConstantDefV14, $SignedExtensionDefV14, $StorageEntryV14, SignedExtensionDefV14 } from './v14';

export const $ConstantDefV15 = $ConstantDefV14;
export type ConstantDefV15 = $.Input<typeof $ConstantDefV15>;
export const $StorageEntryV15 = $StorageEntryV14;
export type StorageEntryV15 = $.Input<typeof $StorageEntryV15>;

export const $PalletDefV15 = $.Struct({
  name: $.str,
  storage: $.Option(
    $.Struct({
      prefix: $.str,
      entries: $.Vec($StorageEntryV15),
    }),
  ),
  calls: $.Option($TypeId),
  event: $.Option($TypeId),
  constants: $.Vec($ConstantDefV15),
  error: $.Option($TypeId),
  index: $.u8,
  docs: $.Vec($.str),
});

export type PalletDefV15 = $.Input<typeof $PalletDefV15>;

export const $SignedExtensionDefV15 = $SignedExtensionDefV14;
export type SignedExtensionDefV15 = $.Input<typeof $SignedExtensionDefV15>;

export const $ExtrinsicDefV15 = $.Struct({
  version: $.u8,
  addressTypeId: $TypeId,
  callTypeId: $TypeId,
  signatureTypeId: $TypeId,
  extraTypeId: $TypeId,
  signedExtensions: $.Vec($SignedExtensionDefV15),
});

export type ExtrinsicDefV15 = $.Input<typeof $ExtrinsicDefV15>;

export const $RuntimeApiMethodParamDefV15 = $.Struct({
  name: $.str,
  typeId: $TypeId,
});

export type RuntimeApiMethodParamDefV15 = $.Input<typeof $RuntimeApiMethodParamDefV15>;

export const $RuntimeApiMethodDefV15 = $.Struct({
  name: $.str,
  inputs: $.Vec($RuntimeApiMethodParamDefV15),
  output: $TypeId,
  docs: $.Vec($.str),
});

export type RuntimeApiMethodDefV15 = $.Input<typeof $RuntimeApiMethodDefV15>;

export const $RuntimeApiDefV15 = $.Struct({
  name: $.str,
  methods: $.Vec($RuntimeApiMethodDefV15),
  docs: $.Vec($.str),
});

export type RuntimeApiDefV15 = $.Input<typeof $RuntimeApiDefV15>;

/**
 * Ref: https://github.com/paritytech/frame-metadata/blob/a07b2451b82809501fd797691046c1164f7e8840/frame-metadata/src/v15.rs#L48-L63
 */
export const $MetadataV15 = $.Struct({
  types: $.Vec($PortableType),
  pallets: $.Vec($PalletDefV15),
  extrinsic: $ExtrinsicDefV15,
  runtimeType: $TypeId,
  apis: $.Vec($RuntimeApiDefV15),
  outerEnums: $.Struct({
    callEnumTypeId: $TypeId,
    eventEnumTypeId: $TypeId,
    errorEnumTypeId: $TypeId,
  }),
  custom: $.Struct({
    map: $.map(
      $.str,
      $.Struct({
        typeId: $TypeId,
        value: $.PrefixedHex,
      }),
    ),
  }),
});

export type MetadataV15 = $.Input<typeof $MetadataV15>;
