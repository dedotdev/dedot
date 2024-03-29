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
};
