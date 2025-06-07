import { WsProvider, MaxRetryAttemptedError } from 'dedot';
import { assert, waitFor } from 'dedot/utils';

/**
 * E2E tests for WsProvider maxRetryAttempts functionality
 *
 * These tests verify:
 * 1. Initial connection failure behavior - first attempt doesn't count as retry
 * 2. Connection interruption behavior - stops retrying after max attempts
 */
export const run = async (_nodeName: any, networkInfo: any) => {
  console.log('=== Testing WsProvider maxRetryAttempts functionality ===');

  // Get a valid WebSocket endpoint from the network
  const { wsUri: validEndpoint } = networkInfo.nodesByName['collator-1'];
  console.log('Valid endpoint for testing:', validEndpoint);

  await testInitialConnectionFailures();
  await testConnectionInterruptionAfterSuccess(validEndpoint);

  console.log('=== All maxRetryAttempts tests completed successfully ===');
};

/**
 * Test Scenario 1: Initial Connection Failure
 * Verifies that the first connection attempt doesn't count as a retry,
 * and when max attempts are reached during initial connection, connect() throws an error.
 */
async function testInitialConnectionFailures() {
  console.log('\n--- Testing Initial Connection Failures ---');

  // Use non-existent endpoints to simulate connection failures
  const invalidEndpoint = 'ws://127.0.0.1:9999'; // Non-existent port
  const invalidEndpoint2 = 'ws://127.0.0.1:9999';

  // Test 1: maxRetryAttempts = 0 (no retries)
  console.log('Test 1: maxRetryAttempts = 0 (should fail immediately)');
  {
    const provider = new WsProvider({
      endpoint: invalidEndpoint,
      maxRetryAttempts: 0,
      retryDelayMs: 100, // Short delay for faster testing
    });

    const startTime = Date.now();
    try {
      await provider.connect();
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`  - Failed as expected after ${duration}ms`);
      console.log(`  - Error type: ${error.constructor.name}`);

      // Should fail quickly without retry delays
      assert(duration < 500, `Should fail quickly, but took ${duration}ms`);

      assert(provider.status === 'disconnected', 'Status should be disconnected');
    }
  }

  // Test 2: maxRetryAttempts = 1 (initial + 1 retry)
  console.log('Test 2: maxRetryAttempts = 1 (initial attempt + 1 retry)');
  {
    const provider = new WsProvider({
      endpoint: invalidEndpoint,
      maxRetryAttempts: 1,
      retryDelayMs: 200, // Short delay for faster testing
    });

    const startTime = Date.now();
    try {
      await provider.connect();
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`  - Failed as expected after ${duration}ms`);
      console.log(`  - Error: ${error.message}`);

      // Should have taken at least one retry delay (200ms)
      assert(duration >= 180, `Should take at least 180ms for 1 retry, but took ${duration}ms`);
      assert(duration < 1000, `Should not take too long, but took ${duration}ms`);
      assert(provider.status === 'disconnected', 'Status should be disconnected');

      assert(error.message.includes('1 retry attempts'), 'Error message should mention 1 retry attempt');
    }
  }

  // Test 3: maxRetryAttempts = 3 (initial + 3 retries)
  console.log('Test 3: maxRetryAttempts = 3 (initial attempt + 3 retries)');
  {
    const provider = new WsProvider({
      endpoint: invalidEndpoint,
      maxRetryAttempts: 3,
      retryDelayMs: 150, // Short delay for faster testing
    });

    const startTime = Date.now();
    try {
      await provider.connect();
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`  - Failed as expected after ${duration}ms`);
      console.log(`  - Error: ${error.message}`);

      // Should have taken at least 3 retry delays (3 * 150ms = 450ms)
      assert(duration >= 400, `Should take at least 400ms for 3 retries, but took ${duration}ms`);
      assert(duration < 2000, `Should not take too long, but took ${duration}ms`);

      assert(provider.status === 'disconnected', 'Status should be disconnected');
      assert(error.message.includes('3 retry attempts'), 'Error message should mention 3 retry attempts');
    }
  }

  // Test 4: Array endpoints with maxRetryAttempts
  console.log('Test 4: Array endpoints with maxRetryAttempts = 2');
  {
    const provider = new WsProvider({
      endpoint: [invalidEndpoint, invalidEndpoint2], // Both invalid
      maxRetryAttempts: 2,
      retryDelayMs: 100,
    });

    const startTime = Date.now();
    try {
      await provider.connect();
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`  - Failed as expected after ${duration}ms`);
      console.log(`  - Error: ${error.message}`);

      // Should have taken at least 2 retry delays
      assert(duration >= 180, `Should take at least 180ms for 2 retries, but took ${duration}ms`);
      assert(provider.status === 'disconnected', 'Status should be disconnected');
      assert(error.message.includes('2 retry attempts'), 'Error message should mention 2 retry attempts');
    }
  }

  console.log('✓ Initial connection failure tests completed');
}

/**
 * Test Scenario 2: Connection Interruption After Successful Connection
 * Verifies that after a successful connection, when the connection is interrupted
 * and max retry attempts are reached, the provider stops retrying and sets status to 'disconnected'.
 */
