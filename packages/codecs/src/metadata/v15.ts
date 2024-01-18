import * as $ from '@delightfuldot/shape';
import { $PortableType, $TypeId } from './scale-info';
import { $Constants, $StorageEntry } from './v14';

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
  docs: $.Vec($.str),
});

export type Pallet = $.Input<typeof $Pallet>;

export const $ExtrinsicDef = $.Struct({
  version: $.u8,
  addressTypeId: $TypeId,
  callTypeId: $TypeId,
  signatureTypeId: $TypeId,
  extraTypeId: $TypeId,
  signedExtensions: $.Vec(
    $.Struct({
      ident: $.str,
      typeId: $TypeId,
      additionalSigned: $TypeId,
    }),
  ),
});

export type ExtrinsicDef = $.Input<typeof $ExtrinsicDef>;

export const $RuntimeApiMethodParamDef = $.Struct({
  name: $.str,
  typeId: $TypeId,
});

export const $RuntimeApiMethodDef = $.Struct({
  name: $.str,
  inputs: $.Vec($RuntimeApiMethodParamDef),
  output: $TypeId,
  docs: $.Vec($.str),
});

export const $RuntimeApiDef = $.Struct({
  name: $.str,
  methods: $.Vec($RuntimeApiMethodDef),
  docs: $.Vec($.str),
});

/**
 * Ref: https://github.com/paritytech/frame-metadata/blob/a07b2451b82809501fd797691046c1164f7e8840/frame-metadata/src/v15.rs#L48-L63
 */
export const $MetadataV15 = $.Struct({
  types: $.Vec($PortableType),
  pallets: $.Vec($Pallet),
  extrinsic: $ExtrinsicDef,
  runtimeType: $TypeId,
  apis: $.Vec($RuntimeApiDef),
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
