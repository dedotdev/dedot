import {
  ChainHeadRuntimeVersion,
  MethodResponse,
  NewBlock,
  OperationCallDone,
  OperationInaccessible,
} from '@dedot/specs';
import { MockInstance } from '@vitest/spy';
import { JsonRpcClient } from 'dedot';
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

const initializedEvent = {
  event: 'initialized',
  finalizedBlockHashes: ['0x0', '0x1', '0x2', '0x3'],
  finalizedBlockRuntime: { type: 'valid', spec: mockedRuntime },
};

describe('ChainHead', () => {
  let chainHead: ChainHead;
  let provider: MockProvider;
  let client: IJsonRpcClient;
  let providerSend: MockInstance;
  let providerSubscribe: MockInstance;

  const notify = (subscriptionId: string, data: Error | any, timeout = 0) => {
    setTimeout(() => {
      provider.notify(subscriptionId, data);
    }, timeout);
  };

  beforeEach(() => {
    provider = new MockProvider();
    providerSend = vi.spyOn(provider, 'send');
    providerSubscribe = vi.spyOn(provider, 'subscribe');

    provider.setRpcRequests({
      rpc_methods: () => ({ methods: rpcMethods }),
      chainHead_v1_follow: () => 'followSubscription1',
      chainHead_v1_unfollow: () => null,
      chainHead_v1_body: () => '0x',
      chainHead_v1_call: () => '0x',
      chainHead_v1_continue: () => '0x',
      chainHead_v1_header: () => '0x',
      chainHead_v1_storage: () => '0x',
      chainHead_v1_stopOperation: () => '0x',
      chainHead_v1_unpin: () => '0x',
    });

    client = new JsonRpcClient({ provider });
    chainHead = new ChainHead(client);
  });

  describe('follow', () => {
    it('follows chain head successfully', async () => {
      notify('followSubscription1', initializedEvent);

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
      expect(chainHead.bestHash).toEqual('0x3');
      expect(chainHead.finalizedHash).toEqual('0x3');
    });

    it('throws error when trying to follow chain head twice', async () => {
      notify('followSubscription1', initializedEvent);

      await chainHead.follow();

      await expect(chainHead.follow()).rejects.toThrow('Already followed chain head. Please unfollow first.');
    });
  });

  describe('unfollow', () => {
    it('unfollows chain head successfully', async () => {
      notify('followSubscription1', initializedEvent);

      await chainHead.follow();
      await chainHead.unfollow();

      expect(providerSend).toHaveBeenCalledWith('rpc_methods', []);
      expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unfollow', ['followSubscription1']);

      expect(() => chainHead.runtimeVersion).toThrow(MSG_CALL_FOLLOW_FIRST);
      expect(() => chainHead.bestRuntimeVersion).toThrow(MSG_CALL_FOLLOW_FIRST);
      expect(() => chainHead.bestHash).toThrow(MSG_CALL_FOLLOW_FIRST);
      expect(() => chainHead.finalizedHash).toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.body()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.header()).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.storage([])).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
      await expect(chainHead.unpin('0x1')).rejects.toThrow(MSG_CALL_FOLLOW_FIRST);
    });
  });

  describe('chainHead operations', () => {
    beforeEach(async () => {
      notify('followSubscription1', initializedEvent);

      await chainHead.follow();
    });

    describe('newBlock', () => {
      it('handle newBlock without runtime', async () => {
        const newBlock: NewBlock = {
          event: 'newBlock',
          blockHash: '0x4',
          parentBlockHash: '0x3',
          newRuntime: null,
        };

        notify('followSubscription1', newBlock);

        await new Promise<void>((resolve) => {
          chainHead.on('newBlock', (blockHash, runtime) => {
            expect(blockHash).toEqual(newBlock.blockHash);
            expect(runtime).toBeUndefined();
            resolve();
          });
        });
      });

      it('handle newBlock with runtime', async () => {
        const newRuntime = { ...mockedRuntime, specVersion: mockedRuntime.specVersion + 1 };
        const newBlock: NewBlock = {
          event: 'newBlock',
          blockHash: '0x4',
          parentBlockHash: '0x3',
          newRuntime: { type: 'valid', spec: newRuntime },
        };

        notify('followSubscription1', newBlock);

        await new Promise<void>((resolve) => {
          chainHead.on('newBlock', (blockHash, runtime) => {
            expect(blockHash).toEqual(newBlock.blockHash);
            expect(runtime).toEqual(newRuntime);
            resolve();
          });
        });
      });
    });

    describe.todo('bestBlockChanged');

    describe.todo('finalized');

    describe('chainHead_body', () => {
      it('calls body successfully', async () => {
        provider.setRpcRequest(
          'chainHead_v1_body',
          () => ({ result: 'started', operationId: 'body01' }) as MethodResponse,
        );

        notify('followSubscription1', {
          operationId: 'body01',
          event: 'operationCallDone',
          output: '0x1111',
        } as OperationCallDone);

        const result = await chainHead.body();
        expect(result).toEqual('0x1111');

        expect(providerSend).toHaveBeenNthCalledWith(3, 'chainHead_v1_body', [
          'followSubscription1',
          chainHead.bestHash,
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
          'followSubscription1',
          'body01',
        ]);
      });

      it('should retry on OperationInaccessible', async () => {
        provider.setRpcRequest(
          'chainHead_v1_body',
          () => ({ result: 'started', operationId: 'body02' }) as MethodResponse,
        );

        notify('followSubscription1', {
          operationId: 'body02',
          event: 'operationInaccessible',
        } as OperationInaccessible);

        notify(
          'followSubscription1',
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
          'followSubscription1',
          chainHead.bestHash,
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
          'followSubscription1',
          'body02',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_body', [
          'followSubscription1',
          chainHead.bestHash,
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_stopOperation', [
          'followSubscription1',
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

        notify('followSubscription1', {
          operationId: 'call01',
          event: 'operationCallDone',
          output: '0x1111',
        } as OperationCallDone);

        const result = await chainHead.call('func', '0x');
        expect(result).toEqual('0x1111');

        expect(providerSend).toHaveBeenNthCalledWith(3, 'chainHead_v1_call', [
          'followSubscription1',
          chainHead.bestHash,
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
          'followSubscription1',
          'call01',
        ]);
      });

      it('should retry on OperationInaccessible', async () => {
        provider.setRpcRequest(
          'chainHead_v1_call',
          () => ({ result: 'started', operationId: 'call02' }) as MethodResponse,
        );

        notify('followSubscription1', {
          operationId: 'call02',
          event: 'operationInaccessible',
        } as OperationInaccessible);

        notify(
          'followSubscription1',
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
          'followSubscription1',
          chainHead.bestHash,
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(4, 'chainHead_v1_stopOperation', [
          'followSubscription1',
          'call02',
        ]);

        expect(providerSend).toHaveBeenNthCalledWith(5, 'chainHead_v1_call', [
          'followSubscription1',
          chainHead.bestHash,
          'func',
          '0x',
        ]);
        expect(providerSend).toHaveBeenNthCalledWith(6, 'chainHead_v1_stopOperation', [
          'followSubscription1',
          'call02',
        ]);
      });
    });

    describe.todo('chainHead_storage');
    // should handle discardItems

    describe('verify non-operational methods', () => {
      it('calls header', async () => {
        await chainHead.header();

        expect(providerSend).toHaveBeenCalledWith('chainHead_v1_header', ['followSubscription1', chainHead.bestHash]);
      });

      it('calls unpin', async () => {
        await chainHead.unpin('0x1');

        expect(providerSend).toHaveBeenCalledWith('chainHead_v1_unpin', ['followSubscription1', '0x1']);
      });
    });
  });
});
