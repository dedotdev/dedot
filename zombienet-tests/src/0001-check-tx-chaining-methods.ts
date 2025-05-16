import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { IKeyringPair } from '@dedot/types';
import { DedotClient, LegacyClient, WsProvider } from 'dedot';
import { assert, isHex, isNumber } from 'dedot/utils';

const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const TRANSFER_AMOUNT = BigInt(10 * 1e12); // 10 units

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  // Test with LegacyClient
  console.log('Testing chaining methods with LegacyClient');
  await testChainingMethods(LegacyClient, wsUri, alice);

  // Test with DedotClient
  console.log('Testing chaining methods with DedotClient');
  await testChainingMethods(DedotClient, wsUri, alice);
};

async function testChainingMethods(ClientClass: typeof LegacyClient | typeof DedotClient, wsUri: string, alice: any) {
  const api = await ClientClass.new(new WsProvider(wsUri));

  // Test 1: untilBestChainBlockIncluded
  console.log('Testing untilBestChainBlockIncluded');
  await testUntilBestChainBlockIncluded(api, alice);

  // Test 2: untilFinalized
  console.log('Testing untilFinalized');
  await testUntilFinalized(api, alice);

  // Test 3: Compare both methods (should receive BestChainBlockIncluded before Finalized)
  console.log('Testing order of events');
  await testEventOrder(api, alice);

  // Test 4: Check return types of send and signAndSend methods
  console.log('Testing send and signAndSend return types');
  await testSendAndSignAndSendReturnTypes(api, alice);
}

async function testUntilBestChainBlockIncluded(api: LegacyClient | DedotClient, alice: IKeyringPair) {
  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log('BOB - initial balance:', prevBobBalance.toString());

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TRANSFER_AMOUNT);

  // Use untilBestChainBlockIncluded to wait for the transaction to be included in a block
  const result = await transferTx
    .signAndSend(alice) // --
    .untilBestChainBlockIncluded();

  // Verify the result contains the expected status
  assert(result.status.type === 'BestChainBlockIncluded', 'Status should be BestChainBlockIncluded');
  assert(isHex(result.status.value.blockHash), 'Block hash should be hex');
  assert(isNumber(result.status.value.blockNumber), 'Block number should be number');
  assert(isNumber(result.status.value.txIndex), 'Tx index should be number');

  // Verify the transaction was successful by checking Bob's balance
  const newBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log('BOB - new balance after untilBestChainBlockIncluded:', newBobBalance.toString());
  assert(prevBobBalance + TRANSFER_AMOUNT === newBobBalance, 'Incorrect BOB balance after transfer');

  console.log('untilBestChainBlockIncluded test passed');
}

async function testUntilFinalized(api: LegacyClient | DedotClient, alice: IKeyringPair) {
  const prevBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log('BOB - initial balance:', prevBobBalance.toString());

  const transferTx = api.tx.balances.transferKeepAlive(BOB, TRANSFER_AMOUNT);

  // Use untilFinalized to wait for the transaction to be finalized
  const result = await transferTx // --
    .signAndSend(alice)
    .untilFinalized();

  // Verify the result contains the expected status
  assert(result.status.type === 'Finalized', 'Status should be Finalized');
  assert(isHex(result.status.value.blockHash), 'Block hash should be hex');
  assert(isNumber(result.status.value.blockNumber), 'Block number should be number');
  assert(isNumber(result.status.value.txIndex), 'Tx index should be number');

  // Verify the transaction was successful by checking Bob's balance
  const newBobBalance = (await api.query.system.account(BOB)).data.free;
  console.log('BOB - new balance after untilFinalized:', newBobBalance.toString());
  assert(prevBobBalance + TRANSFER_AMOUNT === newBobBalance, 'Incorrect BOB balance after transfer');

  console.log('untilFinalized test passed');
}

async function testEventOrder(api: LegacyClient | DedotClient, alice: any) {
  const transferTx = api.tx.balances.transferKeepAlive(BOB, TRANSFER_AMOUNT);

  // Track the order of events
  let bestChainBlockIncludedReceived = false;
  let finalizedReceived = false;
  let bestChainBlockIncludedTime = 0;
  let finalizedTime = 0;

  // Send the transaction and track status updates
  await new Promise<void>((resolve) => {
    transferTx.signAndSend(alice, ({ status }: any) => {
      if (status.type === 'BestChainBlockIncluded') {
        bestChainBlockIncludedReceived = true;
        bestChainBlockIncludedTime = Date.now();
        console.log('Received BestChainBlockIncluded status at:', bestChainBlockIncludedTime);
      } else if (status.type === 'Finalized') {
        finalizedReceived = true;
        finalizedTime = Date.now();
        console.log('Received Finalized status at:', finalizedTime);
        resolve();
      }
    });
  });

  // Verify both statuses were received and in the correct order
  assert(bestChainBlockIncludedReceived, 'BestChainBlockIncluded status should be received');
  assert(finalizedReceived, 'Finalized status should be received');
  assert(bestChainBlockIncludedTime < finalizedTime, 'BestChainBlockIncluded should be received before Finalized');

  console.log('Event order test passed');
}

async function testSendAndSignAndSendReturnTypes(api: LegacyClient | DedotClient, alice: IKeyringPair) {
  // Test 1: send() without callback should return a hash
  console.log('Testing send() without callback');
  const tx1 = api.tx.system.remark('Hello World');
  await tx1.sign(alice);
  const result1 = await tx1.send();

  assert(isHex(result1), 'send() without callback should return a hex hash');
  console.log('send() without callback test passed');

  // Test 2: send() with callback should return an unsubscribe object/function
  console.log('Testing send() with callback');
  const tx2 = api.tx.system.remark('Hello World');
  await tx2.sign(alice);

  const result2 = await tx2.send(() => {});
  // Check that it's not a hash (which would be a hex string)
  assert(typeof result2 === 'function', 'send() with callback should return a function');
  console.log('send() with callback test passed');

  // Test 3: signAndSend() without callback should return a hash
  console.log('Testing signAndSend() without callback');
  const tx3 = api.tx.system.remark('Hello World');
  await tx3.sign(alice);
  const result3 = await tx3.signAndSend(alice);

  assert(isHex(result3), 'signAndSend() without callback should return a hex hash');
  console.log('signAndSend() without callback test passed');

  // Test 4: signAndSend() with callback should return an unsubscribe object/function
  console.log('Testing signAndSend() with callback');
  const tx4 = api.tx.system.remark('Hello World');
  await tx4.sign(alice);

  const result4 = await tx4.signAndSend(alice, () => {});
  assert(typeof result4 === 'function', 'signAndSend() with callback should return a function');

  console.log('signAndSend() with callback test passed');
  console.log('All send and signAndSend return type tests passed');
}
