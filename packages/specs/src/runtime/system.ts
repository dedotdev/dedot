import { RuntimeApisModule } from '@delightfuldot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/6a29a70a927de1017b5c54626c88c3fa439aef48/substrate/frame/system/rpc/runtime-api/src/lib.rs#L26-L35
 */
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
