import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { deferred, HexString, stringToHex } from '@dedot/utils';
import { Dedot, Transaction, TransactionWatch, TxBroadcaster } from 'dedot';

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

export const run = async (nodeName: any, networkInfo: any): Promise<any> => {
  const { wsUri: endpoint } = networkInfo.nodesByName[nodeName];

  const api = await Dedot.new(endpoint);

  const broadcastUntilRemark = async (txBroadcaster: TxBroadcaster) => {
    const defer = deferred<void>();
    if (!(await txBroadcaster.supported())) {
      console.log(`${txBroadcaster} broadcaster is not supported, skip it!`);
      return defer.resolve();
    }

    const { rawTx, sender: senderAddress } = await prepareRemarkTx(api);

    const unsub = await txBroadcaster.broadcastTx(rawTx);

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

  return Promise.all([Transaction, TransactionWatch].map((Clazz) => broadcastUntilRemark(new Clazz(api))));
};
