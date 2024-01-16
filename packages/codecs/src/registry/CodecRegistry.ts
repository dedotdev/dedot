import * as $ from '@delightfuldot/shape';
import * as Codecs from '../index';
import { EnumTypeDef, ModuleError } from '../index';
import { MetadataLatest, TypeId } from '../metadata';
import { PortableCodecRegistry } from './PortableCodecRegistry';
import { CodecType, knownCodecTypes, normalizeCodecName } from '../codectypes';
import { PortableType } from '../metadata/scale-info';
import { hexToU8a } from '@polkadot/util';

type KnownPath = string | RegExp;

// Known paths for codecs (primitives) that are shared between
// different substrate-based blockchains
const KNOWN_PATHS: KnownPath[] = [
  'sp_core::crypto::AccountId32',
  // 'sp_runtime::generic::era::Era',
  'sp_runtime::multiaddress::MultiAddress',
  /^sp_runtime::DispatchError$/,
  'sp_runtime::ModuleError',
  'sp_runtime::TokenError',
  'sp_arithmetic::ArithmeticError',
  'sp_runtime::TransactionalError',

  'fp_account::AccountId20',
  'account::AccountId20',
  'polkadot_runtime_common::claims::EthereumAddress',

  'pallet_identity::types::Data',
  'sp_runtime::generic::digest::Digest',
  'sp_runtime::generic::digest::DigestItem',
  'sp_runtime::generic::header::Header',

  /^primitive_types::\w+$/,
  /^sp_arithmetic::per_things::\w+$/,
  /^sp_arithmetic::fixed_point::\w+$/,
];

const NUMBER_TYPES = ['u8', 'u16', 'u32', 'i8', 'i16', 'i32'];
const BIGINT_TYPES = ['u64', 'u128', 'u256', 'i64', 'i128', 'i256'];
export const RUST_PRIMITIVE_TYPES = [...NUMBER_TYPES, ...BIGINT_TYPES, 'str', 'bool'];

const WRAPPER_TYPE_REGEX = /^(\w+)<(.*)>$/;
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

  findCodec(name: string): $.AnyShape {
    return this.#findKnownCodec(name);
  }

  findCodecType(name: string): CodecType {
    const normalizedName = normalizeCodecName(name);
    const knownType = knownCodecTypes[normalizedName];
    if (knownType) {
      return knownType;
    }

    const $codec = this.findCodec(name);

    if (RUST_PRIMITIVE_TYPES.includes(name)) {
      const nativeType = this.#toNativeType(name)!;
      return {
        name: normalizedName,
        $codec,
        typeIn: nativeType,
        typeOut: nativeType,
      };
    }

    return {
      name: normalizedName,
      $codec,
      typeIn: name,
      typeOut: name,
    };
  }

  #findKnownCodec(typeName: string): $.AnyShape {
    // @ts-ignore
    const $codec = this.#findKnownWrapperCodec(typeName) || Codecs[normalizeCodecName(typeName)] || $[typeName];

    if (!$codec) {
      throw new Error(`Unsupported codec - ${typeName}`);
    }

    return $codec as $.AnyShape;
  }

  #findKnownWrapperCodec(typeName: string): $.AnyShape | undefined {
    const matchNames = typeName.match(WRAPPER_TYPE_REGEX);
    if (matchNames) {
      const [_, wrapper, inner] = matchNames;
      if (KNOWN_WRAPPER_TYPES.includes(wrapper)) {
        // @ts-ignore
        const $Wrapper = $[wrapper] as (...args: any[]) => $.AnyShape;
        const $inners = inner.split(', ').map((one) => this.#findKnownCodec(one.trim()));
        return $Wrapper(...$inners);
      }

      throw new Error(`Unknown wrapper type ${wrapper} from ${typeName}`);
    }
  }

  isKnownType(path: string | string[]) {
    const joinedPath = Array.isArray(path) ? path.join('::') : path;
    return KNOWN_PATHS.some((one) => joinedPath.match(one));
  }

  findPortableCodec(typeId: TypeId): $.AnyShape {
    return this.#portableCodecRegistry!.findCodec(typeId);
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

  // TODO add types, PalletErrorMetadataLatest
  findMetaError(moduleError: ModuleError): EnumTypeDef['members'][0] | undefined {
    const targetPallet = this.metadata!.pallets.find((p) => p.index === moduleError.index);
    if (!targetPallet || !targetPallet.error) return;

    const def = this.metadata!.types[targetPallet.error];
    if (!def) return;

    const { tag, value } = def.type;
    if (tag !== 'Enum') return;

    return value.members.find(({ index }) => index === hexToU8a(moduleError.error)[0]);
  }

  #toNativeType(type: string) {
    if (!RUST_PRIMITIVE_TYPES.includes(type)) {
      return;
    }

    if (NUMBER_TYPES.includes(type)) {
      return 'number';
    } else if (BIGINT_TYPES.includes(type)) {
      return 'bigint';
    } else if (type === 'str') {
      return 'string';
    } else if (type === 'bool') {
      return 'boolean';
    }
  }
}
