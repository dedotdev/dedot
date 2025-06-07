import { WsProvider } from 'dedot';
import { assert, isHex, isNumber } from 'dedot/utils';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  const { wsUri: endpoint } = networkInfo.nodesByName[nodeName];

  const provider = new WsProvider(endpoint);

  try {
    await provider.send('chain_getBlockHash', [0]);
    throw new Error('Expected an error here!');
  } catch (e: any) {
    assert(e.message === 'Websocket connection is not connected');
  }

  await provider.connect();

  const hash = await provider.send('chain_getBlockHash', [0]);
  assert(isHex(hash), 'Expected a string value');
  console.log('genesis hash', hash);

  await provider.disconnect();

  await provider.connect();

  return new Promise(async (resolve, reject) => {
    const subscription = await provider.subscribe(
      {
        subname: 'chain_newHead',
        subscribe: 'chain_subscribeNewHead',
        unsubscribe: 'chain_unsubscribeNewHead',
        params: [],
      },
      async (error, head, subscriptionObject) => {
        await subscriptionObject.unsubscribe();

        assert(subscription === subscriptionObject, 'Subscription object mismatch');

        if (error) {
          console.error('Error in newHead subscription', error);
          reject(error);
        } else {
          console.log('New head', head);
          assert(isHex(head.parentHash), 'Expected a string value');
          assert(isNumber(parseInt(head.number, 16)), 'Expected a number value');

          resolve();
        }
      },
    );
  });
};
