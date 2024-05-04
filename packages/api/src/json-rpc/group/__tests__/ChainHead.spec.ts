import {
  ChainHeadRuntimeVersion,
  MethodResponse,
  NewBlock,
  OperationBodyDone,
  OperationCallDone,
  OperationInaccessible,
  OperationStorageDone,
  OperationStorageItems,
  StorageQuery,
} from '@dedot/specs';
import { MockInstance } from '@vitest/spy';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MockProvider from '../../../client/__tests__/MockProvider.js';
import { IJsonRpcClient } from '../../../types.js';
import { JsonRpcClient } from '../../JsonRpcClient.js';
import { ChainHead, PinnedBlock } from '../ChainHead/index.js';
import { newChainHeadSimulator } from './simulator.js';

const MSG_CALL_FOLLOW_FIRST = 'Please call the .follow() method before invoking any other methods in this group.';

describe('ChainHead', () => {
  let chainHead: ChainHead;
  let provider: MockProvider;
  let client: IJsonRpcClient;
  let providerSend: MockInstance;
  let providerSubscribe: MockInstance;
  let simulator: ReturnType<typeof newChainHeadSimulator>;
  let initialRuntime: ChainHeadRuntimeVersion;

  const notify = (subscriptionId: string, data: Error | any, timeout = 0) => {
    setTimeout(() => {
      provider.notify(subscriptionId, data);
    }, timeout);

    return data;
  };

  beforeEach(() => {
    provider = new MockProvider();
    client = new JsonRpcClient({ provider });
    chainHead = new ChainHead(client);
    simulator = newChainHeadSimulator({ provider });
    initialRuntime = simulator.runtime;

    providerSend = vi.spyOn(provider, 'send');
    providerSubscribe = vi.spyOn(provider, 'subscribe');
  });

  describe('follow', () => {
    it('follows chain head successfully', async () => {
      notify(simulator.subscriptionId, simulator.initializedEvent);

      await chainHead.follow();

      expect(providerSend).toHaveBeenCalledWith('rpc_methods', []);
      expect(providerSubscribe).toHaveBeenCalledWith(
        {
          subname: 'chainHead_v1_followEvent',
          subscribe: 'chainHead_v1_follow',
          params: [true],
          unsubscribe: 'chainHead_v1_unfollow',
        },
        expect.any(Function),
      );
      expect(providerSend).toHaveBeenCalledWith('chainHead_v1_header', [simulator.subscriptionId, '0x00']);

      expect(await chainHead.runtimeVersion()).toEqual(initialRuntime);
      expect(await chainHead.bestRuntimeVersion()).toEqual(initialRuntime);
      expect(await chainHead.bestHash()).toEqual('0x0e');
      expect(await chainHead.finalizedHash()).toEqual('0x0e');
    });

    it('throws error when trying to follow chain head twice', async () => {
      notify(simulator.subscriptionId, simulator.initializedEvent);

      await chainHead.follow();

      await expect(chainHead.follow()).rejects.toThrow('Already followed chain head. Please unfollow first.');
    });
  });

  describe('unfollow', () => {
    it('unfollows chain head successfully', async () => {
      notify(simulator.subscriptionId, simulator.initializedEvent);

      await chainHead.follow();
      await chainHead.unfollow();

      expect(providerSend).toHaveBeenCalledWith('rpc_methods', []);
      expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unfollow', [simulator.subscriptionId]);

      await expect(chainHead.runtimeVersion()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.bestRuntimeVersion()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.bestHash()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.finalizedHash()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.body()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.header()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.storage([])).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
    });
  });

  describe('chainHead operations', () => {
    beforeEach(async () => {
      notify(simulator.subscriptionId, simulator.initializedEvent);

      await chainHead.follow();
    });

    describe('newBlock', () => {
      it('handle newBlock without runtime', async () => {
        const newBlock: NewBlock = notify(simulator.subscriptionId, simulator.nextNewBlock());

        await new Promise<void>((resolve) => {
          chainHead.on('newBlock', (block: PinnedBlock) => {
            expect(block.hash).toEqual(newBlock.blockHash);
            expect(block.runtime).toBeUndefined();
            resolve();
          });
        });
      });

      it('handle newBlock with runtime', async () => {
        const newBlock: NewBlock = notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));

        await new Promise<void>((resolve) => {
          chainHead.on('newBlock', (block: PinnedBlock) => {
            expect(block.hash).toEqual(newBlock.blockHash);
            // @ts-ignore
            expect(block.runtime).toEqual(newBlock.newRuntime.spec);
            resolve();
          });
        });
      });
    });

    describe('bestBlockChanged', () => {
      it('handle bestBlockChanged', async () => {
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        const newBlock2 = notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        const bestBlock1 = notify(simulator.subscriptionId, simulator.nextBestBlock());

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('bestBlock', async (block) => {
            expect(block.hash).toEqual(bestBlock1.bestBlockHash);
            expect(await chainHead.bestHash()).toEqual(block.hash);
            expect(block.runtime).toBeUndefined();

            unsub();
            resolve();
          });
        });

        const bestBlock2 = notify(simulator.subscriptionId, simulator.nextBestBlock(), 10);

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('bestBlock', async (block) => {
            expect(block.hash).toEqual(bestBlock2.bestBlockHash);
            expect(await chainHead.bestHash()).toEqual(block.hash);
            // @ts-ignore
            expect(newBlock2.newRuntime.spec).toEqual(block.runtime);
            expect(await chainHead.bestRuntimeVersion()).toEqual(block.runtime);

            unsub();
            resolve();
          });
        });
      });
    });

    describe('finalized', () => {
      it('handle finalized', async () => {
        const newBlock1 = notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
        const newBlock2 = notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        notify(simulator.subscriptionId, simulator.nextBestBlock());
        const finalized1 = notify(simulator.subscriptionId, simulator.nextFinalized());

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('finalizedBlock', async (block: PinnedBlock) => {
            expect(block.hash).toEqual(newBlock1.blockHash);
            expect(block.hash).toEqual(finalized1.finalizedBlockHashes.at(-1));
            await expect(chainHead.finalizedHash()).resolves.toEqual(block.hash);

            unsub();
            resolve();
          });
        });

        await new Promise<void>((resolve) => {
          setTimeout(() => {
            expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
              simulator.subscriptionId,
              ['0x0f-1', '0x00', '0x01', '0x02', '0x03', '0x04', '0x05'],
            ]);
            resolve();
          }, 10);
        });

        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        const bestBlock2 = simulator.nextBestBlock();
        notify(simulator.subscriptionId, bestBlock2);

        const finalized2 = simulator.nextFinalized();
        notify(simulator.subscriptionId, finalized2);

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('finalizedBlock', async (block: PinnedBlock) => {
            expect(block.hash).toEqual(finalized2.finalizedBlockHashes.at(-1));
            await expect(chainHead.finalizedHash()).resolves.toEqual(block.hash);
            // @ts-ignore
            expect(block.runtime).toEqual(newBlock2.newRuntime.spec);

            unsub();
            resolve();
          });
        });

        // 2 new blocks comes in, unpin 2 blocks at the back to the queue to maintain the queue size
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x06']]);
            resolve();
          }, 10);
        });
      });

      it('should finalize in favor of a fork chain', async () => {
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        const newForkedBlock = notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock({ fromWhichParentFork: 1, withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        notify(simulator.subscriptionId, simulator.nextBestBlock(1));
        const finalized1 = notify(simulator.subscriptionId, simulator.nextFinalized(1));

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('finalizedBlock', async (block: PinnedBlock) => {
            expect(block.hash).toEqual(newForkedBlock.blockHash);
            expect(block.hash).toEqual(finalized1.finalizedBlockHashes.at(-1));
            await expect(chainHead.finalizedHash()).resolves.toEqual(block.hash);

            unsub();
            resolve();
          });
        });

        // 4 new blocks on top of 15 initial blocks, 1 pruned block 0x0f, unpin 5 blocks to maintain the queue size
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
              simulator.subscriptionId,
              ['0x0f', '0x00', '0x01', '0x02', '0x03', '0x04', '0x05'],
            ]);
            resolve();
          }, 10);
        });
      });

      it('should unpin block at the same height as finalized blocks', async () => {
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        const newForkedBlock = notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock({ fromWhichParentFork: 1, withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        notify(simulator.subscriptionId, simulator.nextBestBlock(1));
        const finalized1 = notify(simulator.subscriptionId, simulator.nextFinalized(1, false));

        expect(finalized1.prunedBlockHashes).toEqual([]);

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('finalizedBlock', async (block: PinnedBlock) => {
            expect(block.hash).toEqual(newForkedBlock.blockHash);
            expect(block.hash).toEqual(finalized1.finalizedBlockHashes.at(-1));
            await expect(chainHead.finalizedHash()).resolves.toEqual(block.hash);

            unsub();
            resolve();
          });
        });

        // 4 new blocks on top of 15 initial blocks, 1 pruned block 0x0f, unpin 5 blocks to maintain the queue size
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
              simulator.subscriptionId,
              ['0x0f', '0x00', '0x01', '0x02', '0x03', '0x04', '0x05'],
            ]);
            resolve();
          }, 10);
        });
      });
    });

    describe('chainHead_body', () => {
      it('calls body successfully', async () => {
        provider.setRpcRequest(
          'chainHead_v1_body',
          () => ({ result: 'started', operationId: 'body01' }) as MethodResponse,
        );

        notify(simulator.subscriptionId, {
          operationId: 'body01',
          event: 'operationBodyDone',
          value: ['0x1111'],
        } as OperationBodyDone);

        const result = await chainHead.body();
        expect(result).toEqual(['0x1111']);

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_body', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
        ]);
        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'body01',
        ]);
      });

      it('should retry on OperationInaccessible', async () => {
        provider.setRpcRequest(
          'chainHead_v1_body',
          () => ({ result: 'started', operationId: 'body02' }) as MethodResponse,
        );

        notify(simulator.subscriptionId, {
          operationId: 'body02',
          event: 'operationInaccessible',
        } as OperationInaccessible);

        notify(
          simulator.subscriptionId,
          {
            operationId: 'body02',
            event: 'operationBodyDone',
            value: ['0x1111'],
          } as OperationBodyDone,
          10,
        );

        const result = await chainHead.body();
        expect(result).toEqual(['0x1111']);

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_body', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'body02',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_body', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
        ]);
        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'body02',
        ]);
      });

      it('should retry on limit reached', async () => {
        let count = 0;
        provider.setRpcRequest('chainHead_v1_body', () => {
          count += 1;
          if (count > 2) {
            return { result: 'started', operationId: 'body02' } as MethodResponse;
          } else {
            return { result: 'limitReached' } as MethodResponse;
          }
        });

        notify(
          simulator.subscriptionId,
          {
            operationId: 'body02',
            event: 'operationBodyDone',
            value: ['0x1111'],
          } as OperationBodyDone,
          10,
        );

        const result = await chainHead.body();
        expect(result).toEqual(['0x1111']);

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_body', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
        ]);
        // 2 retries
        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_body', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_body', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(7, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'body02',
        ]);
      });
    });

    describe('chainHead_call', () => {
      it('calls call successfully', async () => {
        provider.setRpcRequest(
          'chainHead_v1_call',
          () => ({ result: 'started', operationId: 'call01' }) as MethodResponse,
        );

        notify(simulator.subscriptionId, {
          operationId: 'call01',
          event: 'operationCallDone',
          output: '0x1111',
        } as OperationCallDone);

        const result = await chainHead.call('func', '0x');
        expect(result).toEqual('0x1111');

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_call', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'call01',
        ]);
      });

      it('should retry on OperationInaccessible', async () => {
        provider.setRpcRequest(
          'chainHead_v1_call',
          () => ({ result: 'started', operationId: 'call02' }) as MethodResponse,
        );

        notify(simulator.subscriptionId, {
          operationId: 'call02',
          event: 'operationInaccessible',
        } as OperationInaccessible);

        notify(
          simulator.subscriptionId,
          {
            operationId: 'call02',
            event: 'operationCallDone',
            output: '0x1111',
          } as OperationCallDone,
          10,
        );

        const result = await chainHead.call('func', '0x');
        expect(result).toEqual('0x1111');

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_call', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'call02',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_call', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'call02',
        ]);
      });

      it('should retry on limit reached', async () => {
        let count = 0;
        provider.setRpcRequest('chainHead_v1_call', () => {
          count += 1;
          if (count > 2) {
            return { result: 'started', operationId: 'call02' } as MethodResponse;
          } else {
            return { result: 'limitReached' } as MethodResponse;
          }
        });

        notify(
          simulator.subscriptionId,
          {
            operationId: 'call02',
            event: 'operationCallDone',
            output: '0x1111',
          } as OperationCallDone,
          10,
        );

        const result = await chainHead.call('func', '0x');
        expect(result).toEqual('0x1111');

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_call', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          'func',
          '0x',
        ]);
        // 2 retries
        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_call', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_call', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          'func',
          '0x',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(7, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'call02',
        ]);
      });
    });

    describe('chainHead_storage', () => {
      it('calls storage successfully', async () => {
        const storageItems = [
          { key: '0xkey01', value: '0xvalue01' },
          { key: '0xkey02', value: '0xvalue02' },
        ];

        provider.setRpcRequest(
          'chainHead_v1_storage',
          () => ({ result: 'started', operationId: 'storage01' }) as MethodResponse,
        );

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageItems',
          items: storageItems,
        } as OperationStorageItems);

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageDone',
        } as OperationStorageDone);

        const queries: StorageQuery[] = [
          { key: '0xkey01', type: 'value' },
          { key: '0xkey02', type: 'value' },
        ];

        const result = await chainHead.storage(queries);
        expect(result).toEqual(storageItems);

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries,
          null,
        ]);
        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'storage01',
        ]);
      });

      it('should retry on OperationInaccessible', async () => {
        const storageItems = [
          { key: '0xkey01', value: '0xvalue01' },
          { key: '0xkey02', value: '0xvalue02' },
        ];

        provider.setRpcRequest(
          'chainHead_v1_storage',
          () => ({ result: 'started', operationId: 'storage01' }) as MethodResponse,
        );

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationInaccessible',
        } as OperationInaccessible);

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageItems',
          items: storageItems,
        } as OperationStorageItems);

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageDone',
        } as OperationStorageDone);

        const queries: StorageQuery[] = [
          { key: '0xkey01', type: 'value' },
          { key: '0xkey02', type: 'value' },
        ];

        const result = await chainHead.storage(queries);
        expect(result).toEqual(storageItems);

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries,
          null,
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'storage01',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries,
          null,
        ]);

        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'storage01',
        ]);
      });

      it('should handle discardedItems', async () => {
        const storageItemsBatch1 = [
          { key: '0xkey01', value: '0xvalue01' },
          { key: '0xkey02', value: '0xvalue02' },
        ];
        const storageItemsBatch2 = [
          { key: '0xkey03', value: '0xvalue03' },
          { key: '0xkey04', value: '0xvalue04' },
        ];

        let callCounter = 0;
        provider.setRpcRequest('chainHead_v1_storage', () => {
          callCounter += 1;
          if (callCounter === 1) {
            return { result: 'started', operationId: 'storage01', discardedItems: 2 } as MethodResponse;
          } else {
            return { result: 'started', operationId: 'storage02' } as MethodResponse;
          }
        });

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageItems',
          items: storageItemsBatch1,
        } as OperationStorageItems);

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageDone',
        } as OperationStorageDone);

        notify(simulator.subscriptionId, {
          operationId: 'storage02',
          event: 'operationStorageItems',
          items: storageItemsBatch2,
        } as OperationStorageItems);

        notify(simulator.subscriptionId, {
          operationId: 'storage02',
          event: 'operationStorageDone',
        } as OperationStorageDone);

        const queries: StorageQuery[] = [
          { key: '0xkey01', type: 'value' },
          { key: '0xkey02', type: 'value' },
          { key: '0xkey03', type: 'value' },
          { key: '0xkey04', type: 'value' },
        ];

        const result = await chainHead.storage(queries);
        expect(result).toEqual([...storageItemsBatch1, ...storageItemsBatch2]);

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries,
          null,
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'storage01',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries.slice(2),
          null,
        ]);

        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'storage02',
        ]);
      });

      it('should retry on limit reached', async () => {
        const storageItems = [
          { key: '0xkey01', value: '0xvalue01' },
          { key: '0xkey02', value: '0xvalue02' },
        ];

        let count = 0;
        provider.setRpcRequest('chainHead_v1_storage', () => {
          count += 1;
          if (count > 2) {
            return { result: 'started', operationId: 'storage01' } as MethodResponse;
          } else {
            return { result: 'limitReached' } as MethodResponse;
          }
        });

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageItems',
          items: storageItems,
        } as OperationStorageItems);

        notify(simulator.subscriptionId, {
          operationId: 'storage01',
          event: 'operationStorageDone',
        } as OperationStorageDone);

        const queries: StorageQuery[] = [
          { key: '0xkey01', type: 'value' },
          { key: '0xkey02', type: 'value' },
        ];

        const result = await chainHead.storage(queries);
        expect(result).toEqual(storageItems);

        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries,
          null,
        ]);

        // 2 retries
        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries,
          null,
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_storage', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
          queries,
          null,
        ]);

        expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'storage01',
        ]);
      });
    });

    describe('verify non-operational methods', () => {
      it('calls header', async () => {
        await chainHead.header();

        expect(providerSend).toHaveBeenCalledWith('chainHead_v1_header', [
          simulator.subscriptionId,
          await chainHead.bestHash(),
        ]);
      });
    });
  });
});
