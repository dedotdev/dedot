import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { Bytes, Hash, TransactionStatus } from '@dedot/codecs';
import { ExtrinsicOrHash } from './types/index.js';

export interface AuthorJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Checks if the keystore has private keys for the given public key and key type. Returns `true` if a private key could be found.
   *
   * @rpcname author_hasKey
   * @param {Bytes} publicKey
   * @param {string} keyType
   **/
  author_hasKey: (publicKey: Bytes, keyType: string) => Promise<boolean>;

  /**
   * Checks if the keystore has private keys for the given session public keys. `session_keys` is the SCALE encoded session keys object from the runtime. Returns `true` iff all private keys could be found.
   *
   * @rpcname author_hasSessionKeys
   * @param {Bytes} sessionKeys
   **/
  author_hasSessionKeys: (sessionKeys: Bytes) => Promise<boolean>;

  /**
   * Insert a key into the keystore.
   *
   * @rpcname author_insertKey
   * @param {string} keyType
   * @param {string} suri
   * @param {Bytes} publicKey
   **/
  author_insertKey: (keyType: string, suri: string, publicKey: Bytes) => Promise<void>;

  /**
   * Returns all pending extrinsics, potentially grouped by sender.
   *
   * @rpcname author_pendingExtrinsics
   **/
  author_pendingExtrinsics: () => Promise<Array<Bytes>>;

  /**
   * Remove given extrinsic from the pool and temporarily ban it to prevent reimporting.
   *
   * @rpcname author_removeExtrinsic
   * @param {Array<ExtrinsicOrHash>} bytesOrHash
   **/
  author_removeExtrinsic: (bytesOrHash: Array<ExtrinsicOrHash>) => Promise<Array<Hash>>;

  /**
   * Generate new session keys and returns the corresponding public keys.
   *
   * @rpcname author_rotateKeys
   **/
  author_rotateKeys: () => Promise<Bytes>;

  /**
   * Submit and subscribe to watch an extrinsic until unsubscribed
   *
   * @subscription author_extrinsicUpdate, author_submitAndWatchExtrinsic, author_unwatchExtrinsic
   * @param {Bytes} extrinsic
   **/
  author_submitAndWatchExtrinsic: (extrinsic: Bytes, callback: Callback<TransactionStatus>) => Promise<Unsub>;

  /**
   * Submit hex-encoded extrinsic for inclusion in block.
   *
   * @rpcname author_submitExtrinsic
   * @param {Bytes} extrinsic
   **/
  author_submitExtrinsic: (extrinsic: Bytes) => Promise<Hash>;
}
