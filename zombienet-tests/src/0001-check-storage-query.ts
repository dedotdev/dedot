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
  assert(keys.length === 2, 'Expected 2 accounts');
  assert(keys[0].address() === ALICE, 'First account should be Alice');
  assert(keys[1].address() === BOB, 'Second account should be Bob');

  // Check storage map entries
  const accounts = await api.query.system.account.entries();
  assert(accounts.length === 2, 'Expected 2 accounts');
  assert(accounts[0][0].address() === ALICE, 'First account should be Alice');
  assert(accounts[0][1].data.free === 10_000_000_000_000_000n, 'Incorrect balance for Alice');

  assert(accounts[1][0].address() === BOB, 'Second account should be Bob');
  assert(accounts[1][1].data.free === 10_000_000_000_000_000n, 'Incorrect balance for Alice');
};
