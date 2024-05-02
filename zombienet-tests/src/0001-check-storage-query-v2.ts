import { assert } from '@dedot/utils';
import { DedotClient, WsProvider } from 'dedot';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

const addressesToCheck: Record<string, string> = { ALICE, BOB };

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await DedotClient.new(new WsProvider(wsUri));

  const balances = await api.query.system.account.multi([ALICE, BOB]);

  Object.entries(addressesToCheck).forEach(([name, address], idx) => {
    (async () => {
      const balance = await api.query.system.account(address);
      console.log(`${name} balance`, balance);
      assert(balance.data.free === 10_000_000_000_000_000n, `Incorrect balance for ${name} - ${address}`);

      const balanceFromMulti = balances[idx];
      assert(balanceFromMulti.data.free === balance.data.free, `Incorrect balance for ${name} from multi query`);
    })();
  });

  // @ts-ignore .keys() is not available in the new API
  assert(api.query.system.account['keys'] === undefined, 'Method keys should not be available');

  // Check storage map entries
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
};
