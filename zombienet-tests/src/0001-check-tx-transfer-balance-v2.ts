import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { RococoApi } from '@dedot/chaintypes';
import { TransactionStatusV2 } from '@dedot/types';
import { assert, isHex, isNumber } from '@dedot/utils';
import { Dedot, DedotClient } from 'dedot';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  // TODO use RococoApi
  const api = await DedotClient.new(wsUri);

  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log('BOB - old balance', prevBobBalance);

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);

  return new Promise(async (resolve) => {
    let blockIncluded: boolean = false;
    const unsub = await transferTx.signAndSend(alice, async ({ status, txIndex }) => {
      console.log('Transaction status', status.tag);
      if (status.tag === 'BestChainBlockIncluded') {
        assert(isHex(status.value!.hash), 'Block hash should be hex');
        assert(isNumber(status.value!.index), 'Tx index should be number');
        assert(txIndex === status.value!.index, 'Mismatched tx index');

        const newBobBalance = (await api.query.system.account(BOB)).data.free;
        console.log('BOB - new balance', newBobBalance);
        assert(prevBobBalance + TEN_UNIT === newBobBalance, 'Incorrect BOB balance');
        blockIncluded = true;
      }

      if (status.tag === 'Finalized') {
        assert(isHex(status.value.hash), 'Block hash should be hex');
        assert(isNumber(status.value.index), 'Tx index should be number');
        assert(txIndex === status.value.index, 'Mismatched tx index');

        assert(blockIncluded, 'Finalized before block included');
        await unsub();
        resolve();
      }
    });
  });
};
