import {
  $StorageData,
  PortableRegistry,
  PalletDefLatest,
  StorageDataLike,
  StorageEntryLatest,
  StorageKey,
  PrefixedStorageKey,
} from '@dedot/codecs';
import { assert, HASHERS, hexAddPrefix, UnknownApiError } from '@dedot/utils';
import { xxhashAsU8a, hexToU8a, stringCamelCase, concatU8a, u8aToHex } from '@dedot/utils';

// https://github.com/polkadot-js/api/blob/0982f68507942c5bf6f751f662804344e211b289/packages/types/src/primitive/StorageKey.ts#L29-L38
const HASHER_INFO: Record<string, [hashLen: number, canDecodeKey: boolean]> = {
  blake2_128: [16, false],
  blake2_256: [32, false],
  blake2_128Concat: [16, true],
  twox128: [16, false],
  twox256: [32, false],
  twox64Concat: [8, true],
  identity: [0, true],
};

/**
 * @name QueryableStorage
 * @description A helper to encode key & decode value for a storage entry
 */
export class QueryableStorage {
  readonly pallet: PalletDefLatest;
  readonly storageEntry: StorageEntryLatest;
  constructor(
    readonly registry: PortableRegistry,
    readonly palletName: string,
    readonly storageItem: string,
  ) {
    this.pallet = this.#getPallet();
    this.storageEntry = this.#getStorageEntry();
  }

  get prefixKey(): PrefixedStorageKey {
    return u8aToHex(this.prefixKeyAsU8a);
  }

  get prefixKeyAsU8a(): Uint8Array {
    const palletNameHash = xxhashAsU8a(this.pallet.name, 128);
    const storageItemHash = xxhashAsU8a(this.storageEntry.name, 128);
    return concatU8a(palletNameHash, storageItemHash);
  }

  #getStorageMapInfo(type: StorageEntryLatest['type']) {
    assert(type.tag === 'Map');

    const { hashers, keyTypeId } = type.value;

    let keyTypeIds = [keyTypeId];
    if (hashers.length > 1) {
      const { type } = this.registry.findType(keyTypeId);

      assert(type.tag === 'Tuple', 'Key type should be a tuple!');
      keyTypeIds = type.value.fields;
    }

    return { hashers, keyTypeIds };
  }

  /**
   * Encode plain key input to raw/bytes storage key
   *
   * @param keyInput
   */
  encodeKey(keyInput?: any): StorageKey {
    const { type } = this.storageEntry;

    if (type.tag === 'Plain') {
      return this.prefixKey;
    } else if (type.tag === 'Map') {
      const { hashers, keyTypeIds } = this.#getStorageMapInfo(type);
      const extractedInputs = this.#extractRequiredKeyInputs(keyInput, hashers.length);

      const keyParts = keyTypeIds.map((keyId, index) => {
        const input = extractedInputs[index];
        const hasher = HASHERS[hashers[index]];
        const $keyCodec = this.registry.findCodec(keyId);
        return hasher($keyCodec.tryEncode(input));
      });

      return u8aToHex(concatU8a(this.prefixKeyAsU8a, ...keyParts));
    }

    throw Error(`Invalid storage entry type: ${type}`);
  }

  /**
   * Decode storage key to plain key input
   * Only storage keys that hashed by `twox64Concat`, `blake2_128Concat`, or `identity` can be decoded
   *
   * @param key
   */
  decodeKey(key: StorageKey): any {
    const { type } = this.storageEntry;

    if (type.tag === 'Plain') {
      return;
    } else if (type.tag === 'Map') {
      const prefix = this.prefixKey;
      if (!key.startsWith(prefix)) {
        throw new Error(`Storage key does not match this storage entry (${this.palletName}.${this.storageItem})`);
      }

      const { hashers, keyTypeIds } = this.#getStorageMapInfo(type);

      let keyData = hexToU8a(hexAddPrefix(key.slice(prefix.length)));
      const results = keyTypeIds.map((keyId, index) => {
        const [hashLen, canDecode] = HASHER_INFO[hashers[index]];
        if (!canDecode) throw new Error('Cannot decode storage key');

        const $keyCodec = this.registry.findCodec(keyId);
        keyData = keyData.slice(hashLen);

        const result = $keyCodec.tryDecode(keyData);
        const encoded = $keyCodec.tryEncode(result);
        keyData = keyData.slice(encoded.length);

        return result;
      });

      return hashers.length > 1 ? results : results[0];
    }

    throw Error(`Invalid storage entry type: ${type}`);
  }

  /**
   * Decode raw/bytes storage data to plain value
   *
   * @param raw
   */
  decodeValue(raw?: StorageDataLike | null): any {
    const {
      modifier,
      type: {
        value: { valueTypeId },
      },
      default: defaultValue,
    } = this.storageEntry;

    if (raw === null || raw === undefined) {
      if (modifier === 'Optional') {
        return undefined;
      } else if (modifier === 'Default') {
        return this.registry.findCodec(valueTypeId).tryDecode(hexToU8a(defaultValue));
      }
    } else {
      return this.registry.findCodec(valueTypeId).tryDecode($StorageData.tryEncode(raw));
    }
  }

  #extractRequiredKeyInputs(keyInput: any, numberOfValue: number): any[] {
    if (numberOfValue === 0) {
      return [];
    } else {
      if (keyInput === undefined) {
        throw new Error(`Invalid key inputs, required ${numberOfValue} input(s)`);
      }

      if (numberOfValue === 1) {
        return [keyInput];
      } else {
        if (!Array.isArray(keyInput)) {
          throw new Error(`Input should be an array with ${numberOfValue} value(s)`);
        }

        if (keyInput.length !== numberOfValue) {
          throw new Error(`Mismatch key inputs length, required an array of ${numberOfValue} value(s)`);
        }

        return keyInput.slice(0, numberOfValue);
      }
    }
  }

  #getPallet(): PalletDefLatest {
    const targetPallet = this.registry.metadata!.pallets.find(
      (p) => stringCamelCase(p.name) === stringCamelCase(this.palletName),
    )!;

    assert(targetPallet, new UnknownApiError(`Pallet not found: ${this.palletName}`));

    return targetPallet;
  }

  #getStorageEntry(): StorageEntryLatest {
    const targetEntry = this.pallet.storage?.entries?.find(
      (entry) => stringCamelCase(entry.name) === stringCamelCase(this.storageItem),
    )!;

    assert(targetEntry, new UnknownApiError(`Storage item not found: ${this.storageItem}`));

    return targetEntry;
  }
}
