import { assert, HexString, toU8a } from '@dedot/utils';
import { TypinkRegistry } from 'src/TypinkRegistry';
import { AnyLayoutV5, ContractType } from 'src/types';
import { findStorageRootKey } from '../utils';

export abstract class BaseLazyObject {
  constructor(
    public readonly typeDef: ContractType,
    public readonly registry: TypinkRegistry,
  ) {}

  findStorageRootLayout(typeId: number): HexString {
    const rootLayout = this.registry.metadata.storage;
    const rootKey = findStorageRootKey(rootLayout as AnyLayoutV5, typeId);
    assert(rootKey, 'Root Key Not Found');

    return rootKey as HexString;
  }

  getContractStorage(key: Uint8Array | HexString): Promise<HexString | undefined> {
    const { getStorage } = this.registry.options || {};
    assert(getStorage, 'getStorage is not available');

    return getStorage(toU8a(key));
  }
}
