import { constant, Enum, Option, Output, str, Struct, u32, u8, uint8Array, Vec } from '@delightfuldot/shape';
import { $Type, $TypeId } from './scale-info';

export const $Hasher = Enum({
  blake2_128: null,
  blake2_256: null,
  blake2_128Concat: null,
  twox128: null,
  twox256: null,
  twox64Concat: null,
  identity: null,
});

export const $StorageEntry = Struct({
  name: str,
  modifier: Enum({ Optional: null, Default: null }),
  type: Enum({
    Plain: Struct({ value: $TypeId }),
    Map: Struct({
      hashers: Vec($Hasher),
      key: $TypeId,
      value: $TypeId,
    }),
  }),
  default: uint8Array,
  docs: Vec(str),
});

export const $Constants = Struct({
  name: str,
  typeId: $TypeId,
  value: uint8Array,
  docs: Vec(str),
});

export const $Pallet = Struct({
  name: str,
  storage: Option(
    Struct({
      prefix: str,
      entries: Vec($StorageEntry),
    }),
  ),
  calls: Option($TypeId),
  event: Option($TypeId),
  constants: Vec($Constants),
  error: Option($TypeId),
  index: u8,
});

export const $ExtrinsicDef = Struct({
  typeId: $TypeId,
  version: u8,
  signedExtensions: Vec(
    Struct({
      ident: str,
      typeId: $TypeId,
      additionalSigned: $TypeId,
    }),
  ),
});

const MAGIC_NUMBER = 1635018093;

export const $Metadata = Struct({
  magicNumber: constant<typeof MAGIC_NUMBER>(MAGIC_NUMBER, u32),
  version: constant<14>(14, u8),
  types: Vec($Type),
  pallets: Vec($Pallet),
  extrinsic: $ExtrinsicDef,
  runtimeType: $TypeId,
});

export type Metadata = Output<typeof $Metadata>;
