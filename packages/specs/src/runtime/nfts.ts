import { RuntimeApisModule } from '@delightfuldot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/21f1811c6600d8a7fe043592ff34dcb79284d583/substrate/frame/nfts/runtime-api/src/lib.rs#L25-L40
 */
export const nfts: RuntimeApisModule = {
  NftsApi: [
    {
      methods: {
        owner: {
          docs: 'Collection owner',
          params: [
            {
              name: 'collection',
              type: 'NftCollectionId',
            },
            {
              name: 'item',
              type: 'NftItemId',
            },
          ],
          type: 'Option<AccountId32>',
        },
        collectionOwner: {
          docs: 'A collection owner',
          params: [
            {
              name: 'collection',
              type: 'NftCollectionId',
            },
          ],
          type: 'Option<AccountId32>',
        },
        attribute: {
          docs: 'An attribute',
          params: [
            {
              name: 'collection',
              type: 'NftCollectionId',
            },
            {
              name: 'item',
              type: 'NftItemId',
            },
            {
              name: 'key',
              type: 'Array<u8>',
            },
          ],
          type: 'Option<Array<u8>>',
        },
        customAttribute: {
          docs: 'A custom attribute',
          params: [
            {
              name: 'account',
              type: 'AccountId32',
            },
            {
              name: 'collection',
              type: 'NftCollectionId',
            },
            {
              name: 'item',
              type: 'NftItemId',
            },
            {
              name: 'key',
              type: 'Array<u8>',
            },
          ],
          type: 'Option<Array<u8>>',
        },
        systemAttribute: {
          docs: 'System attribute',
          params: [
            {
              name: 'collection',
              type: 'NftCollectionId',
            },
            {
              name: 'item',
              type: 'NftItemId',
            },
            {
              name: 'key',
              type: 'Array<u8>',
            },
          ],
          type: 'Option<Array<u8>>',
        },
        collectionAttribute: {
          docs: 'A collection attribute',
          params: [
            {
              name: 'collection',
              type: 'NftCollectionId',
            },
            {
              name: 'key',
              type: 'Array<u8>',
            },
          ],
          type: 'Option<Array<u8>>',
        },
      },
      version: 1,
    },
  ],
};
