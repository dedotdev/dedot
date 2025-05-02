import * as $ from '@dedot/shape';
import { $PortableType, $TypeId } from './scale_info.js';
import { $Hasher, $SignedExtensionDefV14 } from './v14.js';
import { $RuntimeApiMethodParamDefV15 } from './v15.js';

export const $DeprecationStatusDefV16 = $.Enum({
  NotDeprecated: null,
  DeprecatedWithoutNote: null,
  Deprecated: $.Struct({
    note: $.str,
    since: $.Option($.str),
  }),
});

export type DeprecationStatusDefV16 = $.Input<typeof $DeprecationStatusDefV16>;

export const $DeprecationInfoDefV16 = $.Enum({
  NotDeprecated: null,
  ItemDeprecated: $DeprecationStatusDefV16,
  VariantsDeprecated: $.map($.u8, $DeprecationStatusDefV16),
});

export type DeprecationInfoDefV16 = $.Input<typeof $DeprecationInfoDefV16>;

export const $ConstantDefV16 = $.Struct({
  name: $.str,
  typeId: $TypeId,
  value: $.PrefixedHex,
  docs: $.Vec($.str),
  deprecationInfo: $DeprecationStatusDefV16,
});

export type ConstantDefV16 = $.Input<typeof $ConstantDefV16>;

export const $StorageEntryV16 = $.Struct({
  name: $.str,
  modifier: $.FlatEnum(['Optional', 'Default']),
  storageType: $.Enum({
    Plain: $.Struct({ valueTypeId: $TypeId }),
    Map: $.Struct({
      hashers: $.Vec($Hasher),
      keyTypeId: $TypeId,
      valueTypeId: $TypeId,
    }),
  }),
  default: $.PrefixedHex,
  docs: $.Vec($.str),
  deprecationInfo: $DeprecationStatusDefV16,
});

export type StorageEntryV16 = $.Input<typeof $StorageEntryV16>;

export const $FunctionParamDefV16 = $RuntimeApiMethodParamDefV15;

export type FunctionParamDefV16 = $.Input<typeof $FunctionParamDefV16>;

export const $ViewFunctionDefV16 = $.Struct({
  name: $.str,
  id: $.sizedArray($.u8, 32),
  inputs: $.Vec($FunctionParamDefV16),
  output: $TypeId,
  docs: $.Vec($.str),
  deprecationInfo: $DeprecationStatusDefV16,
});

export type ViewFunctionDefV16 = $.Input<typeof $ViewFunctionDefV16>;

export const $AssociatedTypeDefV16 = $.Struct({
  name: $.str,
  typeId: $TypeId,
  docs: $.Vec($.str),
});

export type AssociatedTypeDefV16 = $.Input<typeof $AssociatedTypeDefV16>;

export const $PalletDefV16 = $.Struct({
  name: $.str,
  storage: $.Option(
    $.Struct({
      prefix: $.str,
      entries: $.Vec($StorageEntryV16),
    }),
  ),
  calls: $.Option(
    $.Struct({
      typeId: $TypeId,
      deprecationInfo: $DeprecationInfoDefV16,
    }),
  ),
  event: $.Option(
    $.Struct({
      typeId: $TypeId,
      deprecationInfo: $DeprecationInfoDefV16,
    }),
  ),
  constants: $.Vec($ConstantDefV16),
  error: $.Option(
    $.Struct({
      typeId: $TypeId,
      deprecationInfo: $DeprecationInfoDefV16,
    }),
  ),
  associatedTypes: $.Vec($AssociatedTypeDefV16),
  viewFunctions: $.Vec($ViewFunctionDefV16),
  index: $.u8,
  docs: $.Vec($.str),
  deprecationInfo: $DeprecationStatusDefV16,
});

export type PalletDefV16 = $.Input<typeof $PalletDefV16>;

export const $SignedExtensionDefV16 = $SignedExtensionDefV14;
export type SignedExtensionDefV16 = $.Input<typeof $SignedExtensionDefV16>;

export const $TransactionExtensionDefV16 = $.Struct({
  identifier: $.str,
  typeId: $TypeId,
  implicit: $TypeId,
});

export type TransactionExtensionDefV16 = $.Input<typeof $TransactionExtensionDefV16>;

export const $ExtrinsicDefV16 = $.Struct({
  version: $.Vec($.u8),
  addressTypeId: $TypeId,
  signatureTypeId: $TypeId,
  transactionExtensionsByVersion: $.map($.u8, $.Vec($.u32)), // It will be compactU32 in frame-metadata v21
  transactionExtensions: $.Vec($TransactionExtensionDefV16),
});

export type ExtrinsicDefV16 = $.Input<typeof $ExtrinsicDefV16>;

export const $RuntimeApiMethodDefV16 = $.Struct({
  name: $.str,
  inputs: $.Vec($FunctionParamDefV16),
  output: $TypeId,
  docs: $.Vec($.str),
  deprecationInfo: $DeprecationStatusDefV16,
});

export type RuntimeApiMethodDefV16 = $.Input<typeof $RuntimeApiMethodDefV16>;

export const $RuntimeApiDefV16 = $.Struct({
  name: $.str,
  methods: $.Vec($RuntimeApiMethodDefV16),
  docs: $.Vec($.str),
  deprecationInfo: $DeprecationStatusDefV16,
  version: $.u32, // It will be compactU32 in frame-metadata v21
});

export type RuntimeApiDefV16 = $.Input<typeof $RuntimeApiDefV16>;

/**
 * Ref: https://github.com/paritytech/frame-metadata/blob/a060c2d488771e5976c26d1bf64fdf8ad734cf1b/frame-metadata/src/v16.rs#L46-L63
 */
export const $MetadataV16 = $.Struct({
  types: $.Vec($PortableType),
  pallets: $.Vec($PalletDefV16),
  extrinsic: $ExtrinsicDefV16,
  apis: $.Vec($RuntimeApiDefV16),
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

export type MetadataV16 = $.Input<typeof $MetadataV16>;
