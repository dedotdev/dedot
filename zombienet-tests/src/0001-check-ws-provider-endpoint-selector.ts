import { WsProvider, WsEndpointSelector, WsConnectionState } from 'dedot';
import { assert, isHex, isNumber } from 'dedot/utils';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  console.log('Testing WsProvider EndpointSelector with nodes:', nodeName);
  console.log(
    'Available relay nodes:',
    networkInfo.relay.map((node: any) => ({ name: node.name, wsUri: node.wsUri })),
  );

  // Extract the two relay node URLs
  const aliceUrl = networkInfo.relay.find((node: any) => node.name === 'alice')?.wsUri;
  const bobUrl = networkInfo.relay.find((node: any) => node.name === 'bob')?.wsUri;

  assert(aliceUrl, 'Alice node URL not found');
  assert(bobUrl, 'Bob node URL not found');

  console.log('Alice URL:', aliceUrl);
  console.log('Bob URL:', bobUrl);

  // Test 1: Basic endpoint selector functionality
  console.log('\n=== Test 1: Basic Endpoint Selector Functionality ===');

  const selectorCalls: WsConnectionState[] = [];
  const basicSelector: WsEndpointSelector = (info: WsConnectionState) => {
    console.log('Endpoint selector called with:', info);
    selectorCalls.push({ ...info });
    return aliceUrl; // Always return alice URL for this test
  };

  const provider1 = new WsProvider({ endpoint: basicSelector });

  await provider1.connect();

  // Verify selector was called with correct initial state
  assert(selectorCalls.length === 1, 'Selector should be called exactly once');
  assert(selectorCalls[0].attempt === 1, 'Initial attempt should be 1');
  assert(selectorCalls[0].currentEndpoint === undefined, 'Initial currentEndpoint should be undefined');

  // Test basic RPC functionality
  const genesisHash = await provider1.send('chain_getBlockHash', [0]);
  assert(isHex(genesisHash), 'Expected genesis hash to be a hex string');
  console.log('Genesis hash from alice:', genesisHash);

  await provider1.disconnect();

  // Test 2: Fallback mechanism with connection failure simulation
  console.log('\n=== Test 2: Fallback Mechanism Testing ===');

  const fallbackCalls: WsConnectionState[] = [];
  let callCount = 0;

  const fallbackSelector: WsEndpointSelector = (info: WsConnectionState) => {
    console.log('Fallback selector called with:', info);
    fallbackCalls.push({ ...info });
    callCount++;

    if (callCount === 1) {
      // First call: return an invalid URL to simulate connection failure
      return 'ws://127.0.0.1:99999'; // Invalid port to force failure
    } else {
      // Subsequent calls: return bob's URL as fallback
      return bobUrl;
    }
  };

  const provider2 = new WsProvider({
    endpoint: fallbackSelector,
    retryDelayMs: 500, // Short retry delay for faster testing
  });

  await provider2.connect();

  // Verify fallback behavior
  assert(fallbackCalls.length >= 2, 'Selector should be called at least twice for fallback');

  // First call should have attempt = 1, no currentEndpoint
  assert(fallbackCalls[0].attempt === 1, 'First call should have attempt = 1');
  assert(fallbackCalls[0].currentEndpoint === undefined, 'First call should have no currentEndpoint');

  // Second call should have attempt = 2, and currentEndpoint from first attempt
  assert(fallbackCalls[1].attempt === 2, 'Second call should have attempt = 2');
  assert(
    fallbackCalls[1].currentEndpoint === 'ws://127.0.0.1:99999',
    'Second call should have currentEndpoint from first attempt',
  );

  // Test RPC functionality on fallback connection
  const genesisHashFallback = await provider2.send('chain_getBlockHash', [0]);
  assert(isHex(genesisHashFallback), 'Expected genesis hash to be a hex string');
  console.log('Genesis hash from bob (fallback):', genesisHashFallback);

  // Both genesis hashes should be the same (same chain)
  assert(genesisHash === genesisHashFallback, 'Genesis hashes should match between nodes');

  await provider2.disconnect();

  // Test 3: Endpoint selector with alternating URLs
  console.log('\n=== Test 3: Alternating Endpoint Selection ===');

  const alternateCalls: WsConnectionState[] = [];
  let alternateCallCount = 0;

  const alternatingSelector: WsEndpointSelector = (info: WsConnectionState) => {
    console.log('Alternating selector called with:', info);
    alternateCalls.push({ ...info });
    alternateCallCount++;

    // Alternate between alice and bob URLs
    return alternateCallCount % 2 === 1 ? aliceUrl : bobUrl;
  };

  const provider3 = new WsProvider({ endpoint: alternatingSelector });

  await provider3.connect();

  // Test subscription functionality
  console.log('Testing subscription on endpoint selector connection...');

  return new Promise(async (resolve, reject) => {
    const subscription = await provider3.subscribe(
      {
        subname: 'chain_newHead',
        subscribe: 'chain_subscribeNewHead',
        unsubscribe: 'chain_unsubscribeNewHead',
        params: [],
      },
      async (error, head, subscriptionObject) => {
        await subscriptionObject.unsubscribe();

        assert(subscription === subscriptionObject, 'Subscription object mismatch');

        if (error) {
          console.error('Error in newHead subscription', error);
          reject(error);
        } else {
          console.log('New head received:', head);
          assert(isHex(head.parentHash), 'Expected parentHash to be a hex string');
          assert(isNumber(parseInt(head.number, 16)), 'Expected block number to be valid');

          // Verify selector was called at least once
          assert(alternateCalls.length >= 1, 'Alternating selector should be called at least once');
          assert(alternateCalls[0].attempt === 1, 'First call should have attempt = 1');

          await provider3.disconnect();

          console.log('\n=== All EndpointSelector Tests Passed! ===');
          resolve();
        }
      },
    );
  });
};
