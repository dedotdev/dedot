import {
  BestBlockChanged,
  ChainHeadRuntimeVersion,
  Finalized,
  MethodResponse,
  NewBlock,
  OperationCallDone,
  OperationInaccessible,
} from '@dedot/specs';
import { MockInstance } from '@vitest/spy';
import { JsonRpcClient, numberToHex, stringToHex, SubstrateRuntimeVersion } from 'dedot';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MockProvider, { MockedRuntimeVersion } from '../../../client/__tests__/MockProvider';
import { IJsonRpcClient } from '../../../types.js';
import { ChainHead } from '../ChainHead';

const mockedRuntime: ChainHeadRuntimeVersion = {
  ...MockedRuntimeVersion,
  apis: MockedRuntimeVersion.apis.reduce(
    (acc, [name, version]) => {
      acc[name] = version;
      return acc;
    },
    {} as Record<string, number>,
  ),
};

const MSG_CALL_FOLLOW_FIRST = 'Please call the .follow() method before invoking any other methods in this group.';

const rpcMethods = [
  'chainHead_v1_body',
  'chainHead_v1_call',
  'chainHead_v1_continue',
  'chainHead_v1_follow',
  'chainHead_v1_header',
  'chainHead_v1_stopOperation',
  'chainHead_v1_storage',
  'chainHead_v1_unpin',
  'chainHead_v1_unfollow',
];

type SimulatorConfig = {
  numOfFinalizedBlocks?: number;
  provider: MockProvider;
};

const newChainHeadSimulator = ({ numOfFinalizedBlocks = 15, provider }: SimulatorConfig) => {
  let subscriptionId = stringToHex('followSubscription');

  let finalizedHeight = -1;
  let bestBlockHeight = -1;
  let newBlockHeight = -1;

  const blockAtHeight = (height: number) => {
    return {
      hash: numberToHex(height),
      parent: numberToHex(height - 1),
    };
  };

  const newBlock = () => {
    newBlockHeight += 1;
    return blockAtHeight(newBlockHeight);
  };

  const initializedEvent = {
    event: 'initialized',
    finalizedBlockHashes: [...Array(numOfFinalizedBlocks)].map(() => newBlock().hash),
    finalizedBlockRuntime: { type: 'valid', spec: mockedRuntime },
  };

  finalizedHeight = bestBlockHeight = numOfFinalizedBlocks - 1;

  const nextMockedRuntime = (): SubstrateRuntimeVersion => {
    return { ...mockedRuntime, specVersion: mockedRuntime.specVersion + 1 };
  };

  const nextNewBlock = (withRuntime = false): NewBlock => {
    const block = newBlock();

    return {
      event: 'newBlock',
      blockHash: block.hash,
      parentBlockHash: block.parent,
      newRuntime: withRuntime ? { type: 'valid', spec: nextMockedRuntime() } : null,
    };
  };

  // TODO simulate forks
  const nextBestBlock = (): BestBlockChanged => {
    console.log('nextBestBlock', newBlockHeight, bestBlockHeight);
    if (newBlockHeight <= bestBlockHeight) {
      throw new Error('No new block available');
    }

    bestBlockHeight += 1;

    return {
      event: 'bestBlockChanged',
      bestBlockHash: blockAtHeight(bestBlockHeight).hash,
    };
  };

  const nextFinalized = (): Finalized => {
    console.log('nextFinalized', newBlockHeight, bestBlockHeight, finalizedHeight);
    if (bestBlockHeight <= finalizedHeight) {
      throw new Error('No best block to finalize');
    }

    finalizedHeight += 1;

    return {
      event: 'finalized',
      finalizedBlockHashes: [
        blockAtHeight(finalizedHeight - 2).hash,
        blockAtHeight(finalizedHeight - 1).hash,
        blockAtHeight(finalizedHeight).hash,
      ],
      prunedBlockHashes: [],
    };
  };

  return {
    subscriptionId,
    initializedEvent,
    nextNewBlock,
    nextBestBlock,
    nextFinalized,
  };
};

