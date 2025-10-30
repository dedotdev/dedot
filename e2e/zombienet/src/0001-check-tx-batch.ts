import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, WsProvider } from 'dedot';
import { KitchensinkRuntimeRuntimeCallLike } from 'dedot/chaintypes';
import { assert } from 'dedot/utils';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  // TODO use RococoApi
  const api = await DedotClient.legacy(new WsProvider(wsUri));

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);
  const remarkCall: KitchensinkRuntimeRuntimeCallLike = {
    pallet: 'System',
    palletCall: {
      name: 'RemarkWithEvent',
      params: {
        remark: 'Hello World',
      },
    },
  };

  const batchTx = api.tx.utility.batch([transferTx.call, remarkCall as any]);

  const { events } = await batchTx
    .signAndSend(alice, async ({ status }) => {
      console.log('Transaction status', status.type);
    })
    .untilFinalized();

  assert(api.events.system.ExtrinsicSuccess.find(events), 'Event System.ExtrinsicSuccess should be available');
  assert(api.events.system.Remarked.find(events), 'Event System.Remarked should be available');
  assert(api.events.utility.BatchCompleted.find(events), 'Event Utility.BatchCompleted should be available');
  assert(
    api.events.utility.ItemCompleted.filter(events).length === 2,
    'Event Utility.ItemCompleted should be have 2 records',
  );

  const transferEvent1 = api.events.balances.Transfer.find(events);
  const transferEvent2 = api.events.balances.Transfer.find(events.map((e) => e.event));
  const transferEvents1 = api.events.balances.Transfer.filter(events);
  const transferEvents2 = api.events.balances.Transfer.filter(events.map((e) => e.event));

  assert(transferEvent1, 'Event Balance.Transfer should be available');
  assert(JSON.stringify(transferEvent1) === JSON.stringify(transferEvent2), 'Incorrect transfer event');
  assert(JSON.stringify(transferEvents1) === JSON.stringify(transferEvents2), 'Incorrect transfer events 1');
  assert(JSON.stringify([transferEvent1]) === JSON.stringify(transferEvents1), 'Incorrect transfer events 2');
};
