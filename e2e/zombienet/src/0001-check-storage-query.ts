import { DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

const addressesToCheck: Record<string, string> = { ALICE, BOB };

const testStorageQuery = async (api: ISubstrateClient) => {
  console.log(`[${api.rpcVersion}] Testing storage query`);

  const balances = await api.query.system.account.multi([ALICE, BOB]);

  Object.entries(addressesToCheck).forEach(([name, address], idx) => {
    (async () => {
      const balance = await api.query.system.account(address);
      console.log(`[${api.rpcVersion}] ${name} balance`, balance);
      assert(balance.data.free === 10_000_000_000_000_000n, `Incorrect balance for ${name} - ${address}`);

      const balanceFromMulti = balances[idx];
      assert(balanceFromMulti.data.free === balance.data.free, `Incorrect balance for ${name} from multi query`);
    })();
  });

  // Check storage map keys
  const keys = await api.query.system.account.pagedKeys();
  const addresses = keys.map((k) => k.address());
  console.log(`[${api.rpcVersion}] Total accounts:`, keys.length);
  console.log(`[${api.rpcVersion}] Addresses`, addresses);

  assert(addresses.includes(ALICE), 'Should include ALICE');
  assert(addresses.includes(BOB), 'Should include BOB');

  // Check storage map entries
  const accounts = await api.query.system.account.pagedEntries();

  assert(keys.length === accounts.length, 'Mismatch # of storage items');

  const addressToFreeBalance = accounts.reduce(
    (o, [k, v]) => {
      o[k.address()] = v.data.free;
      return o;
    },
    {} as Record<string, bigint>,
  );
  assert(addressToFreeBalance[ALICE] === 10_000_000_000_000_000n, 'Incorrect balance for Alice');
  assert(addressToFreeBalance[BOB] === 10_000_000_000_000_000n, 'Incorrect balance for Alice');

  // Verify empty storage subscription
  const UNKNOWN_ADDRESS: string = '5GL1n2H9fkCc6K6d87L5MV3WkzWnQz4mbb9HMSNk89CpjrMv';
  await new Promise<void>(async (resolve) => {
    await api.query.system.account(UNKNOWN_ADDRESS, (balance) => {
      assert(balance.data.free === 0n, 'Incorrect balance for unknown account');
      assert(balance.nonce === 0, 'Incorrect nonce for unknown account');
      resolve();
    });
  });

  console.log(`[${api.rpcVersion}] Storage query tests passed`);
};

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  // Test with legacy client
  console.log('Testing with legacy client');
  const apiLegacy = await DedotClient.legacy(new WsProvider(wsUri));
  await testStorageQuery(apiLegacy);
};
