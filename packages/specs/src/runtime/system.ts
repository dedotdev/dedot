import { RuntimeApisModule } from '@delightfuldot/types';

export const system: RuntimeApisModule = {
  AccountNonceApi: [
    {
      methods: {
        accountNonce: {
          docs: 'The API to query account nonce (aka transaction index)',
          params: [
            {
              name: 'accountId',
              type: 'AccountId32',
            },
          ],
          type: 'Nonce',
        },
      },
      version: 1,
    },
  ],
};
