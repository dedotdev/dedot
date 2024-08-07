import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, Transaction, TransactionWatch, TxBroadcaster, WsProvider } from 'dedot';
import { deferred, HexString, stringToHex } from 'dedot/utils';

const prepareRemarkTx = async (api: LegacyClient): Promise<{ rawTx: HexString; sender: string }> => {
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

  const api = await LegacyClient.new(new WsProvider(wsUri));

  const broadcastUntilRemark = async (txBroadcaster: TxBroadcaster) => {
    const defer = deferred<void>();
    if (!(await txBroadcaster.supported())) {
      // @ts-ignore
      console.log(`${txBroadcaster.prefix}-prefixed broadcaster is not supported, skip it!`);
      return defer.resolve();
    }

    const { rawTx, sender: senderAddress } = await prepareRemarkTx(api);

    // @ts-ignore
    console.log(`Broadcasting tx using ${txBroadcaster.prefix}-prefixed broadcaster`);
    const stopBroadcast = await txBroadcaster.broadcastTx(rawTx);

    const unsub = await api.query.system.events((events) => {
      const remarkEvent = api.events.system.Remarked.find(events);

      if (remarkEvent) {
        const { sender, hash } = remarkEvent.palletEvent.data;
        if (sender.address() === senderAddress && api.registry.hashAsHex(stringToHex('Hello world')) === hash) {
          console.log('Remark event found, stop broadcasting now!');
          stopBroadcast();
          unsub();
          defer.resolve();
        }
      }
    });

    return defer.promise;
  };

  return Promise.all([Transaction, TransactionWatch].map((Clazz) => broadcastUntilRemark(new Clazz(api))));
};
