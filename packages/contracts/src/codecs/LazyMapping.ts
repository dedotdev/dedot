import { concatU8a, toU8a } from '@dedot/utils';
import { BaseLazyObject } from './BaseLazyObject';

export class LazyMapping extends BaseLazyObject {
  async get(key: any) {
    const {
      id,
      type: { params },
    } = this.typeDef;

    const [keyType, valueType] = params!;
    const $Key = this.registry.findCodec(keyType.type);
    const $Value = this.registry.findCodec(valueType.type);

    const rootKey = this.findStorageRootLayout(id);

    const encodedKey = $Key.tryEncode(key);
    const storageKey = concatU8a(toU8a(rootKey), encodedKey);
    const rawValue = await this.getContractStorage(storageKey);

    if (rawValue) {
      return $Value.tryDecode(rawValue);
    }

    return undefined;
  }
}
