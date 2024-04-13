import { Dedot } from 'dedot';
import { assert } from '@dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

const addressesToCheck: Record<string, string> = { ALICE, BOB };

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await Dedot.new(wsUri);

  for (const name of Object.keys(addressesToCheck)) {
    const address = addressesToCheck[name];
    const balance = await api.query.system.account(address);
    console.log(`${name} balance`, balance);
    assert(balance.data.free === 10_000_000_000_000_000n, `Incorrect balance for ${name} - ${address}`);
  }

  // Check storage map keys
  const keys = await api.query.system.account.keys();
  const addresses = keys.map((k) => k.address());
  console.log(`Total accounts:`, keys.length);
  console.log('Addresses', addresses);

  assert(addresses.includes(ALICE), 'Should include ALICE');
  assert(addresses.includes(BOB), 'Should include BOB');

  // Check storage map entries
  const accounts = await api.query.system.account.entries();

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
};
