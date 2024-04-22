import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { deferred, HexString, stringToHex } from '@dedot/utils';
import { Dedot, Transaction, TransactionWatch } from 'dedot';

const prepareRemarkTx = async (api: Dedot): Promise<{ rawTx: HexString; sender: string }> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const remarkTx = api.tx.system.remarkWithEvent('Hello world');
  await remarkTx.sign(alice);

  return {
    rawTx: remarkTx.toHex(),
    sender: alice.address,
  };
};

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  const { wsUri: endpoint } = networkInfo.nodesByName[nodeName];

  const api = await Dedot.new(endpoint);

  const getTxBroadcaster = async () => {
    const transaction = new Transaction(api);
    if (await transaction.supported()) return transaction;

    const txWatch = new TransactionWatch(api);
    if (await txWatch.supported()) return txWatch;

    throw new Error('Transaction broadcaster not supported');
  };
  const txBroadcaster = await getTxBroadcaster();

  const { rawTx, sender: senderAddress } = await prepareRemarkTx(api);

  const unsub = await txBroadcaster.broadcastTx(rawTx);

  const defer = deferred<void>();

  await api.query.system.events((events) => {
    events.forEach(({ event }) => {
      if (api.events.system.Remarked.is(event)) {
        const { sender, hash } = event.palletEvent.data;
        if (sender.address() === senderAddress && api.registry.hashAsHex(stringToHex('Hello world')) === hash) {
          console.log('Remark event found, stop broadcasting now!');
          unsub();
          defer.resolve();
        }
      }
    });
  });

  return defer.promise;
};
