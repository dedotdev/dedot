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

describe('[V2Client] options', () => {
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

  describe('custom runtime apis call', () => {
    it('should encode/decode custom call properly', async () => {
      const $testParamCodec = {
        tryDecode: vi.fn(),
        tryEncode: vi.fn(() => new Uint8Array()),
      };
      const $mockCodec = {
        tryDecode: vi.fn(),
        tryEncode: vi.fn(() => new Uint8Array()),
      };

      const api = await V2Client.new({
        provider,
        runtimeApis: {
          Metadata: [
            {
              methods: {
                testMethod: {
                  params: [
                    {
                      name: 'testParam',
                      codec: $testParamCodec as unknown as AnyShape,
                    },
                  ],
                  codec: $mockCodec as unknown as AnyShape,
                },
              },
              version: 2,
            },
          ],
        },
      });

      provider.setRpcRequest(
        'chainHead_v1_call',
        () => ({ result: 'started', operationId: 'customCall01' }) as MethodResponse,
      );

      simulator.notify({
        operationId: 'customCall01',
        event: 'operationCallDone',
        output: '0x',
      } as OperationCallDone);

      await api.call.metadata.testMethod('hello');

      expect($testParamCodec.tryEncode).toBeCalledWith('hello');
      expect($mockCodec.tryDecode).toBeCalled();
      expect(providerSend).toBeCalledWith('chainHead_v1_call', [
        simulator.subscriptionId,
        await api.chainHead.bestHash(),
        'Metadata_test_method',
        '0x',
      ]);
      expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
        simulator.subscriptionId,
        'customCall01',
      ]);
    });
  });

  describe('not throwOnUnknownApi', () => {
    let api: V2Client;
    beforeEach(async () => {
      api = await V2Client.new({ provider, throwOnUnknownApi: false });
    });

    afterEach(async () => {
      api && (await api.disconnect());
    });

    it('should return undefined for unknown constants', () => {
      expect(api.consts.palletName.notFound).toBeUndefined();
      expect(api.consts.system.notFound).toBeUndefined();
    });

    it('should return undefined if storage query entry not found', () => {
      expect(api.query.palletName.notFound).toBeUndefined();
      expect(api.query.system.notFound).toBeUndefined();
    });

    it('should return undefined if event not found', () => {
      expect(api.events.palletName.notFound).toBeUndefined();
      expect(api.events.system.notFound).toBeUndefined();
    });

    it('should return undefined if error not found', () => {
      expect(api.errors.palletName.notFound).toBeUndefined();
      expect(api.errors.system.notFound).toBeUndefined();
    });

    it('should return undefined if tx not found', async () => {
      expect(api.tx.system.notFound).toBeUndefined();
      expect(api.tx.notFound.notFound).toBeUndefined();
    });
  });

  describe('metadata options', () => {
    it('should use provided metadata from options', async () => {
      const api = await V2Client.new({
        provider,
        metadata: {
          'RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/1': rawMetadataV15,
        },
      });

      expect(providerSend).not.toBeCalledWith('chainHead_v1_call', [
        simulator.subscriptionId,
        await api.chainHead.bestHash(),
        'Metadata_metadata_versions',
        '0x',
      ]);

      expect(providerSend).not.toBeCalledWith('chainHead_v1_call', [
        simulator.subscriptionId,
        await api.chainHead.bestHash(),
        'Metadata_metadata_at_version',
        '0x10000000',
      ]);

      expect(api.rpc).toBeDefined();
      expect(api.query).toBeDefined();
      expect(api.events).toBeDefined();
      expect(api.errors).toBeDefined();
      expect(api.consts).toBeDefined();
      expect(api.metadata.version).toEqual('V15');
      expect(api.currentMetadataKey).toEqual(
        `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/1`,
      );

      await api.disconnect();
    });
  });
});
