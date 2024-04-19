import { BlockHash, Hash, Option, PrefixedStorageKey, StorageData, StorageKey } from '@dedot/codecs';
import { GenericJsonRpcApis } from '@dedot/types';

export interface ChildStateJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Returns the keys with prefix from a child storage, leave empty to get all the keys
   *
   * @rpcname childstate_getKeys
   * @deprecated: Please use `getKeysPaged` with proper paging support
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} prefix
   * @param {BlockHash} at
   **/
  childstate_getKeys: (
    childStorageKey: PrefixedStorageKey,
    prefix: StorageKey,
    at?: BlockHash,
  ) => Promise<Array<StorageKey>>;

  /**
   * Returns the keys with prefix from a child storage with pagination support.
   * Up to `count` keys will be returned.
   * If `start_key` is passed, return next keys in storage in lexicographic order.
   *
   * @rpcname childstate_getKeysPaged
   * @param {PrefixedStorageKey} childStorageKey
   * @param {Option<StorageKey>} prefix
   * @param {number} count
   * @param {StorageKey} startKey
   * @param {BlockHash} at
   **/
  childstate_getKeysPaged: (
    childStorageKey: PrefixedStorageKey,
    prefix: Option<StorageKey>,
    count: number,
    startKey?: StorageKey,
    at?: BlockHash,
  ) => Promise<Array<StorageKey>>;

  /**
   * Returns a child storage entry at specific block's state.
   *
   * @rpcname childstate_getStorage
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  childstate_getStorage: (
    childStorageKey: PrefixedStorageKey,
    key: StorageKey,
    at?: BlockHash,
  ) => Promise<Option<StorageData>>;

  /**
   * Returns child storage entries for multiple keys at a specific block's state.
   *
   * @rpcname childstate_getStorageEntries
   * @param {PrefixedStorageKey} childStorageKey
   * @param {Array<StorageKey>} keys
   * @param {BlockHash} at
   **/
  childstate_getStorageEntries: (
    childStorageKey: PrefixedStorageKey,
    keys: Array<StorageKey>,
    at?: BlockHash,
  ) => Promise<Array<Option<StorageData>>>;

  /**
   * Returns the hash of a child storage entry at a block's state.
   *
   * @rpcname childstate_getStorageHash
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  childstate_getStorageHash: (
    childStorageKey: PrefixedStorageKey,
    key: StorageKey,
    at?: BlockHash,
  ) => Promise<Option<Hash>>;

  /**
   * Returns the size of a child storage entry at a block's state
   *
   * @rpcname childstate_getStorageSize
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  childstate_getStorageSize: (
    childStorageKey: PrefixedStorageKey,
    key: StorageKey,
    at?: BlockHash,
  ) => Promise<Option<number>>;
}
