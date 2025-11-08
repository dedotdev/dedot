import { $Header } from '@dedot/codecs';
import { HexString } from '@dedot/utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChainHead, Archive, PinnedBlock } from '../../../json-rpc/index.js';
import type { BlockInfo } from '../../../types.js';
import type { V2Client } from '../../V2Client.js';
import { V2BlockExplorer } from '../V2BlockExplorer.js';

describe('V2BlockExplorer', () => {
  let mockChainHead: ChainHead;
  let mockArchive: Archive;
  let mockClient: V2Client<any>;
  let explorer: V2BlockExplorer;

  const createMockPinnedBlock = (number: number): PinnedBlock => ({
    hash: `0x${number.toString(16).padStart(64, '0')}`,
    number,
    parent: `0x${(number - 1).toString(16).padStart(64, '0')}`,
    runtime: undefined,
  });

  beforeEach(() => {
    // Mock ChainHead
    mockChainHead = {
      bestBlock: vi.fn(),
      finalizedBlock: vi.fn(),
      findBlock: vi.fn(),
      header: vi.fn(),
      body: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as ChainHead;

    // Mock Archive
    mockArchive = {
      supported: vi.fn(),
      hashByHeight: vi.fn(),
      header: vi.fn(),
      body: vi.fn(),
    } as unknown as Archive;

    // Mock V2Client
    mockClient = {
      chainHead: mockChainHead,
      archive: mockArchive,
    } as unknown as V2Client<any>;

    explorer = new V2BlockExplorer(mockClient);
  });

  describe('best() - Query Mode', () => {
    it('should call ChainHead.bestBlock() and convert to BlockInfo', async () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.bestBlock).mockResolvedValue(mockBlock);

      const result = await explorer.best();

      expect(result).toEqual({
        hash: mockBlock.hash,
        number: mockBlock.number,
        parent: mockBlock.parent,
      });
      expect(mockChainHead.bestBlock).toHaveBeenCalledTimes(1);
    });
  });

  describe('best(callback) - Subscription Mode', () => {
    it('should emit current value immediately', async () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.bestBlock).mockResolvedValue(mockBlock);
      vi.mocked(mockChainHead.on).mockReturnValue(() => {});

      const callback = vi.fn();
      const unsub = explorer.best(callback);

      // Wait for initial emission
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({
        hash: mockBlock.hash,
        number: mockBlock.number,
        parent: mockBlock.parent,
      });

      unsub();
    });

    it('should subscribe to ChainHead bestBlock events', () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.bestBlock).mockResolvedValue(mockBlock);
      vi.mocked(mockChainHead.on).mockReturnValue(() => {});

      const callback = vi.fn();
      explorer.best(callback);

      expect(mockChainHead.on).toHaveBeenCalledWith('bestBlock', expect.any(Function));
    });

    it('should convert PinnedBlock events to BlockInfo', async () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.bestBlock).mockResolvedValue(mockBlock);

      let eventHandler: (block: PinnedBlock) => void = () => {};
      vi.mocked(mockChainHead.on).mockImplementation((event, handler) => {
        eventHandler = handler as (block: PinnedBlock) => void;
        return () => {};
      });

      const callback = vi.fn();
      explorer.best(callback);

      // Wait for initial emission
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate event from ChainHead
      const newBlock = createMockPinnedBlock(43);
      eventHandler(newBlock);

      // Should convert to BlockInfo
      expect(callback).toHaveBeenCalledWith({
        hash: newBlock.hash,
        number: newBlock.number,
        parent: newBlock.parent,
      });
    });

    it('should unsubscribe cleanly', () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.bestBlock).mockResolvedValue(mockBlock);

      const mockUnsub = vi.fn();
      vi.mocked(mockChainHead.on).mockReturnValue(mockUnsub);

      const callback = vi.fn();
      const unsub = explorer.best(callback);

      unsub();

      expect(mockUnsub).toHaveBeenCalled();
    });
  });

  describe('finalized() - Query Mode', () => {
    it('should call ChainHead.finalizedBlock() and convert to BlockInfo', async () => {
      const mockBlock = createMockPinnedBlock(40);
      vi.mocked(mockChainHead.finalizedBlock).mockResolvedValue(mockBlock);

      const result = await explorer.finalized();

      expect(result).toEqual({
        hash: mockBlock.hash,
        number: mockBlock.number,
        parent: mockBlock.parent,
      });
      expect(mockChainHead.finalizedBlock).toHaveBeenCalledTimes(1);
    });
  });

  describe('finalized(callback) - Subscription Mode', () => {
    it('should emit current value immediately', async () => {
      const mockBlock = createMockPinnedBlock(40);
      vi.mocked(mockChainHead.finalizedBlock).mockResolvedValue(mockBlock);
      vi.mocked(mockChainHead.on).mockReturnValue(() => {});

      const callback = vi.fn();
      const unsub = explorer.finalized(callback);

      // Wait for initial emission
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({
        hash: mockBlock.hash,
        number: mockBlock.number,
        parent: mockBlock.parent,
      });

      unsub();
    });

    it('should subscribe to ChainHead finalizedBlock events', () => {
      const mockBlock = createMockPinnedBlock(40);
      vi.mocked(mockChainHead.finalizedBlock).mockResolvedValue(mockBlock);
      vi.mocked(mockChainHead.on).mockReturnValue(() => {});

      const callback = vi.fn();
      explorer.finalized(callback);

      expect(mockChainHead.on).toHaveBeenCalledWith('finalizedBlock', expect.any(Function));
    });
  });

  describe('header()', () => {
    it('should query header by hash', async () => {
      const hash = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const mockRawHeader = '0x1234'; // Mock encoded header
      vi.mocked(mockChainHead.header).mockResolvedValue(mockRawHeader);

      // Mock the header decoding
      const decodedHeader = {
        parentHash: '0xparent',
        number: 1,
        stateRoot: '0xstate',
        extrinsicsRoot: '0xextrinsics',
        digest: { logs: [] },
      };
      vi.spyOn($Header, 'tryDecode').mockReturnValue(decodedHeader as any);

      const result = await explorer.header(hash);

      expect(result).toEqual(decodedHeader);
      expect(mockChainHead.header).toHaveBeenCalledWith(hash);
    });

    it('should resolve hash via findBlock for number', async () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.findBlock).mockReturnValue(mockBlock);
      vi.mocked(mockChainHead.header).mockResolvedValue('0x1234');

      const decodedHeader = {
        parentHash: mockBlock.parent,
        number: mockBlock.number,
        stateRoot: '0xstate',
        extrinsicsRoot: '0xextrinsics',
        digest: { logs: [] },
      };
      vi.spyOn($Header, 'tryDecode').mockReturnValue(decodedHeader as any);

      const result = await explorer.header(42);

      expect(mockChainHead.findBlock).toHaveBeenCalledWith(42);
      expect(mockChainHead.header).toHaveBeenCalledWith(mockBlock.hash);
      expect(result).toEqual(decodedHeader);
    });

    it('should fallback to Archive if block not pinned', async () => {
      vi.mocked(mockChainHead.findBlock).mockReturnValue(undefined);
      vi.mocked(mockArchive.supported).mockResolvedValue(true);
      vi.mocked(mockArchive.hashByHeight).mockResolvedValue(['0xarchivehash']);
      vi.mocked(mockChainHead.header).mockResolvedValue('0x1234');

      const decodedHeader = {
        parentHash: '0xparent',
        number: 100,
        stateRoot: '0xstate',
        extrinsicsRoot: '0xextrinsics',
        digest: { logs: [] },
      };
      vi.spyOn($Header, 'tryDecode').mockReturnValue(decodedHeader as any);

      const result = await explorer.header(100);

      expect(mockArchive.supported).toHaveBeenCalled();
      expect(mockArchive.hashByHeight).toHaveBeenCalledWith(100);
      expect(mockChainHead.header).toHaveBeenCalledWith('0xarchivehash');
      expect(result).toEqual(decodedHeader);
    });

    it('should handle multiple hashes from Archive (take first)', async () => {
      vi.mocked(mockChainHead.findBlock).mockReturnValue(undefined);
      vi.mocked(mockArchive.supported).mockResolvedValue(true);
      vi.mocked(mockArchive.hashByHeight).mockResolvedValue(['0xhash1', '0xhash2', '0xhash3']);
      vi.mocked(mockChainHead.header).mockResolvedValue('0x1234');

      vi.spyOn($Header, 'tryDecode').mockReturnValue({
        parentHash: '0xparent',
        number: 100,
        stateRoot: '0xstate',
        extrinsicsRoot: '0xextrinsics',
        digest: { logs: [] },
      } as any);

      await explorer.header(100);

      // Should use first hash
      expect(mockChainHead.header).toHaveBeenCalledWith('0xhash1');
    });

    it('should throw if Archive not supported and block not pinned', async () => {
      vi.mocked(mockChainHead.findBlock).mockReturnValue(undefined);
      vi.mocked(mockArchive.supported).mockResolvedValue(false);

      await expect(explorer.header(100)).rejects.toThrow(
        'Block number 100 not found in pinned blocks and Archive is not supported',
      );
    });

    it('should throw if header not found', async () => {
      const hash = '0xnonexistent';
      vi.mocked(mockChainHead.header).mockResolvedValue(undefined);

      await expect(explorer.header(hash)).rejects.toThrow();
    });
  });

  describe('body()', () => {
    it('should query body by hash', async () => {
      const hash = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const mockBody: HexString[] = ['0xtx1', '0xtx2', '0xtx3'];
      vi.mocked(mockChainHead.body).mockResolvedValue(mockBody);

      const result = await explorer.body(hash);

      expect(result).toEqual(mockBody);
      expect(mockChainHead.body).toHaveBeenCalledWith(hash);
    });

    it('should resolve hash via findBlock for number', async () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.findBlock).mockReturnValue(mockBlock);
      vi.mocked(mockChainHead.body).mockResolvedValue(['0xtx1', '0xtx2']);

      const result = await explorer.body(42);

      expect(mockChainHead.findBlock).toHaveBeenCalledWith(42);
      expect(mockChainHead.body).toHaveBeenCalledWith(mockBlock.hash);
      expect(result).toHaveLength(2);
    });

    it('should fallback to Archive if block not pinned', async () => {
      vi.mocked(mockChainHead.findBlock).mockReturnValue(undefined);
      vi.mocked(mockArchive.supported).mockResolvedValue(true);
      vi.mocked(mockArchive.hashByHeight).mockResolvedValue(['0xarchivehash']);
      vi.mocked(mockChainHead.body).mockResolvedValue(['0xtx1']);

      const result = await explorer.body(100);

      expect(mockArchive.supported).toHaveBeenCalled();
      expect(mockArchive.hashByHeight).toHaveBeenCalledWith(100);
      expect(mockChainHead.body).toHaveBeenCalledWith('0xarchivehash');
      expect(result).toEqual(['0xtx1']);
    });

    it('should throw if Archive not supported and block not pinned', async () => {
      vi.mocked(mockChainHead.findBlock).mockReturnValue(undefined);
      vi.mocked(mockArchive.supported).mockResolvedValue(false);

      await expect(explorer.body(100)).rejects.toThrow(
        'Block number 100 not found in pinned blocks and Archive is not supported',
      );
    });
  });

  describe('toBlockHash (via header and body)', () => {
    it('should return hash if already a hash', async () => {
      const hash = '0x0000000000000000000000000000000000000000000000000000000000000001';
      vi.mocked(mockChainHead.header).mockResolvedValue('0x1234');

      vi.spyOn($Header, 'tryDecode').mockReturnValue({
        parentHash: '0xparent',
        number: 1,
        stateRoot: '0xstate',
        extrinsicsRoot: '0xextrinsics',
        digest: { logs: [] },
      } as any);

      await explorer.header(hash);

      expect(mockChainHead.findBlock).not.toHaveBeenCalled();
      expect(mockChainHead.header).toHaveBeenCalledWith(hash);
    });

    it('should find hash in pinned blocks', async () => {
      const mockBlock = createMockPinnedBlock(42);
      vi.mocked(mockChainHead.findBlock).mockReturnValue(mockBlock);
      vi.mocked(mockChainHead.header).mockResolvedValue('0x1234');

      vi.spyOn($Header, 'tryDecode').mockReturnValue({
        parentHash: mockBlock.parent,
        number: mockBlock.number,
        stateRoot: '0xstate',
        extrinsicsRoot: '0xextrinsics',
        digest: { logs: [] },
      } as any);

      await explorer.header(42);

      expect(mockChainHead.findBlock).toHaveBeenCalledWith(42);
      expect(mockArchive.supported).not.toHaveBeenCalled();
    });

    it('should use Archive if block not in pinned blocks', async () => {
      vi.mocked(mockChainHead.findBlock).mockReturnValue(undefined);
      vi.mocked(mockArchive.supported).mockResolvedValue(true);
      vi.mocked(mockArchive.hashByHeight).mockResolvedValue(['0xarchivehash']);
      vi.mocked(mockChainHead.header).mockResolvedValue('0x1234');

      vi.spyOn($Header, 'tryDecode').mockReturnValue({
        parentHash: '0xparent',
        number: 100,
        stateRoot: '0xstate',
        extrinsicsRoot: '0xextrinsics',
        digest: { logs: [] },
      } as any);

      await explorer.header(100);

      expect(mockChainHead.findBlock).toHaveBeenCalledWith(100);
      expect(mockArchive.supported).toHaveBeenCalled();
      expect(mockArchive.hashByHeight).toHaveBeenCalledWith(100);
    });

    it('should throw if no hash found via Archive', async () => {
      vi.mocked(mockChainHead.findBlock).mockReturnValue(undefined);
      vi.mocked(mockArchive.supported).mockResolvedValue(true);
      vi.mocked(mockArchive.hashByHeight).mockResolvedValue([]);

      await expect(explorer.header(100)).rejects.toThrow('No block found at height 100');
    });
  });

  describe('toBlockInfo conversion', () => {
    it('should correctly convert PinnedBlock to BlockInfo', async () => {
      const mockBlock: PinnedBlock = {
        hash: '0xhash',
        number: 42,
        parent: '0xparent',
        runtime: {
          specName: 'test',
          specVersion: 1,
          implName: 'test',
          implVersion: 1,
          transactionVersion: 1,
          apis: {},
        },
      };

      vi.mocked(mockChainHead.bestBlock).mockResolvedValue(mockBlock);

      const result = await explorer.best();

      // Should only include hash, number, parent (no runtime)
      expect(result).toEqual({
        hash: '0xhash',
        number: 42,
        parent: '0xparent',
      });
      expect(result).not.toHaveProperty('runtime');
    });
  });
});
