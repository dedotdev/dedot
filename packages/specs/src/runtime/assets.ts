import { RuntimeApisModule } from '@delightfuldot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bfb241d7f3e29152b9fe0ab3a0364ee0c89ec65c/substrate/bin/node/runtime/src/assets_api.rs#L24-L33
 */
export const assets: RuntimeApisModule = {
  AssetsApi: [
    {
      methods: {
        accountBalances: {
          docs: 'Returns the list of `AssetId`s and corresponding balance that an `AccountId` has.',
          params: [
            {
              name: 'account',
              type: 'AccountId32',
            },
          ],
          type: 'Array<[u32, Balance]>',
        },
      },
      version: 1,
    },
  ],
};
