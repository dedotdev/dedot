import { DedotClient, LegacyClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';
import { Callback, Unsub } from '@dedot/types';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const CHARLIE = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];
  
  // Test with DedotClient (v2 API)
  console.log('Testing multiQuery with DedotClient (v2 API)');
  await testWithDedotClient(wsUri);
  
  // Test with LegacyClient
  console.log('Testing multiQuery with LegacyClient');
  await testWithLegacyClient(wsUri);
  
  console.log('All multiQuery tests passed!');
};

async function testWithDedotClient(wsUri: string) {
  const client = await DedotClient.new(new WsProvider(wsUri));
  
  try {
    // Test one-time queries
    await testOneTimeQueries(client);
    
    // Test subscription-based queries
    await testSubscriptionQueries(client);
  } finally {
    await client.disconnect();
  }
}

async function testWithLegacyClient(wsUri: string) {
  const client = await LegacyClient.new(new WsProvider(wsUri));
  
  try {
    // Test one-time queries
    await testOneTimeQueries(client);
    
    // Test subscription-based queries
    await testSubscriptionQueries(client);
  } finally {
    await client.disconnect();
  }
}

async function testOneTimeQueries(client: DedotClient | LegacyClient) {
  console.log('Testing one-time multiQuery...');
  
  // Test 1: Query multiple account balances
  const queries = [
    { fn: client.query.system.account, args: [ALICE] },
    { fn: client.query.system.account, args: [BOB] }
  ];
  
  // Execute multiQuery
  const multiResults = await client.multiQuery(queries) as any[];
  
  // Execute individual queries for comparison
  const aliceAccount = await client.query.system.account(ALICE);
  const bobAccount = await client.query.system.account(BOB);
  
  // Verify results match individual queries
  assert(multiResults[0].data.free === aliceAccount.data.free, 
    `multiQuery result for Alice doesn't match individual query`);
  assert(multiResults[1].data.free === bobAccount.data.free, 
    `multiQuery result for Bob doesn't match individual query`);
  
  console.log('Alice balance:', multiResults[0].data.free.toString());
  console.log('Bob balance:', multiResults[1].data.free.toString());
  
  // Test 2: Query different types of storage items
  const mixedQueries = [
    { fn: client.query.system.account, args: [ALICE] },
    { fn: client.query.system.number, args: [] }
  ];
  
  const mixedResults = await client.multiQuery(mixedQueries) as any[];
  const blockNumber = await client.query.system.number();
  
  assert(mixedResults[0].data.free === aliceAccount.data.free, 
    `multiQuery result for Alice doesn't match in mixed query`);
  assert(mixedResults[1] === blockNumber, 
    `multiQuery result for block number doesn't match individual query`);
  
  console.log('Block number:', mixedResults[1].toString());
  
  // Test 3: Empty query array
  const emptyResults = await client.multiQuery([]) as any[];
  assert(emptyResults.length === 0, `Empty query should return empty array`);
  
  console.log('One-time multiQuery tests passed!');
}

async function testSubscriptionQueries(client: DedotClient | LegacyClient) {
  console.log('Testing subscription-based multiQuery...');
  
  // Test 1: Subscribe to multiple account balances
  const queries = [
    { fn: client.query.system.account, args: [ALICE] },
    { fn: client.query.system.account, args: [BOB] }
  ];
  
  // Set up a promise to track subscription updates
  const subscriptionPromise = new Promise<void>((resolve) => {
    let updateCount = 0;
    
    // Create a callback function
    const callback: Callback<any[]> = (results) => {
      updateCount++;
      console.log(`Received subscription update #${updateCount}`);
      
      // Verify the structure of the results
      assert(results.length === 2, `Should receive 2 results in subscription update`);
      assert(typeof results[0].data.free === 'bigint', `First result should have free balance`);
      assert(typeof results[1].data.free === 'bigint', `Second result should have free balance`);
      
      // After receiving at least one update, resolve the promise
      if (updateCount >= 1) {
        setTimeout(() => {
          resolve();
        }, 100);
      }
    };
    
    // Call multiQuery with the callback
    client.multiQuery(queries, callback).then((unsubFn) => {
      // Store the unsubscribe function for later use
      const unsubscribe = unsubFn as Unsub;
      
      // Set up cleanup after we've received at least one update
      const checkInterval = setInterval(() => {
        if (updateCount >= 1) {
          clearInterval(checkInterval);
          unsubscribe().then(() => {
            console.log('Unsubscribed successfully');
          });
        }
      }, 100);
    });
  });
  
  // Wait for the subscription to receive updates
  await subscriptionPromise;
  
  // Test 2: Subscribe to block number
  await new Promise<void>((resolve) => {
    let lastBlockNumber: number | undefined;
    let updateCount = 0;
    let unsubscribe: Unsub | null = null;
    
    // Create a callback function
    const callback: Callback<any[]> = (results) => {
      const blockNumber = results[0];
      updateCount++;
      
      console.log(`Current block number: ${blockNumber}`);
      
      if (lastBlockNumber !== undefined) {
        // Block number should be increasing
        assert(blockNumber > lastBlockNumber, 'Block number should be increasing');
      }
      
      lastBlockNumber = blockNumber;
      
      // After receiving a few updates, unsubscribe and resolve
      if (updateCount >= 3 && unsubscribe) {
        unsubscribe().then(() => resolve());
      }
    };
    
    // Call multiQuery with the callback
    client.multiQuery(
      [{ fn: client.query.system.number, args: [] }],
      callback
    ).then((unsubFn) => {
      unsubscribe = unsubFn as Unsub;
    });
  });
  
  // Test 3: Subscribe to empty storage
  const UNKNOWN_ADDRESS = '5GL1n2H9fkCc6K6d87L5MV3WkzWnQz4mbb9HMSNk89CpjrMv';
  
  await new Promise<void>((resolve) => {
    let unsubscribe: Unsub | null = null;
    
    // Create a callback function
    const callback: Callback<any[]> = (results) => {
      const unknownAccount = results[0];
      
      assert(unknownAccount.data.free === 0n, 'Incorrect balance for unknown account');
      assert(unknownAccount.nonce === 0, 'Incorrect nonce for unknown account');
      
      if (unsubscribe) {
        unsubscribe().then(() => resolve());
      }
    };
    
    // Call multiQuery with the callback
    client.multiQuery(
      [{ fn: client.query.system.account, args: [UNKNOWN_ADDRESS] }],
      callback
    ).then((unsubFn) => {
      unsubscribe = unsubFn as Unsub;
    });
  });
  
  console.log('Subscription-based multiQuery tests passed!');
}
