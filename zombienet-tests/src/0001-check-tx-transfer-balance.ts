import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { RococoApi } from '@dedot/chaintypes';
import { assert } from '@dedot/utils';
import { Dedot, WsProvider } from 'dedot';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  // TODO use RococoApi
  const api = await Dedot.new(new WsProvider(wsUri));

  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  const prevBlockNumber = await api.query.system.number();
  console.log('BOB - old balance', prevBobBalance);

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);

  return new Promise(async (resolve) => {
    const unsub = await transferTx.signAndSend(alice, async (result) => {
      console.log('Transaction status', result.status.tag);
      if (result.status.tag === 'InBlock') {
        const newBobBalance = (await api.query.system.account(BOB)).data.free;
        console.log('BOB - new balance', newBobBalance);
        assert(prevBobBalance + TEN_UNIT === newBobBalance, 'Incorrect BOB balance');

        const prevBlockHash = await api.query.system.blockHash(prevBlockNumber);
        const prevApiAt = await api.at(prevBlockHash);
        const prevBobBalanceAt = (await prevApiAt.query.system.account(BOB)).data.free;

        console.log('BOB - old balance verified', prevBobBalanceAt);
        assert(prevBobBalanceAt === prevBobBalance, `Incorrect BOB balance at previous block ${prevBlockNumber}`);

        await unsub();
        resolve();
      }
    });
  });
};
