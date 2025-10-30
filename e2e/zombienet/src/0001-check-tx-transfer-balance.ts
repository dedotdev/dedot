import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { IKeyringPair } from '@dedot/types';
import { DedotClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

const testTransferBalance = async (api: DedotClient, alice: IKeyringPair) => {
  console.log(`[${api.rpcVersion}] Testing transfer balance`);

  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  const prevBlockNumber = await api.query.system.number();
  console.log(`[${api.rpcVersion}] BOB - old balance`, prevBobBalance);

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);

  await transferTx
    .signAndSend(alice, async ({ status }) => {
      console.log(`[${api.rpcVersion}] Transaction status`, status);

      if (status.type === 'Finalized') {
        const newBobBalance = (await api.query.system.account(BOB)).data.free;
        console.log(`[${api.rpcVersion}] BOB - new balance`, newBobBalance);
        assert(prevBobBalance + TEN_UNIT === newBobBalance, 'Incorrect BOB balance');

        const prevBlockHash = await api.query.system.blockHash(prevBlockNumber);
        const prevApiAt = await api.at(prevBlockHash);
        const prevBobBalanceAt = (await prevApiAt.query.system.account(BOB)).data.free;

        console.log(`[${api.rpcVersion}] BOB - old balance verified`, prevBobBalanceAt);
        assert(prevBobBalanceAt === prevBobBalance, `Incorrect BOB balance at previous block ${prevBlockNumber}`);
      }
    })
    .untilFinalized();

  console.log(`[${api.rpcVersion}] Transfer balance tests passed`);
};

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  // Test with legacy client
  console.log('Testing with legacy client');
  const apiLegacy = await DedotClient.legacy(new WsProvider(wsUri));
  await testTransferBalance(apiLegacy, alice);

  // Test with v2 client
  console.log('Testing with v2 client');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await testTransferBalance(apiV2, alice);
};
