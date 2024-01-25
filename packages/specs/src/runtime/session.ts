import { RuntimeApisModule } from '@delightfuldot/types';

export const session: RuntimeApisModule = {
  SessionKeys: [
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
              type: 'Option<Array<u8>>',
            },
          ],
          type: 'Array<u8>',
        },
        decodeSessionKeys: {
          docs: ['Decode the given public session key', '\n', 'Returns the list of public raw public keys + key typ'],
          params: [
            {
              name: 'encoded',
              type: 'Bytes',
            },
          ],
          type: 'Option<Array<[Array<u8>, KeyTypeId]>>',
        },
      },
      version: 1,
    },
  ],
};
