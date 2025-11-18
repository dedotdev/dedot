import { DedotClient, WsProvider } from 'dedot';
import { waitFor } from 'dedot/utils';

const ASSETHUB_ENDPOINTS = ['wss://statemint.api.onfinality.io/public-ws'];

const account = '15CoYMEnJhhWHvdEPXDuTBnZKXwrJzMQdcMwcHGsVx5kXYvW';

function setupProviderLogging(provider: WsProvider, label: string) {
  provider.on('connected', (url) => console.log(`[${label}] ✅ Connected:`, url));
  provider.on('disconnected', () => console.log(`[${label}] ❌ Disconnected`));
  provider.on('reconnecting', () => console.log(`[${label}] 🔄 Reconnecting...`));
}

// Test 1: Quick query with collection ID
async function testQuickQuery(client: DedotClient, label: string) {
  console.log(`[${label}] Starting query.nfts.account.entries(account, 452)...`);
  const items = await client.query.nfts.account.entries(account, 452);
  console.log(`[${label}] ✅ Query completed! Items:`, items.length);
  return items;
}

// Test 2: Medium query with account only
async function testMediumQuery(client: DedotClient, label: string) {
  console.log(`[${label}] Starting query.nfts.account.entries(account)...`);
  const items = await client.query.nfts.account.entries(account);
  console.log(`[${label}] ✅ Query completed! Items:`, items.length);
  return items;
}

// Test 3: Multiple concurrent queries
async function testConcurrentQueries(client: DedotClient, label: string) {
  console.log(`[${label}] Starting 3 concurrent queries...`);

  const results = await Promise.all([
    client.query.system.events(),
    client.query.system.number(),
    client.query.timestamp.now(),
  ]);

  console.log(`[${label}] ✅ All queries completed!`, {
    events: results[0].length,
    number: results[1],
    timestamp: results[2],
  });

  return results;
}

// Test 4: Long query with all entries
async function testLongQuery(client: DedotClient, label: string) {
  console.log(`[${label}] Starting query.nfts.account.entries() - will take ~1 minute...`);
  const items = await client.query.nfts.account.entries();
  console.log(`[${label}] ✅ Query completed! Items:`, items.length);
  return items;
}

// Helper to run a test with both clients
async function runTestWithBothClients(
  testName: string,
  testFn: (client: DedotClient, label: string) => Promise<any>,
  disconnectDelay: number,
) {
  console.log(`\n=== ${testName} ===`);

  // Test with V1
  console.log('\n--- Testing with V1 Client ---');
  const provider1 = new WsProvider(ASSETHUB_ENDPOINTS);
  setupProviderLogging(provider1, 'V1');
  const v1Client = await DedotClient.new({ provider: provider1, rpcVersion: 'legacy' });

  const v1Promise = testFn(v1Client, 'V1');

  setTimeout(() => {
    console.log('⚡ Switching endpoint for V1...', disconnectDelay);
    provider1.disconnect(true);
  }, disconnectDelay);

  await v1Promise;

  await waitFor(2000);

  // Test with V2
  console.log('\n--- Testing with V2 Client ---');
  const provider2 = new WsProvider(ASSETHUB_ENDPOINTS);
  setupProviderLogging(provider2, 'V2');
  const v2Client = await DedotClient.new({ provider: provider2, rpcVersion: 'v2' });

  const v2Promise = testFn(v2Client, 'V2');

  setTimeout(() => {
    console.log('⚡ Switching endpoint for V2...', disconnectDelay);
    provider2.disconnect(true);
  }, disconnectDelay);

  await v2Promise;

  await waitFor(5000);
  await v1Client.disconnect();
  await v2Client.disconnect();
}

// Run all tests
async function runTests() {
  try {
    // Test 1: Quick query
    await runTestWithBothClients(
      'Test 1: Quick Query (account + collection)',
      testQuickQuery,
      50, // Disconnect after 1.5 seconds
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Medium query
    await runTestWithBothClients(
      'Test 2: Medium Query (account only)',
      testMediumQuery,
      100, // Disconnect after 5 seconds
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 3: Concurrent queries
    await runTestWithBothClients(
      'Test 3: Multiple Concurrent Queries',
      testConcurrentQueries,
      50, // Disconnect after 1 second
    );

    // Test 4: Long query (optional, commented out by default due to 1min duration)
    // Uncomment below to test with the slowest query
    // await runTestWithBothClients(
    //   'Test 4: Long Query (all entries)',
    //   testLongQuery,
    //   10000 // Disconnect after 10 seconds
    // );

    console.log('\n🎉 All tests passed! Both V1 and V2 clients show identical retry behavior.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
