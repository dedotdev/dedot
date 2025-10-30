import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, Transaction, TransactionWatch, TxBroadcaster, WsProvider } from 'dedot';
import { deferred, HexString, stringToHex } from 'dedot/utils';

const prepareRemarkTx = async (api: DedotClient): Promise<{ rawTx: HexString; sender: string }> => {
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
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const client = await DedotClient.legacy(new WsProvider(wsUri));

  const broadcastUntilRemark = async (txBroadcaster: TxBroadcaster) => {
    const defer = deferred<void>();
    if (!(await txBroadcaster.supported())) {
      // @ts-ignore
      console.log(`${txBroadcaster.prefix}-prefixed broadcaster is not supported, skip it!`);
      return defer.resolve();
    }

    const { rawTx, sender: senderAddress } = await prepareRemarkTx(client);

    // @ts-ignore
    console.log(`Broadcasting tx using ${txBroadcaster.prefix}-prefixed broadcaster`);
    const stopBroadcast = await txBroadcaster.broadcastTx(rawTx);

    const unsub = await client.query.system.events((events) => {
      const remarkEvent = client.events.system.Remarked.find(events);

      if (remarkEvent) {
        const { sender, hash } = remarkEvent.palletEvent.data;
        if (sender.address() === senderAddress && client.registry.hashAsHex(stringToHex('Hello world')) === hash) {
          console.log('Remark event found, stop broadcasting now!');
          stopBroadcast();
          unsub();
          defer.resolve();
        }
      }
    });

    return defer.promise;
  };

  return Promise.all([Transaction, TransactionWatch].map((Clazz) => broadcastUntilRemark(new Clazz(client))));
};
