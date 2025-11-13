import { describe, expect, it, vi } from 'vitest';
import { Executor } from '../executor/Executor.js';
import { newProxyChain, Carrier } from '../proxychain.js';
import { ISubstrateClientAt } from '../types.js';

class MockExecutor extends Executor {
  executeCalls: string[][] = [];
  private executorId = Math.random().toString(36).slice(2);

  constructor() {
    super({} as ISubstrateClientAt);
  }

  doExecute(...chain: string[]): any {
    this.executeCalls.push([...chain]);
    return {
      chain: [...chain],
      executorId: this.executorId,
    };
  }
}

describe('newProxyChain', () => {
  it('should execute with correct chain at max level', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor };

    const proxy: any = newProxyChain(carrier, 1, 3);
    const result = proxy.pallet.item;

    expect(result).toEqual({
      chain: ['pallet', 'item'],
      executorId: expect.any(String),
    });
    expect(executor.executeCalls).toHaveLength(1);
    expect(executor.executeCalls[0]).toEqual(['pallet', 'item']);
  });

  it('should create independent chains for different access paths', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor };

    const proxy: any = newProxyChain(carrier, 1, 3);

    // First access path
    const result1 = proxy.system.ExtrinsicSuccess;
    expect(result1.chain).toEqual(['system', 'ExtrinsicSuccess']);

    // Second access path - should be independent
    const result2 = proxy.system.ExtrinsicFailed;
    expect(result2.chain).toEqual(['system', 'ExtrinsicFailed']);

    // Third access path - different pallet
    const result3 = proxy.balances.Transfer;
    expect(result3.chain).toEqual(['balances', 'Transfer']);

    // Verify all calls were independent
    expect(executor.executeCalls).toHaveLength(3);
    expect(executor.executeCalls[0]).toEqual(['system', 'ExtrinsicSuccess']);
    expect(executor.executeCalls[1]).toEqual(['system', 'ExtrinsicFailed']);
    expect(executor.executeCalls[2]).toEqual(['balances', 'Transfer']);
  });

  it('should not share state between multiple accesses to the same proxy', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor };

    const eventsProxy: any = newProxyChain(carrier, 1, 3);

    // Access the same path multiple times
    const results = [
      eventsProxy.system.ExtrinsicSuccess,
      eventsProxy.system.ExtrinsicFailed,
      eventsProxy.system.CodeUpdated,
      eventsProxy.balances.Transfer,
      eventsProxy.balances.Withdraw,
    ];

    // Each should have its own independent chain
    expect(results[0].chain).toEqual(['system', 'ExtrinsicSuccess']);
    expect(results[1].chain).toEqual(['system', 'ExtrinsicFailed']);
    expect(results[2].chain).toEqual(['system', 'CodeUpdated']);
    expect(results[3].chain).toEqual(['balances', 'Transfer']);
    expect(results[4].chain).toEqual(['balances', 'Withdraw']);

    // Verify executor received correct chains
    expect(executor.executeCalls).toEqual([
      ['system', 'ExtrinsicSuccess'],
      ['system', 'ExtrinsicFailed'],
      ['system', 'CodeUpdated'],
      ['balances', 'Transfer'],
      ['balances', 'Withdraw'],
    ]);
  });

  it('should handle concurrent access patterns correctly', async () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor };

    const proxy: any = newProxyChain(carrier, 1, 3);

    // Simulate concurrent access
    const promises = await Promise.all([
      Promise.resolve(proxy.system.ExtrinsicSuccess),
      Promise.resolve(proxy.system.ExtrinsicFailed),
      Promise.resolve(proxy.balances.Transfer),
      Promise.resolve(proxy.staking.Bonded),
    ]);

    // Each promise should resolve with its own chain
    expect(promises[0].chain).toEqual(['system', 'ExtrinsicSuccess']);
    expect(promises[1].chain).toEqual(['system', 'ExtrinsicFailed']);
    expect(promises[2].chain).toEqual(['balances', 'Transfer']);
    expect(promises[3].chain).toEqual(['staking', 'Bonded']);

    expect(executor.executeCalls).toHaveLength(4);
  });

  it('should maintain independence when reusing intermediate proxies', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor };

    const eventsProxy: any = newProxyChain(carrier, 1, 3);
    const systemProxy = eventsProxy.system;

    // Access different items through the same intermediate proxy
    const result1 = systemProxy.ExtrinsicSuccess;
    const result2 = systemProxy.ExtrinsicFailed;
    const result3 = systemProxy.NewAccount;

    expect(result1.chain).toEqual(['system', 'ExtrinsicSuccess']);
    expect(result2.chain).toEqual(['system', 'ExtrinsicFailed']);
    expect(result3.chain).toEqual(['system', 'NewAccount']);

    // All should be independent
    expect(executor.executeCalls).toEqual([
      ['system', 'ExtrinsicSuccess'],
      ['system', 'ExtrinsicFailed'],
      ['system', 'NewAccount'],
    ]);
  });

  it('should work with different max levels', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor };

    // Test with max level 2
    const proxy2Level: any = newProxyChain(carrier, 1, 2);
    const result2 = proxy2Level.item;
    expect(result2.chain).toEqual(['item']);

    // Test with max level 4
    const proxy4Level: any = newProxyChain(carrier, 1, 4);
    const result4 = proxy4Level.pallet.subpallet.item;
    expect(result4.chain).toEqual(['pallet', 'subpallet', 'item']);

    expect(executor.executeCalls).toEqual([['item'], ['pallet', 'subpallet', 'item']]);
  });

  it('should handle empty initial chain', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor, chain: [] };

    const proxy: any = newProxyChain(carrier, 1, 3);
    const result = proxy.pallet.item;

    expect(result.chain).toEqual(['pallet', 'item']);
  });

  it('should handle undefined initial chain', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor, chain: undefined };

    const proxy: any = newProxyChain(carrier, 1, 3);
    const result = proxy.pallet.item;

    expect(result.chain).toEqual(['pallet', 'item']);
  });

  it('should preserve original carrier executor reference', () => {
    const executor = new MockExecutor();
    const carrier: Carrier = { executor };

    const proxy: any = newProxyChain(carrier, 1, 3);
    const result1 = proxy.pallet.item1;
    const result2 = proxy.pallet.item2;

    // Both results should come from the same executor instance
    expect(result1.executorId).toEqual(result2.executorId);
  });

  describe('regression tests for the bug', () => {
    it('should not accumulate chain across multiple event accesses', () => {
      const executor = new MockExecutor();
      const carrier: Carrier = { executor };

      // This simulates the apiAtBlock.events proxy
      const eventsProxy: any = newProxyChain(carrier, 1, 3);

      // First access: events.system.ExtrinsicSuccess
      const success = eventsProxy.system.ExtrinsicSuccess;
      expect(success.chain).toEqual(['system', 'ExtrinsicSuccess']);

      // Second access: events.system.ExtrinsicFailed
      // This should NOT have the previous chain accumulated
      const failed = eventsProxy.system.ExtrinsicFailed;
      expect(failed.chain).toEqual(['system', 'ExtrinsicFailed']);

      // Verify the executor calls
      expect(executor.executeCalls).toEqual([
        ['system', 'ExtrinsicSuccess'],
        ['system', 'ExtrinsicFailed'], // Should NOT be ['system', 'ExtrinsicSuccess', 'system', 'ExtrinsicFailed']
      ]);
    });

    it('should handle the exact test scenario from check-events.ts', async () => {
      const executor = new MockExecutor();
      const carrier: Carrier = { executor };

      const apiAtBlockEvents: any = newProxyChain(carrier, 1, 3);

      // Simulate the exact test case
      const results = await Promise.all([
        Promise.resolve(apiAtBlockEvents.system.ExtrinsicSuccess),
        Promise.resolve(apiAtBlockEvents.system.ExtrinsicFailed),
      ]);

      expect(results[0].chain).toEqual(['system', 'ExtrinsicSuccess']);
      expect(results[1].chain).toEqual(['system', 'ExtrinsicFailed']);

      // Second batch of accesses
      const results2 = await Promise.all([
        Promise.resolve(apiAtBlockEvents.system.ExtrinsicFailed),
        Promise.resolve(apiAtBlockEvents.system.ExtrinsicSuccess),
        Promise.resolve(apiAtBlockEvents.system.CodeUpdated),
        Promise.resolve(apiAtBlockEvents.system.NewAccount),
        Promise.resolve(apiAtBlockEvents.system.Remarked),
      ]);

      expect(results2[0].chain).toEqual(['system', 'ExtrinsicFailed']);
      expect(results2[1].chain).toEqual(['system', 'ExtrinsicSuccess']);
      expect(results2[2].chain).toEqual(['system', 'CodeUpdated']);
      expect(results2[3].chain).toEqual(['system', 'NewAccount']);
      expect(results2[4].chain).toEqual(['system', 'Remarked']);

      // All calls should be independent
      expect(executor.executeCalls).toEqual([
        ['system', 'ExtrinsicSuccess'],
        ['system', 'ExtrinsicFailed'],
        ['system', 'ExtrinsicFailed'],
        ['system', 'ExtrinsicSuccess'],
        ['system', 'CodeUpdated'],
        ['system', 'NewAccount'],
        ['system', 'Remarked'],
      ]);
    });
  });
});
