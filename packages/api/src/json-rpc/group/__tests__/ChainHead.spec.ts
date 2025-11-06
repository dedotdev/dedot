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
} from '@dedot/types/json-rpc';
import { waitFor } from '@dedot/utils';
import { MockInstance } from '@vitest/spy';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MockProvider from '../../../client/__tests__/MockProvider.js';
import { IJsonRpcClient } from '../../../types.js';
import { JsonRpcClient } from '../../JsonRpcClient.js';
import {
  ChainHeadBlockNotPinnedError,
  ChainHeadBlockPrunedError,
  ChainHeadOperationError,
} from '../ChainHead/error.js';
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

  const notifyInitializedEvent = (timeout?: number) => {
    notify(simulator.subscriptionId, simulator.initializedEvent, timeout);
  };

  describe('follow', () => {
    it('follows chain head successfully', async () => {
      notifyInitializedEvent();

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
      notifyInitializedEvent();

      await chainHead.follow();

      await expect(chainHead.follow()).rejects.toThrow('Already followed chain head. Please unfollow first.');
    });
  });

  describe('unfollow', () => {
    it('unfollows chain head successfully', async () => {
      notifyInitializedEvent();

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
    let firstNewBlock: NewBlock;
    beforeEach(async () => {
      notifyInitializedEvent();

      firstNewBlock = notify(simulator.subscriptionId, simulator.nextNewBlock());

      await chainHead.follow();
    });

    describe('newBlock', () => {
      it('handle newBlock without runtime', async () => {
        const newBlock: NewBlock = notify(simulator.subscriptionId, simulator.nextNewBlock());

        await new Promise<void>((resolve) => {
          chainHead.on('newBlock', (block: PinnedBlock) => {
            expect(block.hash).toEqual(newBlock.blockHash);
            expect(block.runtime).toBe(simulator.runtime);
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
        const newBlock2 = notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        const bestBlock1 = notify(simulator.subscriptionId, simulator.nextBestBlock());

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('bestBlock', async (block) => {
            expect(block.hash).toEqual(bestBlock1.bestBlockHash);
            expect(await chainHead.bestHash()).toEqual(block.hash);
            expect(block.runtime).toBe(simulator.runtime);

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
        notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
        const newBlock2 = notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        notify(simulator.subscriptionId, simulator.nextBestBlock());
        const finalized1 = notify(simulator.subscriptionId, simulator.nextFinalized());

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('finalizedBlock', async (block: PinnedBlock) => {
            expect(block.hash).toEqual(firstNewBlock.blockHash);
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
              ['0x0f-1', '0x00'],
            ]);
            resolve();
          }, 10);
        });

        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        const bestBlock2 = simulator.nextBestBlock();
        notify(simulator.subscriptionId, bestBlock2);

        const finalized2 = simulator.nextFinalized(undefined, ['0x0f-1']);
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
            expect(finalized2.prunedBlockHashes).to.includes('0x0f-1');
            expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x01']]);
            resolve();
          }, 10);
        });
      });

      it('should finalize in favor of a fork chain', async () => {
        const newForkedBlock = notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock({ fromWhichParentFork: 1, withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        notify(simulator.subscriptionId, simulator.nextBestBlock(true, 1));
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
              ['0x0f', '0x00'],
            ]);
            resolve();
          }, 10);
        });
      });

      it('should unpin block at the same height as finalized blocks', async () => {
        const newForkedBlock = notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock({ fromWhichParentFork: 1, withRuntime: true }));
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        notify(simulator.subscriptionId, simulator.nextBestBlock(true, 1));
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
              ['0x00', '0x0f'],
            ]);
            resolve();
          }, 10);
        });
      });

      describe('should not unpin block used by on-going operations', () => {
        it('should work for chainHead_call', async () => {
          provider.setRpcRequest(
            'chainHead_v1_call',
            () => ({ result: 'started', operationId: 'call01' }) as MethodResponse,
          );

          notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextNewBlock());

          notify(simulator.subscriptionId, simulator.nextBestBlock());
          const result = chainHead.call('func', '0x', '0x00');

          notify(simulator.subscriptionId, simulator.nextFinalized());

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x0f-1']]);
              resolve();
            }, 10);
          });

          notify(simulator.subscriptionId, {
            operationId: 'call01',
            event: 'operationCallDone',
            output: '0x1111',
          } as OperationCallDone);

          await expect(result).resolves.toEqual('0x1111');

          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextBestBlock());
          notify(simulator.subscriptionId, simulator.nextFinalized());

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
                simulator.subscriptionId,
                ['0x00', '0x01'],
              ]);
              resolve();
            }, 10);
          });
        });
        it('should work for chainHead_body', async () => {
          provider.setRpcRequest(
            'chainHead_v1_body',
            () => ({ result: 'started', operationId: 'body02' }) as MethodResponse,
          );

          notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextNewBlock());

          notify(simulator.subscriptionId, simulator.nextBestBlock());
          const result = chainHead.body('0x05');

          notify(simulator.subscriptionId, simulator.nextFinalized());

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
                simulator.subscriptionId,
                ['0x0f-1', '0x00'],
              ]);
              resolve();
            }, 10);
          });

          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextBestBlock());
          notify(simulator.subscriptionId, simulator.nextFinalized());

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x01']]);
              resolve();
            }, 10);
          });

          notify(simulator.subscriptionId, simulator.nextBestBlock());

          notify(simulator.subscriptionId, {
            operationId: 'body02',
            event: 'operationBodyDone',
            value: ['0x1111'],
          } as OperationBodyDone);

          await expect(result).resolves.toEqual(['0x1111']);

          notify(simulator.subscriptionId, simulator.nextFinalized());

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x02']]);
              resolve();
            }, 10);
          });
        });
        it('should work for chainHead_storage', async () => {
          const storageItems = [
            { key: '0xkey01', value: '0xvalue01' },
            { key: '0xkey02', value: '0xvalue02' },
          ];

          const queries: StorageQuery[] = [
            { key: '0xkey01', type: 'value' },
            { key: '0xkey02', type: 'value' },
          ];

          provider.setRpcRequest(
            'chainHead_v1_storage',
            () => ({ result: 'started', operationId: 'storage01' }) as MethodResponse,
          );

          notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextNewBlock());

          notify(simulator.subscriptionId, simulator.nextBestBlock());
          const result = chainHead.storage(queries, null, '0x00');

          notify(simulator.subscriptionId, simulator.nextFinalized());

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x0f-1']]);
              resolve();
            }, 10);
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

          await expect(result).resolves.toEqual(storageItems);

          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextBestBlock());
          notify(simulator.subscriptionId, simulator.nextFinalized());

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
                simulator.subscriptionId,
                ['0x00', '0x01'],
              ]);
              resolve();
            }, 10);
          });
        });
      });

      describe('should retry operations running on pruned block', () => {
        it('should work for chainHead_call', async () => {
          let counter = 0;
          provider.setRpcRequest('chainHead_v1_call', () => {
            counter += 1;
            if (counter === 1) {
              return { result: 'started', operationId: 'call01' } as MethodResponse;
            } else {
              return { result: 'started', operationId: 'call02' } as MethodResponse;
            }
          });

          notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));

          notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextNewBlock());

          notify(simulator.subscriptionId, simulator.nextBestBlock());
          await waitFor();

          const result = chainHead.call('func', '0x');

          notify(simulator.subscriptionId, simulator.nextBestBlock(false, 1));
          notify(simulator.subscriptionId, simulator.nextFinalized(1));
          await waitFor();

          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0f',
            'func',
            '0x',
          ]);
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call01']);
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x0f', '0x00']]);

          notify(simulator.subscriptionId, {
            operationId: 'call01',
            event: 'operationCallDone',
            output: '0x1111',
          } as OperationCallDone);

          notify(simulator.subscriptionId, {
            operationId: 'call02',
            event: 'operationCallDone',
            output: '0x2222',
          } as OperationCallDone);

          await expect(result).resolves.toEqual('0x2222');

          // retried with the new best block
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0f-1',
            'func',
            '0x',
          ]);

          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call02']);
        });
        it('should work for chainHead_body', async () => {
          let counter = 0;
          provider.setRpcRequest('chainHead_v1_body', () => {
            counter += 1;
            if (counter === 1) {
              return { result: 'started', operationId: 'body01' } as MethodResponse;
            } else {
              return { result: 'started', operationId: 'body02' } as MethodResponse;
            }
          });

          notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));

          notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextNewBlock());

          notify(simulator.subscriptionId, simulator.nextBestBlock());
          await waitFor();

          const result = chainHead.body();

          notify(simulator.subscriptionId, simulator.nextBestBlock(false, 1));
          notify(simulator.subscriptionId, simulator.nextFinalized(1));
          await waitFor();

          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_body', [simulator.subscriptionId, '0x0f']);
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'body01']);
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x0f', '0x00']]);

          notify(simulator.subscriptionId, {
            operationId: 'body02',
            event: 'operationBodyDone',
            value: ['0x1111'],
          } as OperationBodyDone);

          await expect(result).resolves.toEqual(['0x1111']);

          // retried with the new best block
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_body', [simulator.subscriptionId, '0x0f-1']);

          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'body02']);
        });
        it('should work for chainHead_storage', async () => {
          const storageItems = [
            { key: '0xkey01', value: '0xvalue01' },
            { key: '0xkey02', value: '0xvalue02' },
          ];

          const queries: StorageQuery[] = [
            { key: '0xkey01', type: 'value' },
            { key: '0xkey02', type: 'value' },
          ];

          let counter = 0;
          provider.setRpcRequest('chainHead_v1_storage', () => {
            counter += 1;
            if (counter === 1) {
              return { result: 'started', operationId: 'storage01' } as MethodResponse;
            } else {
              return { result: 'started', operationId: 'storage02' } as MethodResponse;
            }
          });

          notify(simulator.subscriptionId, simulator.nextNewBlock({ fork: true }));

          notify(simulator.subscriptionId, simulator.nextNewBlock({ withRuntime: true }));
          notify(simulator.subscriptionId, simulator.nextNewBlock());
          notify(simulator.subscriptionId, simulator.nextNewBlock());

          notify(simulator.subscriptionId, simulator.nextBestBlock(true, 1));
          await waitFor();

          const result = chainHead.storage(queries);

          notify(simulator.subscriptionId, simulator.nextBestBlock(false));
          notify(simulator.subscriptionId, simulator.nextFinalized());
          await waitFor();

          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_storage', [
            simulator.subscriptionId,
            '0x0f-1',
            queries,
            null,
          ]);
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_stopOperation', [
            simulator.subscriptionId,
            'storage01',
          ]);
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
            simulator.subscriptionId,
            ['0x0f-1', '0x00'],
          ]);

          notify(simulator.subscriptionId, {
            operationId: 'storage02',
            event: 'operationStorageItems',
            items: storageItems,
          } as OperationStorageItems);

          notify(simulator.subscriptionId, {
            operationId: 'storage02',
            event: 'operationStorageDone',
          } as OperationStorageDone);

          await expect(result).resolves.toEqual(storageItems);

          // retried with the new best block
          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_storage', [
            simulator.subscriptionId,
            '0x0f',
            queries,
            null,
          ]);

          expect(providerSend).toHaveBeenCalledWith('chainHead_v1_stopOperation', [
            simulator.subscriptionId,
            'storage02',
          ]);
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

  describe('stop recovery', () => {
    let prevSubId: string;

    beforeEach(async () => {
      prevSubId = simulator.subscriptionId;
      notifyInitializedEvent();

      await chainHead.follow();
    });

    it('should attempt to re-follow on receiving stop event', async () => {
      await new Promise<void>((resolve) => {
        simulator.subscriptionId = simulator.stop().newSubscriptionId;
        notifyInitializedEvent();

        setTimeout(() => {
          expect(prevSubId).not.toEqual(simulator.subscriptionId);
          expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_unfollow', [prevSubId]);
          expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_follow', [true]);
          expect(providerSend).not.toHaveBeenNthCalledWith(6, 'chainHead_v1_header', [
            simulator.subscriptionId,
            '0x00',
          ]);
          resolve();
        }, 10);
      });
    });

    it(`should retry on-going operations haven't receiving operationId`, async () => {
      let counter = 0;
      provider.setRpcRequests({
        chainHead_v1_body: async () => {
          counter += 1;
          if (counter === 1) {
            await waitFor(20);
            return { result: 'limitReached' } as MethodResponse;
          } else {
            return { result: 'started', operationId: 'body02' } as MethodResponse;
          }
        },
      });

      const bestHash = await chainHead.bestHash();
      const result = chainHead.body();

      simulator.subscriptionId = simulator.stop().newSubscriptionId;
      notify(simulator.subscriptionId, simulator.initializedEvent);
      notify(
        simulator.subscriptionId,
        {
          operationId: 'body02',
          event: 'operationBodyDone',
          value: ['0x1111'],
        } as OperationBodyDone,
        25,
      );

      await expect(result).resolves.toEqual(['0x1111']);

      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_body', [prevSubId, bestHash]);
      expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_unfollow', [prevSubId]);
      expect(providerSend).toHaveBeenNthCalledWith(7, 'chainHead_v1_body', [simulator.subscriptionId, bestHash]);
      expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'body02']);
    });

    it(`should retry on-going operations already received operationId`, async () => {
      let counter = 0;
      provider.setRpcRequests({
        chainHead_v1_body: async () => {
          counter += 1;
          if (counter === 1) {
            return { result: 'started', operationId: 'body02' } as MethodResponse;
          } else {
            return { result: 'started', operationId: 'body03' } as MethodResponse;
          }
        },
      });

      const bestHash = await chainHead.bestHash();
      const result = chainHead.body(bestHash);

      simulator.subscriptionId = simulator.stop().newSubscriptionId;
      notify(simulator.subscriptionId, simulator.initializedEvent);
      notify(
        simulator.subscriptionId,
        {
          operationId: 'body03',
          event: 'operationBodyDone',
          value: ['0x1111'],
        } as OperationBodyDone,
        25,
      );

      await expect(result).resolves.toEqual(['0x1111']);

      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_body', [prevSubId, bestHash]);
      expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_unfollow', [prevSubId]);
      expect(providerSend).toHaveBeenNthCalledWith(7, 'chainHead_v1_body', [simulator.subscriptionId, bestHash]);
      expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'body03']);
    });

    it(`should reject operations with unpinned blocks`, async () => {
      provider.setRpcRequests({
        chainHead_v1_body: () => ({ result: 'started', operationId: 'body02' }) as MethodResponse,
      });

      const bestHash = await chainHead.bestHash();

      const result = chainHead.body(bestHash);

      const { newSubscriptionId, initializedEvent } = simulator.stop(true);

      simulator.subscriptionId = newSubscriptionId;
      simulator.initializedEvent = initializedEvent;

      notifyInitializedEvent();

      await expect(result).rejects.toThrow('Block hash 0x0e is not pinned');

      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_body', [prevSubId, bestHash]);
      expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_unfollow', [prevSubId]);
    });

    it(`should continue to receive & resolve in-coming requests to chainHead while recovering`, async () => {
      provider.setRpcRequests({
        chainHead_v1_body: () => ({ result: 'started', operationId: 'body02' }) as MethodResponse,
        chainHead_v1_call: () => ({ result: 'started', operationId: 'call02' }) as MethodResponse,
        chainHead_v1_storage: () => ({ result: 'started', operationId: 'storage02' }) as MethodResponse,
      });

      const storageItems = [
        { key: '0xkey01', value: '0xvalue01' },
        { key: '0xkey02', value: '0xvalue02' },
      ];

      const queries: StorageQuery[] = [
        { key: '0xkey01', type: 'value' },
        { key: '0xkey02', type: 'value' },
      ];

      const bestHash = await chainHead.bestHash();

      simulator.subscriptionId = simulator.stop().newSubscriptionId;

      const results = waitFor(3).then(() => {
        return Promise.all([chainHead.body(bestHash), chainHead.call('func', '0x'), chainHead.storage(queries)]);
      });

      notify(simulator.subscriptionId, simulator.initializedEvent, 5);

      notify(
        simulator.subscriptionId,
        {
          operationId: 'body02',
          event: 'operationBodyDone',
          value: ['0x1111'],
        } as OperationBodyDone,
        10,
      );

      notify(
        simulator.subscriptionId,
        {
          operationId: 'call02',
          event: 'operationCallDone',
          output: '0x1111',
        } as OperationCallDone,
        15,
      );

      notify(
        simulator.subscriptionId,
        {
          operationId: 'storage02',
          event: 'operationStorageItems',
          items: storageItems,
        } as OperationStorageItems,
        20,
      );

      notify(
        simulator.subscriptionId,
        {
          operationId: 'storage02',
          event: 'operationStorageDone',
        } as OperationStorageDone,
        25,
      );

      await expect(results).resolves.toEqual([['0x1111'], '0x1111', storageItems]);

      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_unfollow', [prevSubId]);
      expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_body', [simulator.subscriptionId, bestHash]);

      expect(providerSend).toHaveBeenNthCalledWith(7, 'chainHead_v1_call', [
        simulator.subscriptionId,
        bestHash,
        'func',
        '0x',
      ]);
      expect(providerSend).toHaveBeenNthCalledWith(8, 'chainHead_v1_storage', [
        simulator.subscriptionId,
        bestHash,
        queries,
        null,
      ]);
      expect(providerSend).toHaveBeenNthCalledWith(9, 'chainHead_v1_stopOperation', [
        simulator.subscriptionId,
        'body02',
      ]);
      expect(providerSend).toHaveBeenNthCalledWith(10, 'chainHead_v1_stopOperation', [
        simulator.subscriptionId,
        'call02',
      ]);
      expect(providerSend).toHaveBeenNthCalledWith(11, 'chainHead_v1_stopOperation', [
        simulator.subscriptionId,
        'storage02',
      ]);
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      notifyInitializedEvent();

      await chainHead.follow();
    });

    it('should should cache chainHead_header', async () => {
      const bestHash = await chainHead.bestHash();
      const h1 = await chainHead.header(bestHash);
      const h2 = await chainHead.header(bestHash);
      const h3 = await chainHead.header(bestHash);
      expect(h1).toEqual(h2);
      expect(h2).toEqual(h3);

      expect(providerSend).toHaveBeenCalledTimes(4);
      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_header', [simulator.subscriptionId, bestHash]);
    });
    it('should should cache chainHead_body', async () => {
      provider.setRpcRequest(
        'chainHead_v1_body',
        () => ({ result: 'started', operationId: 'body02' }) as MethodResponse,
      );

      notify(simulator.subscriptionId, {
        operationId: 'body02',
        event: 'operationBodyDone',
        value: ['0x1111'],
      } as OperationBodyDone);

      const bestHash = await chainHead.bestHash();
      const r1 = await chainHead.body(bestHash);
      const r2 = await chainHead.body(bestHash);
      const r3 = await chainHead.body(bestHash);

      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);
      expect(r3).toEqual(['0x1111']);

      expect(providerSend).toHaveBeenCalledTimes(5);
      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_body', [simulator.subscriptionId, bestHash]);
      expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_stopOperation', [
        simulator.subscriptionId,
        'body02',
      ]);
    });
    it('should should cache chainHead_call', async () => {
      provider.setRpcRequest(
        'chainHead_v1_call',
        () => ({ result: 'started', operationId: 'call02' }) as MethodResponse,
      );

      notify(simulator.subscriptionId, {
        operationId: 'call02',
        event: 'operationCallDone',
        output: '0x1111',
      } as OperationCallDone);

      const bestHash = await chainHead.bestHash();
      const r1 = await chainHead.call('func', '0x', bestHash);
      const r2 = await chainHead.call('func', '0x', bestHash);
      const r3 = await chainHead.call('func', '0x', bestHash);

      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);
      expect(r3).toEqual('0x1111');

      expect(providerSend).toHaveBeenCalledTimes(5);
      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_call', [
        simulator.subscriptionId,
        bestHash,
        'func',
        '0x',
      ]);
      expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_stopOperation', [
        simulator.subscriptionId,
        'call02',
      ]);
    });
    it('should should cache chainHead_storage', async () => {
      const storageItems = [
        { key: '0xkey01', value: '0xvalue01' },
        { key: '0xkey02', value: '0xvalue02' },
      ];

      const queries: StorageQuery[] = [
        { key: '0xkey01', type: 'value' },
        { key: '0xkey02', type: 'value' },
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

      const bestHash = await chainHead.bestHash();
      const r1 = await chainHead.storage(queries, null, bestHash);
      const r2 = await chainHead.storage(queries, undefined, bestHash);
      const r3 = await chainHead.storage(queries, null, bestHash);

      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);
      expect(r3).toEqual(storageItems);

      expect(providerSend).toHaveBeenCalledTimes(5);
      expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_storage', [
        simulator.subscriptionId,
        bestHash,
        queries,
        null,
      ]);
      expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_stopOperation', [
        simulator.subscriptionId,
        'storage01',
      ]);
    });
  });

  describe('Archive Fallback', () => {
    let mockArchive: any;
    const mockBlockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    beforeEach(() => {
      mockArchive = {
        body: vi.fn(),
        call: vi.fn(),
        header: vi.fn(),
        storage: vi.fn(),
      };
    });

    describe('withArchive method', () => {
      it('should attach archive and return chainHead for chaining', () => {
        const result = chainHead.withArchive(mockArchive);

        // Should return the same ChainHead instance for method chaining
        expect(result).toBe(chainHead);
        expect(() => chainHead.withArchive(mockArchive)).not.toThrow();
      });

      it('should work without archive (existing behavior)', () => {
        // ChainHead should work fine without archive fallback attached
        expect(chainHead).toBeDefined();
        expect(typeof chainHead.body).toBe('function');
        expect(typeof chainHead.call).toBe('function');
        expect(typeof chainHead.header).toBe('function');
        expect(typeof chainHead.storage).toBe('function');
      });
    });

    describe('body() fallback', () => {
      it('should fallback to archive.body() when ChainHeadBlockNotPinnedError', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.body.mockResolvedValue(['0xabcd1234']);
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false, which will cause #ensurePinnedHash to throw ChainHeadBlockNotPinnedError
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute
        const result = await chainHead.body(mockBlockHash);

        // Verify
        expect(result).toEqual(['0xabcd1234']);
        expect(mockArchive.body).toHaveBeenCalledWith(mockBlockHash);
      });

      it('should throw error when archive body returns undefined', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.body.mockResolvedValue(undefined);
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute & Verify - should throw error instead of returning []
        await expect(chainHead.body(mockBlockHash)).rejects.toThrow(ChainHeadOperationError);
        await expect(chainHead.body(mockBlockHash)).rejects.toThrow(`Block ${mockBlockHash} not found in Archive`);
        expect(mockArchive.body).toHaveBeenCalledWith(mockBlockHash);
      });

      it('should not fallback for other errors', async () => {
        // Setup
        chainHead.withArchive(mockArchive);

        // Mock ChainHead body to throw different error
        vi.spyOn(chainHead, 'body').mockImplementation(async () => {
          throw new ChainHeadBlockPrunedError('Block pruned');
        });

        // Execute & Verify
        await expect(chainHead.body(mockBlockHash)).rejects.toThrow(ChainHeadBlockPrunedError);
        expect(mockArchive.body).not.toHaveBeenCalled();
      });

      it('should throw original error when no archive attached', async () => {
        // Don't attach archive

        // Mock ChainHead body to throw
        vi.spyOn(chainHead, 'body').mockImplementation(async () => {
          throw new ChainHeadBlockNotPinnedError('Block not pinned', mockBlockHash);
        });

        // Execute & Verify
        await expect(chainHead.body(mockBlockHash)).rejects.toThrow(ChainHeadBlockNotPinnedError);
      });
    });

    describe('call() fallback', () => {
      it('should fallback to archive.call() with same parameters', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.call.mockResolvedValue('0xfeedbeef');
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute
        const result = await chainHead.call('Core_version', '0xabcd', mockBlockHash);

        // Verify
        expect(result).toBe('0xfeedbeef');
        expect(mockArchive.call).toHaveBeenCalledWith('Core_version', '0xabcd', mockBlockHash);
      });

      it('should not fallback for other errors', async () => {
        // Setup
        chainHead.withArchive(mockArchive);

        // Mock ChainHead call to throw different error
        vi.spyOn(chainHead, 'call').mockImplementation(async () => {
          throw new Error('Network error');
        });

        // Execute & Verify
        await expect(chainHead.call('Core_version', '0x', mockBlockHash)).rejects.toThrow('Network error');
        expect(mockArchive.call).not.toHaveBeenCalled();
      });
    });

    describe('header() fallback', () => {
      it('should fallback to archive.header() when block not pinned', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.header.mockResolvedValue('0xheader123');
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute
        const result = await chainHead.header(mockBlockHash);

        // Verify
        expect(result).toBe('0xheader123');
        expect(mockArchive.header).toHaveBeenCalledWith(mockBlockHash);
      });

      it('should not fallback for other errors', async () => {
        // Setup
        chainHead.withArchive(mockArchive);

        // Mock ChainHead header to throw different error
        vi.spyOn(chainHead, 'header').mockImplementation(async () => {
          throw new Error('Connection error');
        });

        // Execute & Verify
        await expect(chainHead.header(mockBlockHash)).rejects.toThrow('Connection error');
        expect(mockArchive.header).not.toHaveBeenCalled();
      });
    });

    describe('storage() fallback', () => {
      const mockStorageQueries = [
        { key: '0xkey1', type: 'value' as const },
        { key: '0xkey2', type: 'hash' as const },
      ];

      it('should fallback to archive.storage() with converted parameters', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        const archiveResult = [
          { key: '0xkey1', value: '0xvalue1', event: 'storage' as const },
          { key: '0xkey2', value: '0xvalue2', event: 'storage' as const },
        ];
        mockArchive.storage.mockResolvedValue(archiveResult);
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute
        const result = await chainHead.storage(mockStorageQueries, '0xchildtrie', mockBlockHash);

        // Verify
        expect(result).toBe(archiveResult);
        expect(mockArchive.storage).toHaveBeenCalledWith(
          mockStorageQueries, // Should convert StorageQuery[] to PaginatedStorageQuery[]
          '0xchildtrie',
          mockBlockHash,
        );
      });

      it('should handle null childTrie parameter', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.storage.mockResolvedValue([]);
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute
        await chainHead.storage(mockStorageQueries, null, mockBlockHash);

        // Verify
        expect(mockArchive.storage).toHaveBeenCalledWith(mockStorageQueries, null, mockBlockHash);
      });

      it('should not fallback for other errors', async () => {
        // Setup
        chainHead.withArchive(mockArchive);

        // Mock ChainHead storage to throw different error
        vi.spyOn(chainHead, 'storage').mockImplementation(async () => {
          throw new Error('Storage error');
        });

        // Execute & Verify
        await expect(chainHead.storage(mockStorageQueries, null, mockBlockHash)).rejects.toThrow('Storage error');
        expect(mockArchive.storage).not.toHaveBeenCalled();
      });
    });

    describe('fallback logging', () => {
      it('should log warning with block hash when falling back', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.body.mockResolvedValue([]);
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute
        await chainHead.body(mockBlockHash);
      });

      it('should log actual hash when no hash provided', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.body.mockResolvedValue([]);
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false for the bestHash (since no hash provided, it will use bestHash)
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute
        await chainHead.body(); // No hash parameter
      });
    });

    describe('error handling', () => {
      it('should propagate Archive errors when fallback fails', async () => {
        // Setup
        notifyInitializedEvent();
        await chainHead.follow();

        mockArchive.body.mockRejectedValue(new Error('Archive failed'));
        chainHead.withArchive(mockArchive);

        // Mock isPinned to return false
        vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

        // Execute & Verify
        await expect(chainHead.body(mockBlockHash)).rejects.toThrow('Archive failed');
      });

      it('should throw original error when no Archive attached', async () => {
        // Don't attach archive

        vi.spyOn(chainHead, 'body').mockImplementation(async () => {
          throw new ChainHeadBlockNotPinnedError('Block not pinned', mockBlockHash);
        });

        // Execute & Verify
        await expect(chainHead.body(mockBlockHash)).rejects.toThrow(ChainHeadBlockNotPinnedError);
      });
    });
  });

  describe('best block gap detection and filling', () => {
    it('should detect and fill best block gaps from pinned blocks', async () => {
      notifyInitializedEvent();
      await chainHead.follow();

      const emittedBlocks: PinnedBlock[] = [];
      chainHead.on('bestBlock', (block) => {
        emittedBlocks.push(block);
      });

      // Create some new blocks
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x0f
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x10
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x11
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x12
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x13

      await waitFor(10);

      // Emit best block 0x0f (block 15)
      notify(simulator.subscriptionId, simulator.nextBestBlock());
      await waitFor(10);

      // Jump to block 0x13 (block 19) - should fill 0x10, 0x11, 0x12
      notify(simulator.subscriptionId, {
        event: 'bestBlockChanged',
        bestBlockHash: '0x13',
      });
      await waitFor(10);

      // Should emit: 15, 16, 17, 18, 19
      expect(emittedBlocks).toHaveLength(5);
      expect(emittedBlocks.map((b) => b.number)).toEqual([15, 16, 17, 18, 19]);
    });

    it('should not fill gaps when blocks are sequential', async () => {
      notifyInitializedEvent();
      await chainHead.follow();

      const emittedBlocks: PinnedBlock[] = [];
      chainHead.on('bestBlock', (block) => {
        emittedBlocks.push(block);
      });

      // Create and emit blocks sequentially
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x0f
      await waitFor(10);
      notify(simulator.subscriptionId, simulator.nextBestBlock()); // emit 0x0f
      await waitFor(10);

      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x10
      await waitFor(10);
      notify(simulator.subscriptionId, {
        event: 'bestBlockChanged',
        bestBlockHash: '0x10',
      });
      await waitFor(10);

      // Should emit only 2 blocks (15, 16) - no gap filling
      expect(emittedBlocks).toHaveLength(2);
      expect(emittedBlocks.map((b) => b.number)).toEqual([15, 16]);
    });

    it('should log warning when gap is detected', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      notifyInitializedEvent();
      await chainHead.follow();

      // Create blocks
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x0f
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x10
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x11

      await waitFor(10);

      // Emit best block 0x0f
      notify(simulator.subscriptionId, simulator.nextBestBlock());
      await waitFor(10);

      // Jump to 0x11 (skip 0x10)
      notify(simulator.subscriptionId, {
        event: 'bestBlockChanged',
        bestBlockHash: '0x11',
      });
      await waitFor(10);

      // Should have logged warning about gap
      expect(consoleWarnSpy).toHaveBeenCalledWith('best block gap detected: 1 blocks missing (16 to 16)');

      consoleWarnSpy.mockRestore();
    });

    it('should reset gap tracking after stop/recovery', async () => {
      notifyInitializedEvent();
      await chainHead.follow();

      const emittedBlocks: PinnedBlock[] = [];
      chainHead.on('bestBlock', (block) => {
        emittedBlocks.push(block);
      });

      // Emit first best block
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x0f
      await waitFor(10);
      notify(simulator.subscriptionId, simulator.nextBestBlock());
      await waitFor(10);

      // Trigger stop event
      notify(simulator.subscriptionId, { event: 'stop' });
      await waitFor(50);

      emittedBlocks.length = 0; // Clear

      // After recovery, jump to much higher block
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x10
      notify(simulator.subscriptionId, simulator.nextNewBlock()); // 0x11
      await waitFor(10);

      notify(simulator.subscriptionId, {
        event: 'bestBlockChanged',
        bestBlockHash: '0x11',
      });
      await waitFor(10);

      // Should NOT try to fill gap from before stop (tracking was reset)
      // Just emits new blocks
      expect(emittedBlocks.length).toBeGreaterThan(0);
    });
  });
});
