import { BlockHash, PortableRegistry, StorageKey } from '@dedot/codecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryableStorage } from '../../storage/QueryableStorage.js';
import { StorageQueryExecutorV2 } from '../v2/StorageQueryExecutorV2.js';

const historicalHash = `0x${'12'.repeat(32)}` as BlockHash;

const createMockClient = () => ({
  rpcVersion: 'v2' as const,
  atBlockHash: historicalHash,
  registry: {} as PortableRegistry,
});

const createMockEntry = () =>
  ({
    prefixKey: '0xprefix' as StorageKey,
    encodeKey: vi.fn(),
    decodeKey: vi.fn((key: StorageKey) => `decoded_${key}`),
    decodeValue: vi.fn((value: StorageKey) => `decoded_${value}`),
  }) as unknown as QueryableStorage;

describe('StorageQueryExecutorV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries map entries at the client historical block', async () => {
    const chainHead = {
      storage: vi.fn().mockResolvedValue([{ key: '0x01', value: '0x02' }]),
    };
    const executor = new StorageQueryExecutorV2(createMockClient() as any, chainHead as any);
    const entry = createMockEntry();

    const methods = (executor as any).exposeStorageMapMethods(entry);
    const result = await methods.entries();

    expect(chainHead.storage).toHaveBeenCalledWith(
      [{ type: 'descendantsValues', key: entry.prefixKey }],
      undefined,
      historicalHash,
    );
    expect(result).toEqual([['decoded_0x01', 'decoded_0x02']]);
  });
});
