import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { MethodResponse, OperationCallDone } from '@dedot/types/json-rpc';
import { JsonRpcV2NotSupportedError } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { newChainHeadSimulator } from '../../json-rpc/group/__tests__/simulator.js';
import { DedotClient } from '../DedotClient.js';
import { V2Client } from '../V2Client.js';
import MockProvider from './MockProvider.js';

const prefixedMetadataV15 = staticSubstrateV15;

const setupV2Simulator = (provider: MockProvider) => {
  const simulator = newChainHeadSimulator({ provider });
  simulator.notify(simulator.initializedEvent);
  simulator.notify(simulator.nextNewBlock());
  simulator.notify(simulator.nextNewBlock());
  simulator.notify(simulator.nextBestBlock());
  simulator.notify(simulator.nextFinalized());

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
    { operationId: 'call01', event: 'operationCallDone', output: '0x0c100000000f0000000e000000' } as OperationCallDone,
    10,
  );
  simulator.notify(
    { operationId: 'call02', event: 'operationCallDone', output: prefixedMetadataV15 } as OperationCallDone,
    20,
  );

  return simulator;
};

describe('DedotClient auto-detect rpc version', () => {
  describe('auto mode (no rpcVersion specified)', () => {
    it('falls back to legacy when node lacks chainHead_* methods', async () => {
      const provider = new MockProvider();
      provider.setRpcRequest('rpc_methods', () => ({
        methods: ['state_getMetadata', 'state_getRuntimeVersion', 'chain_getBlockHash'],
      }));

      const client = await DedotClient.new({ provider });
      try {
        expect(client.rpcVersion).toBe('legacy');
        expect(client.metadata.version).toEqual('V15');
      } finally {
        await client.disconnect();
      }
    });

    it('uses v2 when node exposes chainHead_* methods', async () => {
      const provider = new MockProvider();
      const simulator = setupV2Simulator(provider);

      const client = await DedotClient.new({ provider });
      try {
        expect(client.rpcVersion).toBe('v2');
      } finally {
        await client.disconnect();
        await simulator.cleanup();
      }
    });
  });

  describe('explicit rpcVersion', () => {
    it("surfaces JsonRpcV2NotSupportedError when 'v2' is forced against a legacy-only node", async () => {
      const provider = new MockProvider();
      provider.setRpcRequest('rpc_methods', () => ({
        methods: ['state_getMetadata', 'state_getRuntimeVersion'],
      }));

      await expect(DedotClient.new({ provider, rpcVersion: 'v2' })).rejects.toThrow(JsonRpcV2NotSupportedError);
    });

    it("connects as legacy when rpcVersion: 'legacy' is passed", async () => {
      const provider = new MockProvider();
      const client = await DedotClient.new({ provider, rpcVersion: 'legacy' });
      try {
        expect(client.rpcVersion).toBe('legacy');
      } finally {
        await client.disconnect();
      }
    });
  });
});

describe('V2Client rpc v2 detection', () => {
  it('throws JsonRpcV2NotSupportedError when no chainHead_* methods are available', async () => {
    const provider = new MockProvider();
    provider.setRpcRequest('rpc_methods', () => ({
      methods: ['state_getMetadata', 'chain_getHeader'],
    }));

    await expect(V2Client.new({ provider })).rejects.toThrow(JsonRpcV2NotSupportedError);
  });
});
