import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/43415ef58c143b985e09015cd000dbd65f6d3997/substrate/primitives/session/src/runtime_api.rs#L21-L31
 */
export const SessionKeys: RuntimeApiSpec[] = [
  {
    methods: {
      generateSessionKeys: {
        docs: [
          'Generate a set of session keys with optionally using the given seed.',
          'The keys should be stored within the keystore exposed via runtime',
          'externalities.',
          '\n',
          'The seed needs to be a valid `utf8` string.',
          '\n',
          'Returns the concatenated SCALE encoded public keys.',
        ],
        params: [
          {
            name: 'seed',
            type: 'Option<Bytes>',
          },
        ],
        type: 'Bytes',
      },
      decodeSessionKeys: {
        docs: ['Decode the given public session key', '\n', 'Returns the list of public raw public keys + key typ'],
        params: [
          {
            name: 'encoded',
            type: 'Bytes',
          },
        ],
        type: 'Option<Array<[Bytes, KeyTypeId]>>',
      },
    },
    version: 1,
  },
];
