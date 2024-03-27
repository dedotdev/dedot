import { WsProvider } from '@dedot/providers';
import { assert } from '@dedot/utils';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  const { wsUri: endpoint } = networkInfo.nodesByName[nodeName];

  const provider = new WsProvider(endpoint);

  await provider.untilReady();

  const hash = await provider.send('chain_getBlockHash', [0]);
  assert(typeof hash === 'string', 'Expected a string value');
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
          resolve();
        }
      },
    );
  });
};
