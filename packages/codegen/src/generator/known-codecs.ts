import * as $ from '@dedot/shape';
import * as Codecs from '@dedot/codecs';
import { AnyShape } from '@dedot/shape';
import {
  $AccountId20,
  $AccountId32,
  $Bytes,
  $ConsensusEngineId,
  $Era,
  $EthereumAddress,
  $MultiAddress,
  $OpaqueExtrinsic,
  $PrefixedStorageKey,
  $RawBytes,
  $StorageData,
  $StorageKey,
  $UncheckedExtrinsic,
} from '@dedot/codecs';
import { assert } from '@dedot/utils';

export type CodecName = `$${string}`;
export interface CodecType {
  name: CodecName;
  $codec: AnyShape;
  typeIn: string;
  typeOut: string;
}

export const normalizeCodecName = (name: string | CodecName): CodecName => {
  return name.startsWith('$') ? (name as CodecName) : `$${name}`;
};

type KnownPath = string | RegExp;

// Known paths for codecs (primitives) that are shared between
// different substrate-based blockchains
const KNOWN_PATHS: KnownPath[] = [
  'sp_core::crypto::AccountId32',
  'sp_runtime::generic::era::Era',
  'sp_runtime::multiaddress::MultiAddress',
  /^sp_runtime::DispatchError$/,
  'sp_runtime::ModuleError',
  'sp_runtime::TokenError',
  'sp_arithmetic::ArithmeticError',
  'sp_runtime::TransactionalError',
  'frame_support::dispatch::DispatchInfo',
  'frame_system::Phase',
  'sp_version::RuntimeVersion',

  'fp_account::AccountId20',
  'account::AccountId20',
  'polkadot_runtime_common::claims::EthereumAddress',

  'pallet_identity::types::Data',
  'sp_runtime::generic::digest::Digest',
  'sp_runtime::generic::digest::DigestItem',
  'sp_runtime::generic::header::Header',
  'sp_runtime::generic::unchecked_extrinsic::UncheckedExtrinsic',

  /^primitive_types::\w+$/,
  /^sp_arithmetic::per_things::\w+$/,
  /^sp_arithmetic::fixed_point::\w+$/,
];

const WRAPPER_TYPE_REGEX = /^(\w+)<(.*)>$/;
const TUPLE_TYPE_REGEX = /^\[(.*)]$/;
const KNOWN_WRAPPER_TYPES = ['Option', 'Vec', 'Result', 'Array'];

/**
 * Collection of codec types with loose input types
 *
 * Loose codecs are codecs with different typeIn & typeOut,
 * E.g: Codec `$AccountId32`, we have its typeIn is `AccountId32Like` & typeOut is `AccountId32`
 *
 * This registry keep track the list of codecs which follow this convention
 */
export const looseTypeCodecs: Record<string, AnyShape> = {
  $AccountId20,
  $EthereumAddress,
  $AccountId32,
  $ConsensusEngineId,
  $StorageKey,
  $StorageData,
  $PrefixedStorageKey,
  $Bytes,
  $RawBytes,
  $MultiAddress,
  $OpaqueExtrinsic,
  $UncheckedExtrinsic,
  $Era,
};

export function findKnownCodecType(name: string): CodecType {
  const normalizedName = normalizeCodecName(name);
  const $knownCodec = looseTypeCodecs[normalizedName];
  if ($knownCodec) {
    return {
      name: normalizedName,
      $codec: $knownCodec,
      typeIn: `${name}Like`,
      typeOut: name,
    };
  }

  const $codec = findKnownCodec(name);

  if ($codec.nativeType && $[name as keyof typeof $]) {
    return {
      name: normalizedName,
      $codec,
      typeIn: $codec.nativeType,
      typeOut: $codec.nativeType,
    };
  }

  return {
    name: normalizedName,
    $codec,
    typeIn: name,
    typeOut: name,
  };
}

export function findKnownCodec<I = unknown, O = I>(typeName: string): $.Shape<I, O> {
  // @ts-ignore
  const $codec = findKnownWrapperCodec(typeName) || Codecs[normalizeCodecName(typeName)] || $[typeName];

  assert($codec, `Known codec not found - ${typeName}`);

  return $codec;
}

export function findKnownWrapperCodec(typeName: string): $.AnyShape | undefined {
  const matchNames = typeName.match(WRAPPER_TYPE_REGEX);
  if (matchNames) {
    const [_, wrapper, inner] = matchNames;
    if (KNOWN_WRAPPER_TYPES.includes(wrapper)) {
      // @ts-ignore
      const $Wrapper = $[wrapper] as (...args: any[]) => $.AnyShape;

      if (inner.match(TUPLE_TYPE_REGEX) || inner.match(WRAPPER_TYPE_REGEX)) {
        return $Wrapper(findKnownWrapperCodec(inner));
      }

      const $inners = inner.split(',').map((one) => findKnownCodec(one.trim()));
      return $Wrapper(...$inners);
    }

    throw new Error(`Unknown wrapper type ${wrapper} from ${typeName}`);
  } else if (typeName.match(TUPLE_TYPE_REGEX)) {
    const $inner = typeName
      .slice(1, -1)
      .split(',')
      .filter((x) => x)
      .map((one) => findKnownCodec(one.trim()));

    return $.Tuple(...$inner);
  }
}

export function isKnownCodecType(path: string | string[]) {
  const joinedPath = Array.isArray(path) ? path.join('::') : path;
  return KNOWN_PATHS.some((one) => joinedPath.match(one));
}
