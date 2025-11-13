import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { SubstrateRuntimeVersion } from '@dedot/api';
import { fakeSigner } from '@dedot/api/extrinsic/submittable/fakeSigner';
import { $RuntimeVersion, type RuntimeVersion, unwrapOpaqueMetadata } from '@dedot/codecs';
import { WsProvider } from '@dedot/providers';
import type { AnyShape } from '@dedot/shape';
import * as $ from '@dedot/shape';
import { InjectedSigner } from '@dedot/types';
import {
  MethodResponse,
  OperationBodyDone,
  OperationCallDone,
  OperationStorageDone,
  OperationStorageItems,
} from '@dedot/types/json-rpc';
import { assert, deferred, stringCamelCase, stringPascalCase, u8aToHex, waitFor } from '@dedot/utils';
import { MockInstance } from '@vitest/spy';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { PinnedBlock } from '../../json-rpc/group/ChainHead/ChainHead.js';
import { mockedRuntime, newChainHeadSimulator } from '../../json-rpc/group/__tests__/simulator.js';
import { V2Client } from '../V2Client.js';
import MockProvider from './MockProvider.js';

const prefixedMetadataV15 = staticSubstrateV15;
const rawMetadataV15 = unwrapOpaqueMetadata(staticSubstrateV15);

describe('[V2Client] endpoint validation', () => {
  it('should throws error for invalid endpoint', async () => {
    await expect(async () => {
      await V2Client.new(new WsProvider('invalid_endpoint'));
    }).rejects.toThrowError(
      'Invalid websocket endpoint invalid_endpoint, a valid endpoint should start with wss:// or ws://',
    );
  });
});

describe('[V2Client] event forwarding', () => {
  let api: V2Client;
  let simulator: ReturnType<typeof newChainHeadSimulator>;
  let provider: MockProvider;

  beforeEach(async () => {
    provider = new MockProvider();
    simulator = newChainHeadSimulator({ provider });
    simulator.notify(simulator.initializedEvent);
    simulator.notify(simulator.nextNewBlock());

    let counter = 0;
    provider.setRpcRequests({
      chainSpec_v1_chainName: () => 'MockedChain',
      chainHead_v1_call: () => {
        counter += 1;
        return { result: 'started', operationId: `call0${counter}` } as MethodResponse;
      },
    });

    simulator.notify(
      {
        operationId: 'call01',
        event: 'operationCallDone',
        output: '0x0c100000000f0000000e000000',
      } as OperationCallDone,
      5,
    );

    simulator.notify(
      {
        operationId: 'call02',
        event: 'operationCallDone',
        output: prefixedMetadataV15,
      } as OperationCallDone,
      10,
    );

    api = await V2Client.new({ provider });
  });

  afterEach(async () => {
    api && api.status !== 'disconnected' && (await api.disconnect());
  });

  it('should forward newBlock events from ChainHead', async () => {
    const newBlockSpy = vi.fn();
    api.on('newBlock', newBlockSpy);

    const newBlock = simulator.nextNewBlock();
    simulator.notify(newBlock);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(newBlockSpy).toHaveBeenCalledTimes(1);
        const pinnedBlock = newBlockSpy.mock.calls[0][0] as PinnedBlock;
        expect(pinnedBlock.hash).toEqual(newBlock.blockHash);
        resolve();
      }, 10);
    });
  });

  it('should forward bestBlock events from ChainHead', async () => {
    const bestBlockSpy = vi.fn();
    api.on('bestBlock', bestBlockSpy);

    // Create a new block first
    simulator.notify(simulator.nextNewBlock());

    // Then make it the best block
    const bestBlock = simulator.nextBestBlock();
    simulator.notify(bestBlock);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(bestBlockSpy).toHaveBeenCalledTimes(1);
        const pinnedBlock = bestBlockSpy.mock.calls[0][0] as PinnedBlock;
        expect(pinnedBlock.hash).toEqual(bestBlock.bestBlockHash);
        resolve();
      }, 10);
    });
  });

  it('should forward finalizedBlock events from ChainHead', async () => {
    const finalizedBlockSpy = vi.fn();
    api.on('finalizedBlock', finalizedBlockSpy);

    // Create a new block first
    const newBlock = simulator.nextNewBlock();
    simulator.notify(newBlock);

    // Then make it the best block
    simulator.notify(simulator.nextBestBlock());

    // Then finalize it
    const finalized = simulator.nextFinalized();
    simulator.notify(finalized);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(finalizedBlockSpy).toHaveBeenCalledTimes(1);
        const pinnedBlock = finalizedBlockSpy.mock.calls[0][0] as PinnedBlock;
        expect(pinnedBlock.hash).toEqual(finalized.finalizedBlockHashes[0]);
        resolve();
      }, 10);
    });
  });

  it('should forward bestChainChanged events from ChainHead', async () => {
    const bestChainChangedSpy = vi.fn();
    api.on('bestChainChanged', bestChainChangedSpy);

    // Create a mock PinnedBlock directly
    const mockPinnedBlock: PinnedBlock = {
      hash: '0xmockblockhash',
      number: 123,
      parent: '0xmockparenthash',
    };

    // Directly emit the bestChainChanged event with our mock block
    api.chainHead.emit('bestChainChanged', mockPinnedBlock);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(bestChainChangedSpy).toHaveBeenCalledTimes(1);
        const emittedBlock = bestChainChangedSpy.mock.calls[0][0] as PinnedBlock;
        expect(emittedBlock).toBe(mockPinnedBlock);
        expect(emittedBlock.hash).toEqual('0xmockblockhash');
        resolve();
      }, 100); // Increased timeout to ensure event propagation
    });
  });

  it('should forward multiple events in sequence', async () => {
    const events: string[] = [];

    api.on('newBlock', () => events.push('newBlock'));
    api.on('bestBlock', () => events.push('bestBlock'));
    api.on('finalizedBlock', () => events.push('finalizedBlock'));

    // Create a new block
    simulator.notify(simulator.nextNewBlock());

    // Make it the best block
    simulator.notify(simulator.nextBestBlock());

    // Finalize it
    simulator.notify(simulator.nextFinalized());

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(events).toEqual(['newBlock', 'bestBlock', 'finalizedBlock']);
        resolve();
      }, 10);
    });
  });
});

