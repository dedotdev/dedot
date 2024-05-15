import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { WsProvider } from '@dedot/providers';
import { assert } from '@dedot/utils';
import { DedotClient } from 'dedot';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await DedotClient.new(new WsProvider(wsUri));

  let finalizedTx = 0;
  let invalidTx = 0;

  await Promise.all(
    [...Array(4)].map(() => {
      return new Promise<void>((resolve) => {
        api.tx.system.remarkWithEvent('Hello World').signAndSend(alice, ({ status }) => {
          if (status.tag === 'Finalized') {
            finalizedTx += 1;
            resolve();
          } else if (status.tag === 'Invalid') {
            invalidTx += 1;
            assert(status.value.error === `Invalid Tx: Invalid - Stale`, 'Wrong invalid message');
            resolve();
          }
        });
      });
    }),
  );

  console.log('Finalized Tx:', finalizedTx);
  console.log('Invalid Tx:', invalidTx);

  assert(finalizedTx === 1, 'Finalized Tx should be 1');
  assert(invalidTx === 3, 'Invalid Tx should be 3');
};
