import { BaseLazyObject } from './BaseLazyObject.js';

export class LazyObject extends BaseLazyObject {
  async get() {
    const {
      id,
      type: { params },
    } = this.typeDef;

    const [valueType] = params!;
    const $Value = this.registry.findCodec(valueType.type);

    const rootKey = this.findStorageRootLayout(id);
    const rawValue = await this.getContractStorage(rootKey);

    if (rawValue) {
      return $Value.tryDecode(rawValue);
    }

    return undefined;
  }
}
