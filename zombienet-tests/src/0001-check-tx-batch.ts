import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { RococoRuntimeRuntimeCallLike } from '@dedot/chaintypes/rococo';
import { WsProvider } from '@dedot/providers';
import { assert } from '@dedot/utils';
import { Dedot } from 'dedot';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  // TODO use RococoApi
  const api = await Dedot.new(new WsProvider(wsUri));

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

  return new Promise(async (resolve) => {
    const unsub = await batchTx.signAndSend(alice, async ({ status, events }) => {
      console.log('Transaction status', status.tag);

      if (status.tag === 'InBlock') {
        assert(
          events.some(({ event }) => api.events.balances.Transfer.is(event)),
          'Event Balance.Transfer should be available',
        );
        assert(
          events.some(({ event }) => api.events.system.ExtrinsicSuccess.is(event)),
          'Event System.ExtrinsicSuccess should be available',
        );
        assert(
          events.some(({ event }) => api.events.system.Remarked.is(event)),
          'Event System.Remarked should be available',
        );
        assert(
          events.some(({ event }) => api.events.utility.BatchCompleted.is(event)),
          'Event Utility.BatchCompleted should be available',
        );
        assert(
          events.filter(({ event }) => api.events.utility.ItemCompleted.is(event)).length === 2,
          'Event Utility.ItemCompleted should be have 2 records',
        );

        await unsub();
        resolve();
      }
    });
  });
};
