import { JsonRpcResponse, JsonRpcResponseNotification, WsProvider } from '@dedot/providers';
import { Dedot } from './client';
import { BlockHash, BlockNumber, Hash, Option, RuntimeVersion } from '@dedot/codecs';
import { AlephApi } from '@dedot/chaintypes';
import { AsyncMethod } from '@dedot/types';
import { rpcCallSpecs } from '@dedot/specs';
import { PolkadotApi } from '../../../codegen/polkadot';

// declare module '@dedot/specs' {
//   export interface JsonRpcApis {
//     /**
//      * This is a random test method
//      * @param blockNumber
//      */
//     kate_test: (blockNumber?: number) => Promise<Hash>;
//
//     /**
//      * Follow chainhead
//      * @param withRuntime
//      */
//     chainHead_unstable_follow: (withRuntime: boolean) => Promise<string>;
//   }
// }

const run = async (): Promise<void> => {
  //  get list of all alias method name
  // const aliasMethods = rpcCallSpecs
  //   .filter((spec) => spec.alias)
  //   .map((spec) => spec.alias)
  //   .flat()
  //   .map((alias) => `'${alias}'`)
  //   .join(', ');
  //
  // console.log(aliasMethods);

  const api = new Dedot<PolkadotApi>({
    endpoint: 'wss://rpc.polkadot.io',
    subscriptions: {
      chainHead_unstable_follow: ['chainHead_unstable_followEvent', 'chainHead_unstable_unfollow'],
    },
  });
  await api.connect();

  const metadata = await api.jsonrpc.state_getMetadata();
  console.log(metadata);

  await api.jsonrpc.chainHead_unstable_follow(false, (result: any) => {
    console.log(result);
  });

  console.log(await api.jsonrpc.account_nextIndex('5H4ADToRqTXEeHfmw8VGK8UEG3ehQNCAaoJLsdaUXijrqsUt'));

  //
  // // api.rpc_.author_submitAndWatchExtrinsic
  //
  // const header = await api.rpc_.author_submitAndWatchExtrinsic('0x123', (status: any) => {});
  // await api.rpc_.author_submitExtrinsic('0x123');
  // const hash1 = await api.rpc_.chain_getBlockHash(1);
  // const hash2 = await api.rpc_.kate_test(1);
  // const hash3 = await api.rpc_.author_unwatchExtrinsic('chain_subscribeNewHead', '1');
  // const hash = await api.rpc_.chain_getBlockHash(12);
  // console.log(await api.rpc.chain.getHeader());
  // await api.disconnect();
  // await api.connect();
  // console.log(await api.rpc.chain.getHeader());
  // await api.disconnect();

  // const provider = new WsProvider({ endpoint: 'wss://rpc.polkadot.io', retryDelayMs: -1 });
  // const provider = new WsProvider({ endpoint: 'ws://hello' });
  // provider.on('reconnecting', () => {
  //   console.log('reconnecting');
  // });
  // //
  // await provider.connect();

  // const provider = new WsProvider('wss://rpc.polkadot.io');
  // await provider.connect();
  // const genesisHash = await provider.send('chain_getBlockHash', [0]);
  // console.log(genesisHash);
  //
  // await provider.subscribe(
  //   {
  //     subname: 'chain_newHead',
  //     subscribe: 'chain_subscribeNewHeads',
  //     params: [],
  //     unsubscribe: 'chain_unsubscribeNewHeads',
  //   },
  //   (error, newHead, subscription) => {
  //     console.log('newHead', newHead);
  //   },
  // );
  // await provider.disconnect();
  //
  // await provider.subscribe(
  //   {
  //     subname: 'chain_newHead',
  //     subscribe: 'chain_subscribeNewHead',
  //     unsubscribe: 'chain_unsubscribeNewHead',
  //     params: [],
  //   },
  //   async (error, head, subscription) => {
  //     if (error) {
  //       console.log('01 - New head error:', error);
  //     } else {
  //       console.log('01 - New head:', head.number, subscription);
  //     }
  //   },
  // );
  //
  // setTimeout(async () => {
  //   await provider.disconnect();
  // }, 3000);
  //
  // setTimeout(async () => {
  //   await provider.connect();
  //
  //   await provider.subscribe(
  //     {
  //       subname: 'chain_newHead',
  //       subscribe: 'chain_subscribeNewHead',
  //       unsubscribe: 'chain_unsubscribeNewHead',
  //       params: [],
  //     },
  //     async (error, head, subscription) => {
  //       console.log('02 - New head:', head.number, subscription);
  //     },
  //   );
  // }, 10000);
};

run().catch(console.error);
