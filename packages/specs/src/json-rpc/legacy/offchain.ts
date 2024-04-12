import { GenericJsonRpcApis } from '@dedot/types';
import { StorageKind } from './types/index.js';
import { Bytes, Option } from '@dedot/codecs';

export interface OffchainJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Get offchain local storage under given key and prefix.
   *
   * @rpcname offchain_localStorageGet
   * @param {StorageKind} kind
   * @param {Bytes} key
   **/
  offchain_localStorageGet: (kind: StorageKind, key: Bytes) => Promise<Option<Bytes>>;

  /**
   * Set offchain local storage under given key and prefix.
   *
   * @rpcname offchain_localStorageSet
   * @param {StorageKind} kind
   * @param {Bytes} key
   * @param {Bytes} value
   **/
  offchain_localStorageSet: (kind: StorageKind, key: Bytes, value: Bytes) => Promise<void>;
}
