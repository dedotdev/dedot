import { DedotClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

const addressesToCheck: Record<string, string> = { ALICE, BOB };

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await DedotClient.new(new WsProvider(wsUri));

  const balances = await api.query.system.account.multi([ALICE, BOB]);

  console.log('checkin-1')
  Object.entries(addressesToCheck).forEach(([name, address], idx) => {
    (async () => {
      const balance = await api.query.system.account(address);
      console.log(`${name} balance`, balance);
      assert(balance.data.free === 10_000_000_000_000_000n, `Incorrect balance for ${name} - ${address}`);

      const balanceFromMulti = balances[idx];
      assert(balanceFromMulti.data.free === balance.data.free, `Incorrect balance for ${name} from multi query`);
    })();
  });

  // Check storage map entries
  console.log('checkin-2')
  const accounts = await api.query.system.account.entries();
  const addressToFreeBalance = accounts.reduce(
    (o, [k, v]) => {
      o[k.address()] = v.data.free;
      return o;
    },
    {} as Record<string, bigint>,
  );
  assert(addressToFreeBalance[ALICE] === 10_000_000_000_000_000n, 'Incorrect balance for Alice');
  assert(addressToFreeBalance[BOB] === 10_000_000_000_000_000n, 'Incorrect balance for Alice');

  console.log('checkin-3')
  // Verify empty storage subscription
  const UNKNOWN_ADDRESS: string = '5GL1n2H9fkCc6K6d87L5MV3WkzWnQz4mbb9HMSNk89CpjrMv';
  await new Promise<void>(async (resolve) => {
    await api.query.system.account(UNKNOWN_ADDRESS, (balance) => {
      assert(balance.data.free === 0n, 'Incorrect balance for unknown account');
      assert(balance.nonce === 0, 'Incorrect nonce for unknown account');
      resolve();
    });
  });

  console.log('checkin-4')
  await new Promise<void>(async (resolve, reject) => {
    let counter = 0;
    let lastBlockNumber: number | undefined;

    const unsub = await api.query.system.number(async (blockNumber) => {
      if (lastBlockNumber) {
        assert(blockNumber === lastBlockNumber + 1, 'Block number should be increasing');
      }

      console.log(`Current block number: ${blockNumber}`);

      lastBlockNumber = blockNumber;
      counter += 1;
      if (counter >= 5) {
        await unsub();
        await api.disconnect();
        resolve();
      }
    });
  });
};
