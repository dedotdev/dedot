import { assert, HASHERS } from '@dedot/utils';
import {
  $StorageData,
  PortableRegistry,
  PalletDefLatest,
  StorageDataLike,
  StorageEntryLatest,
  StorageKey,
} from '@dedot/codecs';
import { hexToU8a, stringCamelCase, u8aConcat, u8aToHex } from '@polkadot/util';
import { xxhashAsU8a } from '@dedot/utils';

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

  encodeKey(keyInput?: any): StorageKey {
    const palletNameHash = xxhashAsU8a(this.pallet.name, 128);
    const storageItemHash = xxhashAsU8a(this.storageEntry.name, 128);
    const prefixHash = u8aConcat(palletNameHash, storageItemHash);

    const { type } = this.storageEntry;

    if (type.tag === 'Plain') {
      return u8aToHex(prefixHash);
    } else if (type.tag === 'Map') {
      const { hashers, keyTypeId } = type.value;
      const extractedInputs = this.#extractRequiredKeyInputs(keyInput, hashers.length);

      let keyTypeIds = [keyTypeId];
      if (hashers.length > 1) {
        const { type } = this.registry.findType(keyTypeId);

        assert(type.tag === 'Tuple', 'Key type should be a tuple!');
        keyTypeIds = type.value.fields;
      }

      const keyParts = keyTypeIds.map((keyId, index) => {
        const input = extractedInputs[index];
        const hasher = HASHERS[hashers[index]];
        const $keyCodec = this.registry.findCodec(keyId);
        return hasher($keyCodec.tryEncode(input));
      });

      return u8aToHex(u8aConcat(prefixHash, ...keyParts));
    }

    throw Error(`Invalid storage entry type: ${type}`);
  }

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

    assert(targetPallet, `Pallet not found: ${this.palletName}`);

    return targetPallet;
  }

  #getStorageEntry(): StorageEntryLatest {
    const targetEntry = this.pallet.storage?.entries?.find(
      (entry) => stringCamelCase(entry.name) === stringCamelCase(this.storageItem),
    )!;

    assert(targetEntry, `Storage item not found: ${this.storageItem}`);

    return targetEntry;
  }
}
