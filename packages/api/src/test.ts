import { WsProvider } from '@dedot/providers';

const run = async (): Promise<void> => {
  // const api = new Dedot('');
  // await api.connect();
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

  const provider = new WsProvider('wss://rpc.polkadot.io');
  await provider.connect();
  const genesisHash = await provider.send('chain_getBlockHash', [0]);
  console.log(genesisHash);

  await provider.subscribe(
    {
      subname: 'chain_newHead',
      subscribe: 'chain_subscribeNewHeads',
      params: [],
      unsubscribe: 'chain_unsubscribeNewHeads',
    },
    (error, newHead, subscription) => {
      console.log('newHead', newHead);
    },
  );
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