describe('ChainHead', () => {
  let chainHead: ChainHead;
  let provider: MockProvider;
  let client: IJsonRpcClient;
  let providerSend: MockInstance;
  let providerSubscribe: MockInstance;
  let simulator: ReturnType<typeof newChainHeadSimulator>;

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

    provider.setRpcRequests({
      rpc_methods: () => ({ methods: rpcMethods }),
      chainHead_v1_follow: () => simulator.subscriptionId,
      chainHead_v1_unfollow: () => null,
      chainHead_v1_body: () => '0x',
      chainHead_v1_call: () => '0x',
      chainHead_v1_continue: () => '0x',
      chainHead_v1_header: () => '0x',
      chainHead_v1_storage: () => '0x',
      chainHead_v1_stopOperation: () => '0x',
      chainHead_v1_unpin: () => '0x',
    });

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

      expect(chainHead.runtimeVersion).toEqual(mockedRuntime);
      expect(chainHead.bestRuntimeVersion).toEqual(mockedRuntime);
      expect(chainHead.bestHash).toEqual('0x0e');
      expect(chainHead.finalizedHash).toEqual('0x0e');
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

      expect(() => chainHead.runtimeVersion).toThrow(MSG_CALL_FOLLOW_FIRST);
      expect(() => chainHead.bestRuntimeVersion).toThrow(MSG_CALL_FOLLOW_FIRST);
      expect(() => chainHead.bestHash).toThrow(MSG_CALL_FOLLOW_FIRST);
      expect(() => chainHead.finalizedHash).toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.body()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.header()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.storage([])).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.unpin('0x01')).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
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
          chainHead.on('newBlock', (blockHash, runtime) => {
            expect(blockHash).toEqual(newBlock.blockHash);
            expect(runtime).toBeUndefined();
            resolve();
          });
        });
      });

      it('handle newBlock with runtime', async () => {
        const newBlock: NewBlock = notify(simulator.subscriptionId, simulator.nextNewBlock(true));

        await new Promise<void>((resolve) => {
          chainHead.on('newBlock', (blockHash, runtime) => {
            expect(blockHash).toEqual(newBlock.blockHash);
            // @ts-ignore
            expect(runtime).toEqual(newBlock.newRuntime.spec);
            resolve();
          });
        });
      });
    });

    describe('bestBlockChanged', () => {
      it('handle bestBlockChanged', async () => {
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        const newBlock2 = notify(simulator.subscriptionId, simulator.nextNewBlock(true));
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        const bestBlock1 = notify(simulator.subscriptionId, simulator.nextBestBlock());

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('bestBlock', (blockHash, runtime) => {
            expect(blockHash).toEqual(bestBlock1.bestBlockHash);
            expect(chainHead.bestHash).toEqual(blockHash);
            expect(runtime).toBeUndefined();

            unsub();
            resolve();
          });
        });

        const bestBlock2 = notify(simulator.subscriptionId, simulator.nextBestBlock(), 10);

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('bestBlock', (blockHash, runtime) => {
            expect(blockHash).toEqual(bestBlock2.bestBlockHash);
            expect(chainHead.bestHash).toEqual(blockHash);
            // @ts-ignore
            expect(newBlock2.newRuntime.spec).toEqual(runtime);
            expect(chainHead.bestRuntimeVersion).toEqual(runtime);

            unsub();
            resolve();
          });
        });
      });
    });

    describe('finalized', () => {
      it('handle finalized', async () => {
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        const newBlock2 = notify(simulator.subscriptionId, simulator.nextNewBlock(true));
        notify(simulator.subscriptionId, simulator.nextNewBlock());
        notify(simulator.subscriptionId, simulator.nextNewBlock());

        notify(simulator.subscriptionId, simulator.nextBestBlock());
        const finalized1 = notify(simulator.subscriptionId, simulator.nextFinalized());

        await new Promise<void>((resolve) => {
          const unsub = chainHead.on('finalizedBlock', (finalizedHash, runtime) => {
            expect(finalizedHash).toEqual(finalized1.finalizedBlockHashes.at(-1));
            expect(chainHead.finalizedHash).toEqual(finalizedHash);

            unsub();
            resolve();
          });
        });

        // 4 new blocks on top of 15 initial blocks, unpin 4 blocks to maintain the queue size
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
              simulator.subscriptionId,
              ['0x00', '0x01', '0x02', '0x03'],
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
          const unsub = chainHead.on('finalizedBlock', (finalizedHash, runtime) => {
            expect(finalizedHash).toEqual(finalized2.finalizedBlockHashes.at(-1));
            expect(chainHead.finalizedHash).toEqual(finalizedHash);
            // @ts-ignore
            expect(runtime).toEqual(newBlock2.newRuntime.spec);

            unsub();
            resolve();
          });
        });

        // 2 new blocks comes in, unpin 2 blocks at the back to the queue to maintain the queue size
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [
              simulator.subscriptionId,
              ['0x04', '0x05'],
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
          event: 'operationCallDone',
          output: '0x1111',
        } as OperationCallDone);

        const result = await chainHead.body();
        expect(result).toEqual('0x1111');

        expect(providerSend).toHaveBeenNthCalledWith(3, 'chainHead_v1_body', [
          simulator.subscriptionId,
          chainHead.bestHash,
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
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
            event: 'operationCallDone',
            output: '0x1111',
          } as OperationCallDone,
          10,
        );

        const result = await chainHead.body();
        expect(result).toEqual('0x1111');

        expect(providerSend).toHaveBeenNthCalledWith(3, 'chainHead_v1_body', [
          simulator.subscriptionId,
          chainHead.bestHash,
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'body02',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_body', [
          simulator.subscriptionId,
          chainHead.bestHash,
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_stopOperation', [
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

        expect(providerSend).toHaveBeenNthCalledWith(3, 'chainHead_v1_call', [
          simulator.subscriptionId,
          chainHead.bestHash,
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
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

        expect(providerSend).toHaveBeenNthCalledWith(3, 'chainHead_v1_call', [
          simulator.subscriptionId,
          chainHead.bestHash,
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'call02',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_call', [
          simulator.subscriptionId,
          chainHead.bestHash,
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_stopOperation', [
          simulator.subscriptionId,
          'call02',
        ]);
      });
    });

    describe.todo('chainHead_storage');
    // should handle discardItems

    describe('verify non-operational methods', () => {
      it('calls header', async () => {
        await chainHead.header();

        expect(providerSend).toHaveBeenCalledWith('chainHead_v1_header', [
          simulator.subscriptionId,
          chainHead.bestHash,
        ]);
      });

      it('calls unpin', async () => {
        await chainHead.unpin('0x01');
        await chainHead.unpin(['0x01', '0x02']);

        expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, '0x01']);
        expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', [simulator.subscriptionId, ['0x01', '0x02']]);
      });
    });
  });
});
