import { RuntimeApisModule } from '@delightfuldot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/4f832ea865e48625c8035ec08b8fb98e9f0e5519/substrate/frame/asset-conversion/src/lib.rs#L1222-L1255
 */
export const assetConversion: RuntimeApisModule = {
  AssetConversionApi: [
    {
      methods: {
        getReserves: {
          docs: 'Get pool reserves',
          params: [
            {
              name: 'asset1',
              type: 'Location',
            },
            {
              name: 'asset2',
              type: 'Location',
            },
          ],
          type: 'Option<[Balance, Balance]>',
        },
        quotePriceExactTokensForTokens: {
          docs: 'Quote price: exact tokens for tokens',
          params: [
            {
              name: 'asset1',
              type: 'Location',
            },
            {
              name: 'asset2',
              type: 'Location',
            },
            {
              name: 'amount',
              type: 'u128',
            },
            {
              name: 'includeFee',
              type: 'bool',
            },
          ],
          type: 'Option<Balance>',
        },
        quotePriceTokensForExactTokens: {
          description: 'Quote price: tokens for exact tokens',
          params: [
            {
              name: 'asset1',
              type: 'Location',
            },
            {
              name: 'asset2',
              type: 'Location',
            },
            {
              name: 'amount',
              type: 'u128',
            },
            {
              name: 'includeFee',
              type: 'bool',
            },
          ],
          type: 'Option<Balance>',
        },
      },
      version: 1,
    },
  ],
};
