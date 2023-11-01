import { hexToU8a, stringCamelCase, u8aConcat, u8aToHex, u8aToU8a } from '@polkadot/util';
import { xxhashAsU8a } from '@polkadot/util-crypto';
import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { HASHERS } from '@delightfuldot/utils';
import { Executor } from './Executor';

export class StorageQueryExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, storage: string) {
    return async (...args: unknown[]) => {
      const storageKeyFn = this.storageKey(pallet, storage);
      const key = storageKeyFn(...args);
      const valueTypeId = storageKeyFn.valueTypeId;
      const entry = storageKeyFn.targetEntry;

      const result = await this.api.rpc.state.getStorage(key);

      if (result === null) {
        if (entry.modifier === 'Optional') {
          return undefined;
        } else if (entry.modifier === 'Default') {
          return this.registry.findPortableCodec(valueTypeId).tryDecode(hexToU8a(entry.default));
        }
      } else {
        return this.registry.findPortableCodec(valueTypeId).tryDecode(hexToU8a(result));
      }
    };
  }

  storageKey(pallet: string, item: string) {
    const targetPallet = this.getPallet(pallet);

    const targetEntry = targetPallet.storage?.entries?.find((entry) => stringCamelCase(entry.name) === item);
    if (!targetEntry) {
      throw new Error('Item not found');
    }

    const fn = (...args: unknown[]) => {
      const palletNameHash = xxhashAsU8a(targetPallet.name, 128);
      const entryNameHash = xxhashAsU8a(targetEntry.name, 128);

      const { type } = targetEntry;

      if (type.tag === 'Plain') {
        return u8aToHex(u8aConcat(palletNameHash, entryNameHash));
      } else if (type.tag === 'Map') {
        const { hashers, keyTypeId } = type.value;
        if (hashers.length === 1) {
          let input = args[0];

          const $keyCodec = this.registry.findPortableCodec(keyTypeId);

          // @ts-ignore
          fn.keyCodec = $keyCodec;

          const inputHash = HASHERS[hashers[0]]($keyCodec.tryEncode(input));
          return u8aToHex(u8aConcat(palletNameHash, entryNameHash, inputHash));
        } else {
          throw Error('// TODO To implement!');
        }
      }

      throw Error('Invalid type');
    };

    fn.targetEntry = targetEntry;
    fn.valueTypeId = targetEntry.type.value.valueTypeId;

    return fn;
  }
}