describe('[V2Client] clearCache', () => {
  let api: V2Client;
  let provider: MockProvider;
  let simulator: ReturnType<typeof newChainHeadSimulator>;

  beforeEach(async () => {
    provider = new MockProvider();
    simulator = newChainHeadSimulator({ provider });
    simulator.notify(simulator.initializedEvent);
    simulator.notify(simulator.nextNewBlock());

    let counter = 0;
    provider.setRpcRequests({
      chainSpec_v1_chainName: () => 'MockedChain',
      chainHead_v1_call: () => {
        counter += 1;
        return { result: 'started', operationId: `call0${counter}` } as MethodResponse;
      },
    });

    simulator.notify(
      {
        operationId: 'call01',
        event: 'operationCallDone',
        output: '0x0c100000000f0000000e000000',
      } as OperationCallDone,
      5,
    );

    simulator.notify(
      {
        operationId: 'call02',
        event: 'operationCallDone',
        output: prefixedMetadataV15,
      } as OperationCallDone,
      10,
    );

    api = await V2Client.new({ provider });
  });

  afterEach(async () => {
    // Restore mocks first to avoid issues with disconnect
    vi.restoreAllMocks();

    if (api && api.status !== 'disconnected') {
      try {
        await api.disconnect();
      } catch (error) {
        // Ignore disconnect errors in tests, they're expected in some cases
        console.log('Ignoring expected disconnect error in test cleanup:', error);
      }
    }
  });

  it('should call parent clearCache and chainHead clearCache when keepMetadataCache=false (default)', async () => {
    // Spy on parent method and chainHead clearCache
    const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
    const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

    // Call clearCache with default parameter (false)
    await api.clearCache();

    // Verify parent method was called with false
    expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);
    expect(parentClearCacheSpy).toHaveBeenCalledWith(false);

    // Verify chainHead clearCache was called
    expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
  });

  it('should call parent clearCache and chainHead clearCache when keepMetadataCache=false explicitly', async () => {
    // Spy on parent method and chainHead clearCache
    const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
    const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

    // Call clearCache with explicit false parameter
    await api.clearCache(false);

    // Verify parent method was called with false
    expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);
    expect(parentClearCacheSpy).toHaveBeenCalledWith(false);

    // Verify chainHead clearCache was called
    expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
  });

  it('should call parent clearCache and chainHead clearCache when keepMetadataCache=true', async () => {
    // Spy on parent method and chainHead clearCache
    const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
    const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

    // Call clearCache with keepMetadataCache=true
    await api.clearCache(true);

    // Verify parent method was called with true
    expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);
    expect(parentClearCacheSpy).toHaveBeenCalledWith(true);

    // Verify chainHead clearCache was still called
    expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
  });

  it('should not throw error when chainHead is undefined', async () => {
    // Spy on parent method first before disconnecting
    const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');

    // Disconnect first to avoid cleanup issues
    await api.disconnect();

    // Set chainHead to undefined after disconnection
    (api as any)._chainHead = undefined;

    // Call clearCache - should not throw
    await expect(api.clearCache()).resolves.toBeUndefined();
    await expect(api.clearCache(true)).resolves.toBeUndefined();

    // Verify parent method was called both times
    expect(parentClearCacheSpy).toHaveBeenCalledTimes(2);
    expect(parentClearCacheSpy).toHaveBeenNthCalledWith(1, false);
    expect(parentClearCacheSpy).toHaveBeenNthCalledWith(2, true);
  });

  it('should propagate parent clearCache errors', async () => {
    // Make parent clearCache throw an error
    const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
    parentClearCacheSpy.mockRejectedValue(new Error('Parent cache clear failed'));

    // Spy on chainHead clearCache
    const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

    // Call clearCache - should propagate the error
    await expect(api.clearCache()).rejects.toThrow('Parent cache clear failed');

    // Verify parent method was called
    expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);

    // Verify chainHead clearCache was not called due to the error
    expect(chainHeadClearCacheSpy).not.toHaveBeenCalled();
  });

  it('should propagate chainHead clearCache errors after clearing parent cache', async () => {
    // Spy on parent method
    const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');

    // Make chainHead clearCache throw an error
    const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');
    chainHeadClearCacheSpy.mockImplementation(() => {
      throw new Error('ChainHead cache clear failed');
    });

    // Call clearCache - the error from chainHead should propagate
    await expect(api.clearCache()).rejects.toThrow('ChainHead cache clear failed');

    // Verify parent method was called first
    expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);

    // Verify chainHead clearCache was called and failed
    expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
  });
});
