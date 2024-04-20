import { EnumOptions } from '@dedot/shape';
import { blake2_256, HashFn, HexString, hexToU8a, isObject, isU8a, u8aToHex } from '@dedot/utils';
import {
  $Extrinsic,
  DispatchError,
  MetadataLatest,
  ModuleError,
  PalletErrorMetadataLatest,
  PortableType,
  TypeId,
} from '../codecs/index.js';
import { TypeRegistry } from './TypeRegistry';

/**
 * Codec registry for portable types from metadata
 */
export class PortableRegistry extends TypeRegistry {
  readonly #metadata: MetadataLatest;
  #hasher: HashFn;

  constructor(metadata: MetadataLatest, hasher?: HashFn) {
    super(metadata.types);
    this.#metadata = metadata;
    this.#hasher = hasher || blake2_256;
  }

  get $Extrinsic() {
    return $Extrinsic(this);
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
  getEnumOptions(typeId: TypeId): EnumOptions {
    const {
      extrinsic: { callTypeId },
      outerEnums: { eventEnumTypeId },
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
    } else if (this.getPalletEventTypeIds().includes(typeId)) {
      return {
        tagKey: 'name',
        valueKey: 'data',
      };
    } else if (this.getPalletCallTypeIds().includes(typeId)) {
      return {
        tagKey: 'name',
        valueKey: 'params',
      };
    }

    return {
      tagKey: 'tag',
      valueKey: 'value',
    };
  }

  getPalletCallTypeIds(): number[] {
    const {
      extrinsic: { callTypeId },
    } = this.metadata;

    const callType = this.findType(callTypeId);
    if (callType.type.tag === 'Enum') {
      return callType.type.value.members.map((m) => m.fields[0].typeId);
    }

    return [];
  }

  getPalletEventTypeIds(): number[] {
    const {
      outerEnums: { eventEnumTypeId },
    } = this.metadata;

    const eventType = this.findType(eventEnumTypeId);
    if (eventType.type.tag === 'Enum') {
      return eventType.type.value.members.map((m) => m.fields[0].typeId);
    }

    return [];
  }
}
