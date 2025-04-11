import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewStorageQuery } from '../NewStorageQuery.js';
import { StorageData, StorageKey } from '@dedot/codecs';
import { Callback, Unsub } from '@dedot/types';
import { DedotClient } from '../../client/DedotClient.js';
import { PinnedBlock } from '../../json-rpc/group/ChainHead/ChainHead.js';

// Mock the DedotClient and ChainHead
vi.mock('../../client/DedotClient.js', () => {
  return {
    DedotClient: vi.fn().mockImplementation(() => {
      return {
        rpcVersion: 'v2',
        on: vi.fn().mockReturnValue(vi.fn()),
        chainHead: {
          storage: vi.fn(),
          on: vi.fn(),
          bestBlock: vi.fn(),
        },
      };
    }),
  };
});

describe('NewBaseStorageQuery', () => {
  let mockClient: DedotClient;
  let service: NewStorageQuery;
  let mockKeys: StorageKey[];
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock client
    mockClient = new DedotClient({} as any);
    
    // Create the service
    service = new NewStorageQuery(mockClient);
    
    // Create some test keys
    mockKeys = ['0x01', '0x02'] as StorageKey[];
  });
  
  describe('query method', () => {
    it('should call chainHead.storage with the correct parameters', async () => {
      // Setup mock response
      const mockResults = [
        { key: '0x01', value: '0xvalue1' },
        { key: '0x02', value: '0xvalue2' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Call the method
      await service.query(mockKeys);
      
      // Verify the chainHead call
      expect(mockClient.chainHead.storage).toHaveBeenCalledTimes(1);
      expect(mockClient.chainHead.storage).toHaveBeenCalledWith([
        { type: 'value', key: '0x01' },
        { type: 'value', key: '0x02' },
      ]);
    });
    
    it('should return a record mapping keys to values', async () => {
      // Setup mock response with values in a different order than the keys
      const mockResults = [
        { key: '0x02', value: '0xvalue2' },
        { key: '0x01', value: '0xvalue1' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Call the method
      const result = await service.query(mockKeys);
      
      // Verify the result
      expect(result).toEqual({
        '0x01': '0xvalue1',
        '0x02': '0xvalue2'
      });
    });
    
    it('should handle undefined values', async () => {
      // Setup mock response with an undefined value
      const mockResults = [
        { key: '0x01', value: '0xvalue1' },
        { key: '0x02', value: undefined },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Call the method
      const result = await service.query(mockKeys);
      
      // Verify the result
      expect(result).toEqual({
        '0x01': '0xvalue1',
        '0x02': undefined
      });
    });
    
    it('should handle missing keys in the response', async () => {
      // Setup mock response with a missing key
      const mockResults = [
        { key: '0x01', value: '0xvalue1' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Call the method
      const result = await service.query(mockKeys);
      
      // Verify the result
      expect(result).toEqual({
        '0x01': '0xvalue1',
        '0x02': undefined
      });
    });
    
    it('should handle empty response', async () => {
      // Setup mock response with no results
      const mockResults: any[] = [];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Call the method
      const result = await service.query(mockKeys);
      
      // Verify the result
      expect(result).toEqual({
        '0x01': undefined,
        '0x02': undefined
      });
    });
  });
  
  describe('subscribe method', () => {
    it('should call chainHead.bestBlock and client.on with the correct parameters', async () => {
      // Setup mock response for bestBlock
      const mockBestBlock = { hash: '0xbesthash' };
      (mockClient.chainHead.bestBlock as any).mockResolvedValue(mockBestBlock);
      
      // Setup mock response for on
      const mockUnsub = vi.fn();
      (mockClient.on as any).mockReturnValue(mockUnsub);
      
      // Setup mock response for storage
      const mockResults = [
        { key: '0x01', value: '0xvalue1' },
        { key: '0x02', value: '0xvalue2' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Mock callback
      const callback = vi.fn();
      
      // Call the method
      await service.subscribe(mockKeys, callback);
      
      // Verify the chainHead calls
      expect(mockClient.chainHead.bestBlock).toHaveBeenCalledTimes(1);
      expect(mockClient.on).toHaveBeenCalledTimes(1);
      expect(mockClient.on).toHaveBeenCalledWith('bestBlock', expect.any(Function));
      expect(mockClient.chainHead.storage).toHaveBeenCalledTimes(1);
      expect(mockClient.chainHead.storage).toHaveBeenCalledWith([
        { type: 'value', key: '0x01' },
        { type: 'value', key: '0x02' },
      ], undefined, '0xbesthash');
    });
    
    it('should call the callback when changes are detected', async () => {
      // Setup mock response for bestBlock
      const mockBestBlock = { hash: '0xbesthash' };
      (mockClient.chainHead.bestBlock as any).mockResolvedValue(mockBestBlock);
      
      // Setup mock response for on
      let onCallback: Function | undefined;
      const mockUnsub = vi.fn();
      (mockClient.on as any).mockImplementation((event: string, cb: Function) => {
        onCallback = cb;
        return mockUnsub;
      });
      
      // Setup mock response for initial storage call
      const mockInitialResults = [
        { key: '0x01', value: '0xvalue1' },
        { key: '0x02', value: '0xvalue2' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValueOnce(mockInitialResults);
      
      // Mock callback
      const callback = vi.fn();
      
      // Call the method
      await service.subscribe(mockKeys, callback);
      
      // Verify the callback was called with initial values
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        '0x01': '0xvalue1',
        '0x02': '0xvalue2'
      });
      
      // Reset the callback mock
      callback.mockReset();
      
      // Setup mock response for subsequent storage call
      const mockNewResults = [
        { key: '0x01', value: '0xnewvalue1' },
        { key: '0x02', value: '0xnewvalue2' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValueOnce(mockNewResults);
      
      // Simulate a new block event
      const mockNewBlock = { hash: '0xnewhash', number: 123, parent: '0xparenthash' } as PinnedBlock;
      if (onCallback) {
        await onCallback(mockNewBlock);
      }
      
      // Verify the callback was called with new values
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        '0x01': '0xnewvalue1',
        '0x02': '0xnewvalue2'
      });
    });
    
    it('should not call the callback when no changes are detected', async () => {
      // Setup mock response for bestBlock
      const mockBestBlock = { hash: '0xbesthash' };
      (mockClient.chainHead.bestBlock as any).mockResolvedValue(mockBestBlock);
      
      // Setup mock response for on
      let onCallback: Function | undefined;
      const mockUnsub = vi.fn();
      (mockClient.on as any).mockImplementation((event: string, cb: Function) => {
        onCallback = cb;
        return mockUnsub;
      });
      
      // Setup mock response for initial storage call
      const mockResults = [
        { key: '0x01', value: '0xvalue1' },
        { key: '0x02', value: '0xvalue2' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Mock callback
      const callback = vi.fn();
      
      // Call the method
      await service.subscribe(mockKeys, callback);
      
      // Verify the callback was called with initial values
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Reset the callback mock
      callback.mockReset();
      
      // Simulate a new block event with the same values
      const mockNewBlock = { hash: '0xnewhash', number: 123, parent: '0xparenthash' } as PinnedBlock;
      if (onCallback) {
        await onCallback(mockNewBlock);
      }
      
      // Verify the callback was not called again
      expect(callback).not.toHaveBeenCalled();
    });
    
    it('should return an unsubscribe function', async () => {
      // Setup mock response for bestBlock
      const mockBestBlock = { hash: '0xbesthash' };
      (mockClient.chainHead.bestBlock as any).mockResolvedValue(mockBestBlock);
      
      // Setup mock response for on
      const mockUnsub = vi.fn();
      (mockClient.on as any).mockReturnValue(mockUnsub);
      
      // Setup mock response for storage
      const mockResults = [
        { key: '0x01', value: '0xvalue1' },
        { key: '0x02', value: '0xvalue2' },
      ];
      (mockClient.chainHead.storage as any).mockResolvedValue(mockResults);
      
      // Call the method
      const unsub = await service.subscribe(mockKeys, vi.fn());
      
      // Verify the unsubscribe function
      expect(typeof unsub).toBe('function');
      
      // Call the unsubscribe function
      await unsub();
      
      // Verify the mock unsubscribe was called
      expect(mockUnsub).toHaveBeenCalledTimes(1);
    });
  });
});
