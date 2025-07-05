import * as $ from '@dedot/shape';
import { $PortableType, $TypeId } from './scale_info.js';
import { $Hasher, $SignedExtensionDefV14 } from './v14.js';
import { $RuntimeApiMethodParamDefV15 } from './v15.js';

export const $VariantDeprecationInfoDefV16 = $.Enum({
  DeprecatedWithoutNote: { index: 1 },
  Deprecated: { index: 2, value: $.Struct({ note: $.str, since: $.Option($.str) }) },
});

export type VariantDeprecationInfoDefV16 = $.Input<typeof $VariantDeprecationInfoDefV16>;

export const $EnumDeprecationInfoDefV16 = $.Tuple($.map($.u8, $VariantDeprecationInfoDefV16));

export type EnumDeprecationInfoDefV16 = $.Input<typeof $EnumDeprecationInfoDefV16>;

export const $ItemDeprecationInfoDefV16 = $.Enum({
  NotDeprecated: null,
  DeprecatedWithoutNote: null,
  Deprecated: $.Struct({
    note: $.str,
    since: $.Option($.str),
  }),
});

export type ItemDeprecationInfoDefV16 = $.Input<typeof $ItemDeprecationInfoDefV16>;

export const $ConstantDefV16 = $.Struct({
  name: $.str,
  typeId: $TypeId,
  value: $.PrefixedHex,
  docs: $.Vec($.str),
  deprecationInfo: $ItemDeprecationInfoDefV16,
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
  deprecationInfo: $ItemDeprecationInfoDefV16,
});

export type StorageEntryV16 = $.Input<typeof $StorageEntryV16>;

export const $FunctionParamDefV16 = $RuntimeApiMethodParamDefV15;

export type FunctionParamDefV16 = $.Input<typeof $FunctionParamDefV16>;

export const $ViewFunctionDefV16 = $.Struct({
  id: $.sizedUint8Array(32),
  name: $.str,
  inputs: $.Vec($FunctionParamDefV16),
  output: $TypeId,
  docs: $.Vec($.str),
  deprecationInfo: $ItemDeprecationInfoDefV16,
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
      deprecationInfo: $EnumDeprecationInfoDefV16,
    }),
  ),
  event: $.Option(
    $.Struct({
      typeId: $TypeId,
      deprecationInfo: $EnumDeprecationInfoDefV16,
    }),
  ),
  constants: $.Vec($ConstantDefV16),
  error: $.Option(
    $.Struct({
      typeId: $TypeId,
      deprecationInfo: $EnumDeprecationInfoDefV16,
    }),
  ),
  associatedTypes: $.Vec($AssociatedTypeDefV16),
  viewFunctions: $.Vec($ViewFunctionDefV16),
  index: $.u8,
  docs: $.Vec($.str),
  deprecationInfo: $ItemDeprecationInfoDefV16,
});

export type PalletDefV16 = $.Input<typeof $PalletDefV16>;

export const $SignedExtensionDefV16 = $SignedExtensionDefV14;

export type SignedExtensionDefV16 = $.Input<typeof $SignedExtensionDefV16>;

export const $ExtrinsicDefV16 = $.Struct({
  versions: $.Vec($.u8),
  addressTypeId: $TypeId,
  signatureTypeId: $TypeId,
  callTypeId: $TypeId,
  // Note in v16, `signedExtensions` was renamed to `transactionExtensions`
  // But we keep the old name for compatibility
  signedExtensionsByVersion: $.map($.u8, $.Vec($.compactU32)),
  signedExtensions: $.Vec($SignedExtensionDefV16),
});

export type ExtrinsicDefV16 = $.Input<typeof $ExtrinsicDefV16>;

export const $RuntimeApiMethodDefV16 = $.Struct({
  name: $.str,
  inputs: $.Vec($FunctionParamDefV16),
  output: $TypeId,
  docs: $.Vec($.str),
  deprecationInfo: $ItemDeprecationInfoDefV16,
});

export type RuntimeApiMethodDefV16 = $.Input<typeof $RuntimeApiMethodDefV16>;

export const $RuntimeApiDefV16 = $.Struct({
  name: $.str,
  methods: $.Vec($RuntimeApiMethodDefV16),
  docs: $.Vec($.str),
  version: $.compactU32,
  deprecationInfo: $ItemDeprecationInfoDefV16,
});

export type RuntimeApiDefV16 = $.Input<typeof $RuntimeApiDefV16>;

/**
 * Ref: https://github.com/paritytech/frame-metadata/blob/f0742f8449233421d4db60e22175e26abaf68762/frame-metadata/src/v16.rs#L46-L64
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
