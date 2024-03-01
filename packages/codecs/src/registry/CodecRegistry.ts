import * as $ from '@dedot/shape';
import { hexToU8a, isObject } from '@polkadot/util';
import * as Codecs from '../codecs';
import { DispatchError, ModuleError, PalletErrorMetadataLatest, MetadataLatest, TypeId, PortableType } from '../codecs';
import { PortableCodecRegistry } from './PortableCodecRegistry';
import { CodecType, knownCodecTypes, normalizeCodecName } from '../codecs/codectypes';

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
 * A codec registry for both known and portable codecs,
 */
export class CodecRegistry {
  #metadata?: MetadataLatest;
  #portableCodecRegistry?: PortableCodecRegistry;

  constructor(metadata?: MetadataLatest) {
    if (metadata) this.setMetadata(metadata);
  }

  findCodec<I = unknown, O = I>(name: string): $.Shape<I, O> {
    return this.#findKnownCodec<I, O>(name);
  }

  findCodecType(name: string): CodecType {
    const normalizedName = normalizeCodecName(name);
    const knownType = knownCodecTypes[normalizedName];
    if (knownType) {
      return knownType;
    }

    const $codec = this.findCodec(name);

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

  #findKnownCodec<I = unknown, O = I>(typeName: string): $.Shape<I, O> {
    // @ts-ignore
    const $codec = this.#findKnownWrapperCodec(typeName) || Codecs[normalizeCodecName(typeName)] || $[typeName];

    if (!$codec) {
      throw new Error(`Unsupported codec - ${typeName}`);
    }

    // This only works with top-level $.deferred codecs
    // We should make it work for nested $.deferred codecs as well
    if ($codec.metadata && $codec.metadata[0].name === '$.deferred') {
      const getShape = $codec.metadata[0].args![0] as (...args: any[]) => $.Shape<I, O>;
      return $.deferred(() => getShape(this));
    }

    return $codec;
  }

  #findKnownWrapperCodec(typeName: string): $.AnyShape | undefined {
    const matchNames = typeName.match(WRAPPER_TYPE_REGEX);
    if (matchNames) {
      const [_, wrapper, inner] = matchNames;
      if (KNOWN_WRAPPER_TYPES.includes(wrapper)) {
        // @ts-ignore
        const $Wrapper = $[wrapper] as (...args: any[]) => $.AnyShape;

        if (inner.match(TUPLE_TYPE_REGEX) || inner.match(WRAPPER_TYPE_REGEX)) {
          return $Wrapper(this.#findKnownWrapperCodec(inner));
        }

        const $inners = inner.split(',').map((one) => this.#findKnownCodec(one.trim()));
        return $Wrapper(...$inners);
      }

      throw new Error(`Unknown wrapper type ${wrapper} from ${typeName}`);
    } else if (typeName.match(TUPLE_TYPE_REGEX)) {
      const $inner = typeName
        .slice(1, -1)
        .split(',')
        .filter((x) => x)
        .map((one) => this.#findKnownCodec(one.trim()));

      return $.Tuple(...$inner);
    }
  }

  isKnownType(path: string | string[]) {
    const joinedPath = Array.isArray(path) ? path.join('::') : path;
    return KNOWN_PATHS.some((one) => joinedPath.match(one));
  }

  findPortableCodec<I = unknown, O = I>(typeId: TypeId): $.Shape<I, O> {
    return this.#portableCodecRegistry!.findCodec<I, O>(typeId);
  }

  findPortableType(typeId: TypeId): PortableType {
    return this.#portableCodecRegistry!.findType(typeId);
  }

  setMetadata(metadata: MetadataLatest) {
    this.#metadata = metadata;
    this.#portableCodecRegistry = new PortableCodecRegistry(this.#metadata.types, this);

    // TODO runtime inferred types after setting up metadata
  }

  get metadata(): MetadataLatest | undefined {
    return this.#metadata;
  }

  get portableRegistry(): PortableCodecRegistry | undefined {
    return this.#portableCodecRegistry;
  }

  findErrorMeta(errorInfo: ModuleError | DispatchError): PalletErrorMetadataLatest | undefined {
    const moduleError =
      isObject<DispatchError>(errorInfo) && errorInfo.tag === 'Module' ? errorInfo.value : (errorInfo as ModuleError);

    const targetPallet = this.metadata!.pallets.find((p) => p.index === moduleError.index);
    if (!targetPallet || !targetPallet.error) return;

    const def = this.metadata!.types[targetPallet.error];
    if (!def) return;

    const { tag, value } = def.type;
    if (tag !== 'Enum') return;

    const errorDef = value.members.find(({ index }) => index === hexToU8a(moduleError.error)[0]);
    if (!errorDef) return;

    return {
      ...errorDef,
      fieldCodecs: errorDef.fields.map(({ typeId }) => this.findPortableCodec(typeId)),
      pallet: targetPallet.name,
      palletIndex: targetPallet.index,
    };
  }

  // findEventMeta() => PalletEventMetadataLatest
}
