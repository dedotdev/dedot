import { LegacyClient, DedotClient, WsProvider } from 'dedot';
import { assert, waitFor } from 'dedot/utils';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  // Test both client types
  console.log('\n=== TESTING STORAGE SUBSCRIPTION RECONNECTION ===');

  try {
    console.log('\n--- Testing LegacyClient ---');
    await testStorageSubscription(wsUri, 'legacy');
    console.log('✅ LegacyClient test PASSED: Subscription continued after reconnection');
  } catch (error: any) {
    console.error(`❌ LegacyClient test FAILED: ${error.message}`);
    throw error;
  }

  try {
    console.log('\n--- Testing DedotClient ---');
    await testStorageSubscription(wsUri, 'dedot');
    console.log('✅ DedotClient test PASSED: Subscription continued after reconnection');
  } catch (error: any) {
    console.error(`❌ DedotClient test FAILED: ${error.message}`);
    throw error;
  }
};

async function testStorageSubscription(wsUri: string, clientType: 'legacy' | 'dedot') {
  // Create standard provider
  const provider = new WsProvider(wsUri);

  // Create appropriate client
  const client = clientType === 'legacy' ? await LegacyClient.new(provider) : await DedotClient.new(provider);

  // Track subscription updates
  const updates: number[] = [];
  let reconnectionTriggered = false;
  let unsubFn: any;

  // Set up subscription to block number
  await new Promise<void>(async (resolve, reject) => {
    // Create the subscription
    unsubFn = await client.query.system.number((blockNumber: number) => {
      console.log(`${clientType} received block #${blockNumber}`);

      updates.push(blockNumber);

      // After receiving 3 updates, we'll disrupt the connection
      if (updates.length === 3 && !reconnectionTriggered) {
        reconnectionTriggered = true;

        console.log(`\n${clientType}: Received 3 updates, forcing reconnection...`);

        // Force reconnection
        (async () => {
          console.log('Forcing WebSocket reconnection...');
          provider.__unsafeWs()!.close(1001);

          // Set a timeout to resolve after waiting for more updates
          setTimeout(async () => {
            const updatesAfterReconnection = updates.length - 3;

            console.log(`\n${clientType} test results:`);
            console.log(`- Total updates received: ${updates.length}`);
            console.log(`- Updates before reconnection: 3`);
            console.log(`- Updates after reconnection: ${updatesAfterReconnection}`);

            // Clean up subscription only
            await unsubFn();

            if (updatesAfterReconnection > 0) {
              console.log(`- Subscription CONTINUED after reconnection`);
              resolve();
            } else {
              reject(
                new Error(`Subscription STOPPED after reconnection - received 0 updates after WebSocket reconnection`),
              );
            }
          }, 20000); // Wait 20 seconds for potential updates
        })();
      }
    });
  });
  // Always disconnect the client after the test, regardless of outcome
  await client.disconnect();
}
