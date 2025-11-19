import { DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const CHARLIE = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  try {
    // Test with V2Client (v2 API)
    console.log('Testing queryMulti with V2Client (v2 API)');
    await testWithV2Client(wsUri);

    // Test with LegacyClient
    console.log('Testing queryMulti with LegacyClient');
    await testWithLegacyClient(wsUri);

    console.log('All queryMulti tests passed!');
  } catch (e) {
    console.log(e);
    throw e;
  }
};

async function testWithV2Client(wsUri: string) {
  const client = await DedotClient.new(new WsProvider(wsUri));

  // Test one-time queries
  await testOneTimeQueries(client);

  // Test subscription-based queries
  await testSubscriptionQueries(client);

  await client.disconnect();
}

async function testWithLegacyClient(wsUri: string) {
  const client = await DedotClient.legacy(new WsProvider(wsUri));

  // Test one-time queries
  await testOneTimeQueries(client);

  // Test subscription-based queries
  await testSubscriptionQueries(client);

  await client.disconnect();
}

async function testOneTimeQueries(client: ISubstrateClient) {
  console.log('Testing one-time queryMulti...');

  // Execute queryMulti
  const multiResults = await client.queryMulti([
    { fn: client.query.system.account, args: [ALICE] },
    { fn: client.query.system.account, args: [BOB] },
  ]);

  // Execute individual queries for comparison
  const aliceAccount = await client.query.system.account(ALICE);
  const bobAccount = await client.query.system.account(BOB);

  // Verify results match individual queries
  assert(
    multiResults[0].data.free === aliceAccount.data.free,
    `queryMulti result for Alice doesn't match individual query`,
  );
  assert(
    multiResults[1].data.free === bobAccount.data.free,
    `queryMulti result for Bob doesn't match individual query`,
  );

  console.log('Alice balance:', multiResults[0].data.free.toString());
  console.log('Bob balance:', multiResults[1].data.free.toString());

  // Test 2: Query different types of storage items
  const [mixedResults, blockNumber] = await Promise.all([
    client.queryMulti([{ fn: client.query.system.account, args: [ALICE] }, { fn: client.query.system.number }]),
    client.query.system.number(),
  ]);

  assert(
    mixedResults[0].data.free === aliceAccount.data.free,
    `queryMulti result for Alice doesn't match in mixed query`,
  );
  assert(mixedResults[1] === blockNumber, `queryMulti result for block number doesn't match individual query`);

  console.log('Block number:', mixedResults[1].toString());

  // Test 3: Empty query array
  const emptyResults = await client.queryMulti([]);
  assert(emptyResults.length === 0, `Empty query should return empty array`);

  console.log('One-time queryMulti tests passed!');
}

async function testSubscriptionQueries(client: ISubstrateClient) {
  console.log('Testing subscription-based queryMulti...');

  // Set up a promise to track subscription updates
  await new Promise<void>((resolve) => {
    let updateCount = 0;

    client.queryMulti(
      [
        { fn: client.query.system.account, args: [ALICE] },
        { fn: client.query.system.account, args: [BOB] },
      ],
      (results) => {
        updateCount++;
        console.log(`Received subscription update #${updateCount}`);

        // Verify the structure of the results
        assert(results.length === 2, `Should receive 2 results in subscription update`);
        assert(typeof results[0].data.free === 'bigint', `First result should have free balance`);
        assert(typeof results[1].data.free === 'bigint', `Second result should have free balance`);

        // After receiving at least one update, resolve the promise
        if (updateCount >= 1) {
          resolve();
        }
      },
    );
  });

  // Test 2: Subscribe to block number
  await new Promise<void>((resolve, reject) => {
    let counter = 0;
    let lastBlockNumber: number | undefined;

    client.queryMulti([{ fn: client.query.system.number }], ([blockNumber]) => {
      if (lastBlockNumber !== undefined && counter >= 3) {
        if (blockNumber > lastBlockNumber) {
          return resolve();
        } else {
          return reject('Block number should be increasing');
        }
      }

      console.log(`Current block number: ${blockNumber}`);

      lastBlockNumber = blockNumber;
      counter += 1;
    });
  });

  // Test 3: Subscribe to empty storage
  const UNKNOWN_ADDRESS = '5GL1n2H9fkCc6K6d87L5MV3WkzWnQz4mbb9HMSNk89CpjrMv';

  await new Promise<void>((resolve) => {
    client.queryMulti([{ fn: client.query.system.account, args: [UNKNOWN_ADDRESS] }], ([unknownAccount]) => {
      assert(unknownAccount.data.free === 0n, 'Incorrect balance for unknown account');
      assert(unknownAccount.nonce === 0, 'Incorrect nonce for unknown account');

      // Resolve after verifying the empty storage
      resolve();
    });
  });

  // Test 4: Test unsubscribe functionality
  console.log('Testing queryMulti unsubscribe functionality...');
  await new Promise<void>(async (resolve) => {
    let updateCount = 0;
    let unsubCalled = false;

    // Create a subscription and store the unsubscribe function
    const unsub = await client.queryMulti([{ fn: client.query.system.number }], (results) => {
      console.log(`Block number update: ${results[0]}`);
      updateCount++;

      // If we've seen updates but haven't unsubscribed yet, do it now
      if (updateCount >= 2 && !unsubCalled) {
        console.log('Calling unsubscribe function...');
        unsubCalled = true;

        // Call the unsubscribe function
        unsub().then(() => {
          console.log('Unsubscribed successfully');
          resolve();
        });
      }
    });
  });

  console.log('Subscription-based queryMulti tests passed!');
}
