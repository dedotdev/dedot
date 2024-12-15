import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { RococoRuntimeRuntimeCallLike } from '@dedot/chaintypes/rococo';
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

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);
  const remarkCall: RococoRuntimeRuntimeCallLike = {
    pallet: 'System',
    palletCall: {
      name: 'RemarkWithEvent',
      params: {
        remark: 'Hello World',
      },
    },
  };

  const batchTx = api.tx.utility.batch([transferTx.call, remarkCall as any]);

  const transferred = new Promise<boolean>((resolve) => {
    api.events.balances.Transfer.watch((events) => {
      console.log('Watched Transfer Events', events);
      resolve(true);
    });
  });

  const batchedPromise = new Promise<void>(async (resolve) => {
    let blockIncluded = false;
    const unsub = await batchTx.signAndSend(alice, async ({ status, txIndex, events }) => {
      console.log('Transaction status', status);

      if (status.type === 'BestChainBlockIncluded') {
        assert(isHex(status.value.blockHash), 'Block hash should be hex');
        assert(isNumber(status.value.blockNumber), 'Block number should be number');
        assert(isNumber(status.value.txIndex), 'Tx index should be number');
        assert(txIndex === status.value.txIndex, 'Mismatched tx index');

        assert(api.events.balances.Transfer.find(events), 'Event Balance.Transfer should be available');
        assert(api.events.system.ExtrinsicSuccess.find(events), 'Event System.ExtrinsicSuccess should be available');
        assert(api.events.system.Remarked.find(events), 'Event System.Remarked should be available');
        assert(api.events.utility.BatchCompleted.find(events), 'Event Utility.BatchCompleted should be available');
        assert(
          api.events.utility.ItemCompleted.filter(events).length === 2,
          'Event Utility.ItemCompleted should be have 2 records',
        );

        blockIncluded = true;
      }

      if (status.type === 'Finalized') {
        assert(isHex(status.value.blockHash), 'Block hash should be hex');
        assert(isNumber(status.value.blockNumber), 'Block number should be number');
        assert(isNumber(status.value.txIndex), 'Tx index should be number');
        assert(txIndex === status.value.txIndex, 'Mismatched tx index');

        assert(blockIncluded, 'Finalized before block included');
        await unsub();
        resolve();
      }
    });
  });

  await batchedPromise;
  assert(await transferred, 'balances.Transfer event should be received');
};