async function testConnectionInterruptionAfterSuccess(validEndpoint: string) {
  console.log('\n--- Testing Connection Interruption After Success ---');

  // Test 1: maxRetryAttempts = 0 (no retries after interruption)
  console.log('Test 1: maxRetryAttempts = 0 (no retries after connection loss)');
  {
    const provider = new WsProvider({
      endpoint: validEndpoint,
      maxRetryAttempts: 0,
      retryDelayMs: 100,
    });

    let errorEmitted = false;
    let maxRetryErrorEmitted = false;

    provider.on('error', (error) => {
      errorEmitted = true;
      if (error instanceof MaxRetryAttemptedError) {
        maxRetryErrorEmitted = true;
      }
    });

    // Connect successfully first
    await provider.connect();
    assert(provider.status === 'connected', 'Should be connected initially');
    console.log('  - Successfully connected');

    // Force close the connection to simulate network interruption
    const ws = (provider as any).__unsafeWs();
    assert(ws, 'WebSocket should exist');

    // Close with non-normal code to trigger reconnection logic
    ws.close(3000, 'Simulated network interruption');
    console.log('  - Simulated connection interruption');

    // Wait a bit to see if any retry attempts happen
    await waitFor(2500);

    console.log(`  - Final status: ${provider.status}`);
    console.log(`  - Error emitted: ${errorEmitted}`);
    console.log(`  - MaxRetryError emitted: ${maxRetryErrorEmitted}`);

    // Should be disconnected and should have emitted MaxRetryAttemptedError
    // Note: The provider might reconnect successfully since we're using a valid endpoint
    // In a real scenario with network interruption, we'd expect it to be disconnected
    console.log(
      `  - Verifying behavior: status=${provider.status}, errorEmitted=${errorEmitted}, maxRetryErrorEmitted=${maxRetryErrorEmitted}`,
    );

    // For maxRetryAttempts=0, we expect immediate disconnection and MaxRetryAttemptedError
    // @ts-ignore
    assert(provider.status === 'disconnected', 'Status should be disconnected');
    assert(maxRetryErrorEmitted, 'MaxRetryError should be emitted');
  }

  // Test 2: maxRetryAttempts = 2 (2 retries after interruption)
  console.log('Test 2: maxRetryAttempts = 2 (2 retries after connection loss)');
  {
    let maxRetryError: MaxRetryAttemptedError | null = null;
    const errors: Error[] = [];

    // For this test, we'll use a different approach:
    // Connect to valid endpoint, then simulate disconnection
    const validProvider = new WsProvider({
      endpoint: validEndpoint,
      maxRetryAttempts: 2,
      retryDelayMs: 100,
    });

    validProvider.on('error', (error: Error) => {
      errors.push(error);
      if (error instanceof MaxRetryAttemptedError) {
        maxRetryError = error;
      }
    });

    await validProvider.connect();
    assert(validProvider.status === 'connected', 'Should be connected initially');
    console.log('  - Successfully connected');

    // Get the WebSocket and close it to simulate network interruption
    const ws = (validProvider as any).__unsafeWs();
    ws.close(3000, 'Simulated network interruption');
    console.log('  - Simulated connection interruption');

    // Wait for retry attempts to complete
    await waitFor(2500);

    console.log(`  - Final status: ${validProvider.status}`);
    console.log(`  - Total errors: ${errors.length}`);

    console.log(`  - MaxRetryError: ${maxRetryError ? 'MaxRetryAttemptedError occurred' : 'null'}`);

    // Note: Since we're using a valid endpoint, the provider might actually reconnect successfully
    // In a real network interruption scenario, we'd expect it to fail after retries
    // For this test, we'll verify the retry mechanism is working
    assert(validProvider.status === 'connected', 'Should be connected again');

    validProvider.disconnect().catch(() => {}); // Clean up
  }

  console.log('Test 3: disconnect on reaches max retry');
  {
    let maxRetryError: MaxRetryAttemptedError | null = null;
    const errors: Error[] = [];
    let triggerred = false;

    // For this test, we'll use a different approach:
    // Connect to valid endpoint, then simulate disconnection
    const provider = new WsProvider({
      endpoint: () => {
        if (triggerred) {
          return 'ws://127.0.0.1:9999';
        }

        return validEndpoint;
      },
      maxRetryAttempts: 2,
      retryDelayMs: 100,
    });

    provider.on('error', (error: Error) => {
      errors.push(error);
      if (error instanceof MaxRetryAttemptedError) {
        maxRetryError = error;
      }
    });

    await provider.connect();
    assert(provider.status === 'connected', 'Should be connected initially');
    console.log('  - Successfully connected');

    // Get the WebSocket and close it to simulate network interruption
    const ws = (provider as any).__unsafeWs();
    ws.close(3000, 'Simulated network interruption');
    console.log('  - Simulated connection interruption');
    triggerred = true;

    // Wait for retry attempts to complete
    await waitFor(2500);

    console.log(`  - Final status: ${provider.status}`);
    console.log(`  - Total errors: ${errors.length}`);

    console.log(`  - MaxRetryError: ${maxRetryError ? 'MaxRetryAttemptedError occurred' : 'null'}`);

    // Note: Since we're using a valid endpoint, the provider might actually reconnect successfully
    // In a real network interruption scenario, we'd expect it to fail after retries
    // For this test, we'll verify the retry mechanism is working
    // @ts-ignore
    assert(provider.status === 'disconnected', 'Should be disconnected');
    assert(maxRetryError, 'MaxRetryAttemptedError occurred');
  }

  console.log('✓ Connection interruption tests completed');
}
