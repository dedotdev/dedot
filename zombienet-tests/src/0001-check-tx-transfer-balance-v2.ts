import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, WsProvider } from 'dedot';
import { assert, isHex, isNumber } from 'dedot/utils';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  // TODO use RococoApi
  const api = await DedotClient.new(new WsProvider(wsUri));

  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log('BOB - old balance', prevBobBalance);

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);

  let blockIncluded: boolean = false;
  await transferTx
    .signAndSend(alice, async ({ status, txIndex }) => {
      console.log('Transaction status', status.type);
      if (status.type === 'BestChainBlockIncluded') {
        assert(isHex(status.value.blockHash), 'Block hash should be hex');
        assert(isNumber(status.value.blockNumber), 'Block number should be number');
        assert(isNumber(status.value.txIndex), 'Tx index should be number');
        assert(txIndex === status.value.txIndex, 'Mismatched tx index');

        const newBobBalance = (await api.query.system.account(BOB)).data.free;
        console.log('BOB - new balance', newBobBalance);
        assert(prevBobBalance + TEN_UNIT === newBobBalance, 'Incorrect BOB balance');
        blockIncluded = true;
      }

      if (status.type === 'Finalized') {
        assert(isHex(status.value.blockHash), 'Block hash should be hex');
        assert(isNumber(status.value.blockNumber), 'Block number should be number');
        assert(isNumber(status.value.txIndex), 'Tx index should be number');
        assert(txIndex === status.value.txIndex, 'Mismatched tx index');

        assert(blockIncluded, 'Finalized before block included');
      }
    })
    .untilFinalized();
};
