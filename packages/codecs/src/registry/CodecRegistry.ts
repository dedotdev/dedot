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
  'polkadot_runtime_common::claims::EthereumAddress',

  'pallet_identity::types::Data',
  'sp_runtime::generic::digest::Digest',
  'sp_runtime::generic::digest::DigestItem',
  'sp_runtime::generic::header::Header',

  /^primitive_types::\w+$/,
  /^sp_arithmetic::per_things::\w+$/,
  /^sp_arithmetic::fixed_point::\w+$/,
];

const UNCHECKED_EXTRINSIC_PATH = 'sp_runtime::generic::unchecked_extrinsic::UncheckedExtrinsic';
const MULTI_ADDRESS_PATH = 'sp_runtime::multiaddress::MultiAddress';

export class CodecRegistry {
  #metadata?: MetadataLatest;
  #portableCodecRegistry?: PortableCodecRegistry;

  /**
   * runtime inferred types after setting up metadata
   * @private
   */
  #inferredTypes: Record<string, TypeId>;

  constructor(metadata?: MetadataLatest) {
    this.#inferredTypes = {};

    if (metadata) this.setMetadata(metadata);
  }

  findCodec(name: string): $.AnyShape {
    return this.#findKnownCodec(name);
  }

  #findKnownCodec(typeName: string): $.AnyShape {
    // @ts-ignore
    const $codec = Codecs[`$${typeName}`] || $[typeName];

    if (!$codec || !($codec instanceof $.Shape)) {
      throw new Error(`Unsupported codec - ${typeName}`);
    }

    return $codec as $.AnyShape;
  }

  isKnownType(path: string | string[]) {
    const joinedPath = Array.isArray(path) ? path.join('::') : path;
    return KNOWN_PATHS.some((one) => joinedPath.match(one));
  }

  findPortableCodec(typeId: TypeId | string): $.AnyShape {
    if (typeof typeId === 'string') {
      const inferTypeId = this.#inferredTypes[typeId];
      if (Number.isInteger(inferTypeId)) return this.findPortableCodec(inferTypeId);
      throw Error('Cannot find infer portable codec!');
    }

    // TODO add assertion
    return this.#portableCodecRegistry!.findCodec(typeId);
  }

  setMetadata(metadata: MetadataLatest) {
    this.#metadata = metadata;
    this.#portableCodecRegistry = new PortableCodecRegistry(this.#metadata.types, this);

    this.#inferPortableTypes();
  }

  #inferPortableTypes() {
    // TODO assert metadata!

    const types = this.#metadata!.types;
    const uncheckedExtrinsicType = types.find((one) => one.path.join('::') === UNCHECKED_EXTRINSIC_PATH);

    if (!uncheckedExtrinsicType) {
      return;
    }

    const [{ typeId: addressTypeId }] = uncheckedExtrinsicType.params;
    if (!Number.isInteger(addressTypeId)) {
      return;
    }

    const addressType = types[addressTypeId!];

    // TODO refactor this!
    if (addressType.path.join('::') === MULTI_ADDRESS_PATH) {
      const [{ typeId: accountIdTypeId }] = addressType.params;
      this.#inferredTypes['AccountId'] = accountIdTypeId!;
    } else {
      this.#inferredTypes['AccountId'] = addressTypeId!;
    }
  }

  get inferredTypes() {
    return this.#inferredTypes;
  }
}
