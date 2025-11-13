import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { MethodResponse, OperationCallDone } from '@dedot/types/json-rpc';
import { MockInstance } from '@vitest/spy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PinnedBlock } from '../../json-rpc/group/ChainHead/ChainHead.js';
import { newChainHeadSimulator } from '../../json-rpc/group/__tests__/simulator.js';
import { V2Client } from '../V2Client.js';
import MockProvider from './MockProvider.js';

const prefixedMetadataV15 = staticSubstrateV15;

describe('V2Client.queryMulti', () => {
  let simulator: ReturnType<typeof newChainHeadSimulator>;
  let provider: MockProvider, providerSend: MockInstance;
  beforeEach(async () => {
    provider = new MockProvider();
    providerSend = vi.spyOn(provider, 'send');
    simulator = newChainHeadSimulator({ provider });
    simulator.notify(simulator.initializedEvent);
    simulator.notify(simulator.nextNewBlock()); // 0xf
    simulator.notify(simulator.nextNewBlock()); // 0x10
    simulator.notify(simulator.nextBestBlock()); // 0xf
    simulator.notify(simulator.nextFinalized()); // 0xf

    let counter = 0;
    provider.setRpcRequests({
      chainSpec_v1_chainName: () => 'MockedChain',
      chainHead_v1_call: () => {
        counter += 1;
        return { result: 'started', operationId: `call${counter.toString().padStart(2, '0')}` } as MethodResponse;
      },
      module_rpc_name: () => '0x',
    });

    simulator.notify(
      {
        operationId: 'call01',
        event: 'operationCallDone',
        output: '0x0c100000000f0000000e000000',
      } as OperationCallDone,
      10,
    );

    simulator.notify(
      {
        operationId: 'call02',
        event: 'operationCallDone',
        output: prefixedMetadataV15,
      } as OperationCallDone,
      20,
    );
  });

  let api: V2Client;
  beforeEach(async () => {
    api = await V2Client.new({ provider });
  });

  afterEach(async () => {
    api && api.status !== 'disconnected' && (await api.disconnect());
  });

  it('should query multiple storage items', async () => {
    // Mock storage query functions
    const mockQueryFn1 = {
      meta: { pallet: 'system', name: 'number' },
      rawKey: vi.fn().mockReturnValue('0x01'),
    };
    const mockQueryFn2 = {
      meta: { pallet: 'system', name: 'events' },
      rawKey: vi.fn().mockReturnValue('0x02'),
    };

    // Set up the spy before making the call
    const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');

    // Mock chainHead.storage response
    const mockResults = [
      { key: '0x01', value: '0xvalue1' },
      { key: '0x02', value: '0xvalue2' },
    ];
    chainHeadStorageSpy.mockResolvedValue(mockResults);

    // Mock QueryableStorage
    const mockDecodedValue1 = 42;
    const mockDecodedValue2 = ['event1', 'event2'];

    // Use vi.spyOn to mock the QueryableStorage constructor and its decodeValue method
    const originalQueryableStorage = // prettier-end-here
      await import('../../storage/QueryableStorage.js').then((m) => m.QueryableStorage);

    vi.spyOn(originalQueryableStorage.prototype, 'decodeValue')
      .mockImplementationOnce(() => mockDecodedValue1)
      .mockImplementationOnce(() => mockDecodedValue2);

    // Call queryMulti
    const result = await api.queryMulti([
      { fn: mockQueryFn1 as any, args: [] },
      { fn: mockQueryFn2 as any, args: [] },
    ]);

    // Verify rawKey was called
    expect(mockQueryFn1.rawKey).toHaveBeenCalled();
    expect(mockQueryFn2.rawKey).toHaveBeenCalled();

    // Verify chainHead.storage was called with the correct parameters
    expect(api.chainHead.storage).toHaveBeenCalledWith([
      { type: 'value', key: '0x01' },
      { type: 'value', key: '0x02' },
    ]);

    // Verify the result contains the decoded values
    expect(result).toEqual([mockDecodedValue1, mockDecodedValue2]);
  });

  it('should handle subscription-based queries', async () => {
    // Mock storage query functions
    const mockQueryFn1 = {
      meta: { pallet: 'system', name: 'number' },
      rawKey: vi.fn().mockReturnValue('0x01'),
    };
    const mockQueryFn2 = {
      meta: { pallet: 'system', name: 'events' },
      rawKey: vi.fn().mockReturnValue('0x02'),
    };

    // Set up the spies before making the call
    const chainHeadBestBlockSpy = vi.spyOn(api.chainHead, 'bestBlock');
    const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');
    const apiOnSpy = vi.spyOn(api, 'on');

    // Mock chainHead.bestBlock and chainHead.storage
    const mockBestBlock = { hash: '0xbesthash', number: 100, parent: '0xparenthash' } as PinnedBlock;
    chainHeadBestBlockSpy.mockResolvedValue(mockBestBlock);

    const mockInitialResults = [
      { key: '0x01', value: '0xvalue1' },
      { key: '0x02', value: '0xvalue2' },
    ];
    chainHeadStorageSpy.mockResolvedValue(mockInitialResults);

    // Mock api.on
    let onCallback: Function | undefined;
    const mockUnsub = vi.fn();
    apiOnSpy.mockImplementation((event: string, cb: Function) => {
      onCallback = cb;
      return mockUnsub;
    });

    // Mock QueryableStorage
    const mockDecodedValue1 = 42;
    const mockDecodedValue2 = ['event1', 'event2'];

    const originalQueryableStorage = // prettier-end-here
      await import('../../storage/QueryableStorage.js').then((m) => m.QueryableStorage);

    vi.spyOn(originalQueryableStorage.prototype, 'decodeValue').mockImplementation((raw) => {
      if (raw === '0xvalue1') return mockDecodedValue1;
      if (raw === '0xvalue2') return mockDecodedValue2;
      if (raw === '0xnewvalue1') return 43;
      if (raw === '0xnewvalue2') return ['event3', 'event4'];
      return undefined;
    });

    // Mock callback
    const callback = vi.fn();

    // Call queryMulti with subscription
    const unsub = await api.queryMulti(
      [
        { fn: mockQueryFn1 as any, args: [] },
        { fn: mockQueryFn2 as any, args: [] },
      ],
      callback,
    );

    // Verify chainHead.bestBlock and api.on were called
    expect(api.chainHead.bestBlock).toHaveBeenCalled();
    expect(api.on).toHaveBeenCalledWith('bestBlock', expect.any(Function));

    // Verify chainHead.storage was called with the correct parameters
    expect(api.chainHead.storage).toHaveBeenCalledWith(
      [
        { type: 'value', key: '0x01' },
        { type: 'value', key: '0x02' },
      ],
      undefined,
      '0xbesthash',
    );

    // Verify the callback was called with the initial values
    expect(callback).toHaveBeenCalledWith([mockDecodedValue1, mockDecodedValue2]);

    // Reset the callback mock
    callback.mockReset();

    // Setup mock response for subsequent storage call
    const mockNewResults = [
      { key: '0x01', value: '0xnewvalue1' },
      { key: '0x02', value: '0xnewvalue2' },
    ];
    chainHeadStorageSpy.mockResolvedValue(mockNewResults);

    // Simulate a new block event
    const mockNewBlock = { hash: '0xnewhash', number: 123, parent: '0xparenthash' } as PinnedBlock;
    if (onCallback) {
      await onCallback(mockNewBlock);
    }

    // Verify chainHead.storage was called with the new block hash
    expect(api.chainHead.storage).toHaveBeenCalledWith(
      [
        { type: 'value', key: '0x01' },
        { type: 'value', key: '0x02' },
      ],
      undefined,
      '0xnewhash',
    );

    // Verify the callback was called with the new decoded values
    expect(callback).toHaveBeenCalledWith([43, ['event3', 'event4']]);

    // Verify the unsubscribe function
    expect(typeof unsub).toBe('function');

    // Call the unsubscribe function
    await (unsub as Function)();

    // Verify the mock unsubscribe was called
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it('should handle empty query array', async () => {
    const result = await api.queryMulti([]);
    expect(result).toEqual([]);
  });

  it('should handle errors from storage service', async () => {
    // Mock storage query functions
    const mockQueryFn = {
      meta: { pallet: 'system', name: 'number' },
      rawKey: vi.fn().mockReturnValue('0x01'),
    };

    // Set up the spy before making the call
    const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');

    // Mock chainHead.storage to throw an error
    const mockError = new Error('Storage query failed');
    chainHeadStorageSpy.mockRejectedValue(mockError);

    // Call queryMulti and expect it to reject with the error
    await expect(api.queryMulti([{ fn: mockQueryFn as any, args: [] }])).rejects.toThrow(mockError);
  });
});
