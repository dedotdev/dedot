import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { IKeyringPair } from '@dedot/types';
import { DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { assert, isHex, isNumber } from 'dedot/utils';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

const testTransferBalance = async (api: ISubstrateClient, alice: IKeyringPair) => {
  console.log(`[${api.rpcVersion}] Testing transfer balance with status updates`);

  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log(`[${api.rpcVersion}] BOB - old balance`, prevBobBalance);

  const TEN_UNIT = BigInt(10 * 1e12);

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TEN_UNIT);

  let blockIncluded: boolean = false;
  await transferTx
    .signAndSend(alice, async ({ status, txIndex }) => {
      console.log(`[${api.rpcVersion}] Transaction status`, status.type);
      if (status.type === 'BestChainBlockIncluded') {
        assert(isHex(status.value.blockHash), 'Block hash should be hex');
        assert(isNumber(status.value.blockNumber), 'Block number should be number');
        assert(isNumber(status.value.txIndex), 'Tx index should be number');
        assert(txIndex === status.value.txIndex, 'Mismatched tx index');

        const newBobBalance = (await api.query.system.account(BOB)).data.free;
        console.log(`[${api.rpcVersion}] BOB - new balance`, newBobBalance);
        assert(prevBobBalance + TEN_UNIT === newBobBalance, 'Incorrect BOB balance');
        blockIncluded = true;
      }

      if (status.type === 'Finalized') {
        assert(isHex(status.value.blockHash), 'Block hash should be hex');
        assert(isNumber(status.value.blockNumber), 'Block number should be number');
        assert(isNumber(status.value.txIndex), 'Tx index should be number');
        assert(txIndex === status.value.txIndex, 'Mismatched tx index');

        assert(blockIncluded, 'Finalized before block included');
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
  const apiLegacy = await DedotClient.new({ provider: new WsProvider(wsUri), rpcVersion: 'legacy' });
  await testTransferBalance(apiLegacy, alice);

  // Test with v2 client
  console.log('Testing with v2 client');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await testTransferBalance(apiV2, alice);
};
