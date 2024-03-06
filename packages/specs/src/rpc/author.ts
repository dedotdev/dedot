import { RpcModuleSpec } from '@dedot/types';
import { $TransactionStatus } from '@dedot/codecs';

export const author: RpcModuleSpec = {
  submitExtrinsic: {
    docs: 'Submit hex-encoded extrinsic for inclusion in block.',
    params: [
      {
        name: 'extrinsic',
        type: 'Bytes',
      },
    ],
    type: 'Hash',
  },
  insertKey: {
    docs: 'Insert a key into the keystore.',
    params: [
      {
        name: 'keyType',
        type: 'string',
      },
      {
        name: 'suri',
        type: 'string',
      },
      {
        name: 'publicKey',
        type: 'Bytes',
      },
    ],
    type: 'void',
  },
  rotateKeys: {
    docs: 'Generate new session keys and returns the corresponding public keys.',
    params: [],
    type: 'Bytes',
  },
  hasSessionKeys: {
    docs:
      'Checks if the keystore has private keys for the given session public keys.\n' +
      '`session_keys` is the SCALE encoded session keys object from the runtime.\n' +
      'Returns `true` iff all private keys could be found.',
    params: [
      {
        name: 'sessionKeys',
        type: 'Bytes',
      },
    ],
    type: 'boolean',
  },
  hasKey: {
    docs:
      'Checks if the keystore has private keys for the given public key and key type.\n' +
      '\tReturns `true` if a private key could be found.',
    params: [
      {
        name: 'publicKey',
        type: 'Bytes',
      },
      {
        name: 'keyType',
        type: 'string',
      },
    ],
    type: 'boolean',
  },
  pendingExtrinsics: {
    docs: 'Returns all pending extrinsics, potentially grouped by sender.',
    params: [],
    type: 'Array<Bytes>',
  },
  removeExtrinsic: {
    docs: 'Remove given extrinsic from the pool and temporarily ban it to prevent reimporting.',
    params: [
      {
        name: 'bytesOrHash',
        type: 'Array<ExtrinsicOrHash>',
      },
    ],
    type: 'Array<Hash>',
  },
  submitAndWatchExtrinsic: {
    docs: 'Submit and subscribe to watch an extrinsic until unsubscribed',
    params: [
      {
        name: 'extrinsic',
        type: 'Bytes',
      },
    ],
    pubsub: ['author_extrinsicUpdate', 'author_submitAndWatchExtrinsic', 'author_unwatchExtrinsic'],
    type: 'TransactionStatus',
    isScale: true,
    codec: $TransactionStatus,
  },
};
