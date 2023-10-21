import * as $ from '@delightfuldot/shape';
import * as Codecs from '../index';
import { MetadataLatest, TypeId } from '../metadata';
import { PortableCodecRegistry } from './PortableCodecRegistry';

type KnownPath = string | RegExp;

const KNOWN_PATHS: KnownPath[] = [
  'sp_core::crypto::AccountId32',
  // 'sp_runtime::generic::era::Era',
  'sp_runtime::multiaddress::MultiAddress',

  'fp_account::AccountId20',
  'account::AccountId20',

  'pallet_identity::types::Data',

  /^primitive_types::\w+$/,
  /^sp_arithmetic::per_things::\w+$/,
  /^sp_arithmetic::fixed_point::\w+$/,
];

export class CodecRegistry {
  #metadata?: MetadataLatest;
  #portableCodecRegistry?: PortableCodecRegistry;
  // TODO docs!
  #runtimeCodecs: Record<string, $.AnyShape>;

  constructor(metadata?: MetadataLatest) {
    if (metadata) this.setMetadata(metadata);

    this.#runtimeCodecs = {};
  }

  findCodec(name: string): $.AnyShape {
    return this.#runtimeCodecs[name] || this.#findKnownCodec(name);
  }

  #findKnownCodec(typeName: string): $.AnyShape {
    // @ts-ignore
    const $codec = (Codecs[`$${typeName}`] || $[typeName]) as $.AnyShape | undefined;

    if (!$codec) {
      throw new Error(`Unsupported codec - ${typeName}`);
    }

    return $codec;
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

    // TODO determine runtime codecs
  }
}
