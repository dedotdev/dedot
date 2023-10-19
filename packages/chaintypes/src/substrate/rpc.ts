import { BlockHash, Header, Metadata, StorageData, StorageKey } from '@delightfuldot/codecs';
import { GenericRpcCalls } from '@delightfuldot/types';

export interface RpcCalls extends GenericRpcCalls {
  state: {
    getMetadata(at?: BlockHash): Promise<Metadata>;
    getStorage(key: StorageKey, at?: BlockHash): Promise<StorageData>;
  };
  chain: {
    getHeader(): Promise<Header>;
  };
}
