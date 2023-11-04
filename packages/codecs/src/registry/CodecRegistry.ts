import * as $ from '@delightfuldot/shape';
import * as Codecs from '../index';
import { MetadataLatest, TypeId } from '../metadata';
import { PortableCodecRegistry } from './PortableCodecRegistry';
import { CodecType, knownCodecTypes, normalizeCodecName } from '../codectypes';

type KnownPath = string | RegExp;

const KNOWN_PATHS: KnownPath[] = [
  'sp_core::crypto::AccountId32',
  // 'sp_runtime::generic::era::Era',
  'sp_runtime::multiaddress::MultiAddress',

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
    return {
      name: normalizedName,
      $codec,
      typeIn: name,
      typeOut: name,
    };
  }

  #findKnownCodec(typeName: string): $.AnyShape {
    // @ts-ignore
    const $codec = Codecs[normalizeCodecName(typeName)] || $[typeName];

    if (!$codec) {
      throw new Error(`Unsupported codec - ${typeName}`);
    }

    return $codec as $.AnyShape;
  }

  isKnownType(path: string | string[]) {
    const joinedPath = Array.isArray(path) ? path.join('::') : path;
    return KNOWN_PATHS.some((one) => joinedPath.match(one));
  }

  findPortableCodec(typeId: TypeId): $.AnyShape {
    // TODO add assertion
    return this.#portableCodecRegistry!.findCodec(typeId);
  }

  setMetadata(metadata: MetadataLatest) {
    this.#metadata = metadata;
    this.#portableCodecRegistry = new PortableCodecRegistry(this.#metadata.types, this);

    // TODO runtime inferred types after setting up metadata
  }
}
