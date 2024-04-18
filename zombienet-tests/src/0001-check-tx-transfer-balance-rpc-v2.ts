import { DedotClient } from 'dedot';
import { assert } from '@dedot/utils';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await DedotClient.new(wsUri);

  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log('[json-rpc-v2] BOB - old balance', prevBobBalance);

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);

  return new Promise(async (resolve) => {
    const unsub = await transferTx.signAndSend(alice, async (result) => {
      console.log('[json-rpc-v2] Transaction event', result.status);
      if (result.status.event === 'bestChainBlockIncluded') {
        const newBobBalance = (await api.query.system.account(BOB)).data.free;
        console.log('[json-rpc-v2] BOB - new balance', newBobBalance);
        assert(prevBobBalance + TEN_UNIT === newBobBalance, 'Incorrect BOB balance');

        await unsub();
        resolve();
      }
    });
  });
};
