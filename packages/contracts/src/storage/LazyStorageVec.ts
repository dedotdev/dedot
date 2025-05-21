import * as $ from '@dedot/shape';
import { assert, concatU8a, toU8a } from '@dedot/utils';
import { BaseLazyObject } from './BaseLazyObject';

export class LazyStorageVec extends BaseLazyObject {
  async len(): Promise<number> {
    const { id } = this.typeDef;

    const rootKey = this.findStorageRootLayout(id);
    const rawValue = await this.getContractStorage(rootKey);

    if (rawValue) {
      return $.u32.tryDecode(rawValue) as number;
    }

    return 0;
  }

  async get(index: number) {
    const {
      id,
      type: { params },
    } = this.typeDef;

    const [valueType] = params!;
    const $Value = this.registry.findCodec(valueType.type);

    const rootKey = this.findStorageRootLayout(id);

    const encodedKey = $.u32.tryEncode(index);
    const storageKey = concatU8a(toU8a(rootKey), encodedKey);
    const rawValue = await this.getContractStorage(storageKey);

    if (rawValue) {
      return $Value.tryDecode(rawValue);
    }

    return undefined;
  }
}
