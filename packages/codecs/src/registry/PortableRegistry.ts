import { EnumOptions, Tuple } from '@dedot/shape';
import * as $ from '@dedot/shape';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, blake2_256, HashFn, HexString, hexToU8a, isObject, isU8a, u8aToHex } from '@dedot/utils';
import type { DispatchError, ModuleError } from '../codecs/known/index.js';
import { $Extrinsic, Extrinsic } from '../extrinsic/index.js';
import type { MetadataLatest, PalletErrorMetadataLatest, PortableType, TypeId } from '../metadata/index.js';
import { TypeRegistry } from './TypeRegistry.js';

/**
 * Codec registry for portable types from metadata
 */
export class PortableRegistry<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends TypeRegistry {
  readonly #metadata: MetadataLatest;
  #hasher: HashFn;

  constructor(metadata: MetadataLatest, hasher?: HashFn) {
    super(metadata.types);
    this.#metadata = metadata;
    this.#hasher = hasher || blake2_256;
  }

  get $Extrinsic() {
    return $Extrinsic<ChainApi>(this);
  }

  // default to version 0 for now
  $Extra(extensionVersion: number = 0) {
    const { signedExtensions, signedExtensionsByVersion } = this.metadata.extrinsic;

    const signedExtensionIndexes = signedExtensionsByVersion.get(extensionVersion);

    assert(signedExtensionIndexes, `No signed extensions found for extension version ${extensionVersion}`);

    const signedExtensionsVersioned = signedExtensionIndexes.map((index) => signedExtensions[index]);
    const extraCodecs = signedExtensionsVersioned.map(({ typeId }) => this.findCodec(typeId));

    return Tuple(...extraCodecs);
  }

  get metadata(): MetadataLatest {
    return this.#metadata;
  }

  hash(input: Uint8Array): Uint8Array {
    return this.#hasher(input);
  }

  hashAsHex(input: Uint8Array | HexString): HexString {
    if (isU8a(input)) {
      return u8aToHex(this.hash(input));
    } else {
      return u8aToHex(this.hash(hexToU8a(input)));
    }
  }

  setHasher(hasher: HashFn) {
    this.#hasher = hasher;
  }

  findErrorMeta(errorInfo: ModuleError | DispatchError): PalletErrorMetadataLatest | undefined {
    const moduleError =
      isObject<DispatchError>(errorInfo) && errorInfo.type === 'Module' ? errorInfo.value : (errorInfo as ModuleError);

    const targetPallet = this.metadata!.pallets.find((p) => p.index === moduleError.index);
    if (!targetPallet || !targetPallet.error) return;

    const def = this.metadata!.types[targetPallet.error.typeId];
    if (!def) return;

    const { type, value } = def.typeDef;
    if (type !== 'Enum') return;

    const errorDef = value.members.find(({ index }) => index === hexToU8a(moduleError.error)[0]);
    if (!errorDef) return;

    return {
      ...errorDef,
      fieldCodecs: errorDef.fields.map(({ typeId }) => this.findCodec(typeId)),
      pallet: targetPallet.name,
      palletIndex: targetPallet.index,
    };
  }

  findType(typeId: TypeId): PortableType {
    const type = this.types[typeId];
    if (!type) {
      throw new Error(`Cannot find portable type for id: ${typeId}`);
    }

    return type;
  }

  /**
   * Custom enum labels for different types
   *
   * @param typeId
   */
  override getEnumOptions(typeId: TypeId): EnumOptions {
    const {
      extrinsic: { callTypeId },
      outerEnums: { eventEnumTypeId, errorEnumTypeId },
    } = this.metadata;

    if (typeId === eventEnumTypeId) {
      return {
        tagKey: 'pallet',
        valueKey: 'palletEvent',
      };
    } else if (typeId === callTypeId) {
      return {
        tagKey: 'pallet',
        valueKey: 'palletCall',
      };
    } else if (typeId === errorEnumTypeId) {
      return {
        tagKey: 'pallet',
        valueKey: 'palletError',
      };
    } else if (
      this.getFieldTypeIdsFromEnum(eventEnumTypeId).includes(typeId) ||
      this.getFieldTypeIdsFromEnum(errorEnumTypeId).includes(typeId)
    ) {
      return {
        tagKey: 'name',
        valueKey: 'data',
      };
    } else if (this.getFieldTypeIdsFromEnum(callTypeId).includes(typeId)) {
      return {
        tagKey: 'name',
        valueKey: 'params',
      };
    }

    return {
      tagKey: 'type',
      valueKey: 'value',
    };
  }

  getFieldTypeIdsFromEnum(typeId: TypeId): number[] {
    try {
      const eventType = this.findType(typeId);

      if (eventType.typeDef.type === 'Enum') {
        return eventType.typeDef.value.members.map((m) => m.fields[0].typeId);
      }
    } catch {
      // In-case of metadata v14, we don't have an explicit type for RuntimeError
      // For now, we just ignore the error and return an empty array
    }

    return [];
  }
}
