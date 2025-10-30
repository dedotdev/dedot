import { DedotClient, WsProvider } from 'dedot';
import { assert, waitFor } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  // Test both client types with regular subscription
  console.log('\n=== TESTING REGULAR STORAGE SUBSCRIPTION RECONNECTION ===');
  try {
    console.log('\n--- Testing LegacyClient with regular subscription ---');
    await testStorageSubscription(wsUri, 'legacy');
    console.log('✅ LegacyClient regular subscription test PASSED');
  } catch (error: any) {
    console.error(`❌ LegacyClient regular subscription test FAILED: ${error.message}`);
    throw error;
  }

  try {
    console.log('\n--- Testing V2Client with regular subscription ---');
    await testStorageSubscription(wsUri, 'dedot');
    console.log('✅ V2Client regular subscription test PASSED');
  } catch (error: any) {
    console.error(`❌ V2Client regular subscription test FAILED: ${error.message}`);
    throw error;
  }

  // Test both client types with queryMulti subscription
  console.log('\n=== TESTING QUERYMULTI SUBSCRIPTION RECONNECTION ===');
  try {
    console.log('\n--- Testing LegacyClient with queryMulti subscription ---');
    await testQueryMultiSubscription(wsUri, 'legacy');
    console.log('✅ LegacyClient queryMulti subscription test PASSED');
  } catch (error: any) {
    console.error(`❌ LegacyClient queryMulti subscription test FAILED: ${error.message}`);
    throw error;
  }

  try {
    console.log('\n--- Testing V2Client with queryMulti subscription ---');
    await testQueryMultiSubscription(wsUri, 'dedot');
    console.log('✅ V2Client queryMulti subscription test PASSED');
  } catch (error: any) {
    console.error(`❌ V2Client queryMulti subscription test FAILED: ${error.message}`);
    throw error;
  }
};

async function testStorageSubscription(wsUri: string, clientType: 'legacy' | 'dedot') {
  // Create standard provider
  const provider = new WsProvider(wsUri);

  // Create appropriate client
  const client = clientType === 'legacy'
    ? await DedotClient.new({ provider, rpcVersion: 'legacy' })
    : await DedotClient.new(provider);

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
          // @ts-ignore
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

// New function for testing queryMulti subscription
async function testQueryMultiSubscription(wsUri: string, clientType: 'legacy' | 'dedot') {
  // Create standard provider
  const provider = new WsProvider(wsUri);

  // Create appropriate client
  const client = clientType === 'legacy'
    ? await DedotClient.new({ provider, rpcVersion: 'legacy' })
    : await DedotClient.new(provider);

  // Track subscription updates
  const updates: Array<Array<any>> = [];
  let reconnectionTriggered = false;
  let unsubFn: any;

  // Set up queryMulti subscription to different storage items
  await new Promise<void>(async (resolve, reject) => {
    // Create the subscription
    unsubFn = await client.queryMulti(
      [{ fn: client.query.system.account, args: [ALICE] }, { fn: client.query.system.number }],
      (results) => {
        console.log(`${clientType} received queryMulti update #${updates.length + 1}`);

        updates.push(results);

        // After receiving 3 updates, we'll disrupt the connection
        if (updates.length === 3 && !reconnectionTriggered) {
          reconnectionTriggered = true;

          console.log(`\n${clientType}: Received 3 queryMulti updates, forcing reconnection...`);

          // Force reconnection
          (async () => {
            console.log('Forcing WebSocket reconnection...');
            // @ts-ignore
            provider.__unsafeWs()!.close(1001);

            // Set a timeout to resolve after waiting for more updates
            setTimeout(async () => {
              const updatesAfterReconnection = updates.length - 3;

              console.log(`\n${clientType} queryMulti test results:`);
              console.log(`- Total updates received: ${updates.length}`);
              console.log(`- Updates before reconnection: 3`);
              console.log(`- Updates after reconnection: ${updatesAfterReconnection}`);

              // Clean up subscription only
              await unsubFn();

              if (updatesAfterReconnection > 0) {
                console.log(`- QueryMulti subscription CONTINUED after reconnection`);
                resolve();
              } else {
                reject(
                  new Error(
                    `QueryMulti subscription STOPPED after reconnection - received 0 updates after WebSocket reconnection`,
                  ),
                );
              }
            }, 20000); // Wait 20 seconds for potential updates
          })();
        }
      },
    );
  });

  // Always disconnect the client after the test, regardless of outcome
  await client.disconnect();
}
