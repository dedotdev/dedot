import * as $ from '@dedot/shape';
import { assert, concatU8a, toU8a } from '@dedot/utils';
import { BaseLazyObject } from './BaseLazyObject';

export class LazyStorageVec extends BaseLazyObject {
  async len(): Promise<number> {
    const {
      id,
      type: { def },
    } = this.typeDef;

    assert(def.composite);

    const lenTypeId = def.composite.fields![0].type;
    const lenTypeDef = this.registry.metadata.types.find(({ id }) => id === lenTypeId);

    assert(lenTypeDef);

    const {
      type: { params },
    } = lenTypeDef;

    const innerLenTypeId = params![0].type;
    const $Len = this.registry.findCodec(innerLenTypeId);

    const rootKey = this.findStorageRootLayout(id);

    const storageKey = concatU8a(toU8a(rootKey));
    const rawValue = await this.getContractStorage(storageKey);

    if (rawValue) {
      return $Len.tryDecode(rawValue) as number;
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
