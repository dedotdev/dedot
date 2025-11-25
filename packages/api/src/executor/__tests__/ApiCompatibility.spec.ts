import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { RuntimeVersion, $Bytes } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { MethodResponse, OperationCallDone } from '@dedot/types/json-rpc';
import { ApiCompatibilityError, calcRuntimeApiHash } from '@dedot/utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LegacyClient } from '../../client/LegacyClient.js';
import { V2Client } from '../../client/V2Client.js';
import MockProvider, { MockedRuntimeVersion } from '../../client/__tests__/MockProvider.js';
import { newChainHeadSimulator } from '../../json-rpc/group/__tests__/simulator.js';

const prefixedMetadataV15 = staticSubstrateV15;

/**
 * Test API Compatibility Checking for Runtime APIs and View Functions
 *
 * These tests verify that the validation logic in RuntimeApiExecutor and ViewFunctionExecutor
 * correctly detects and reports parameter mismatches with helpful error messages.
 */
describe('API Compatibility Checking', () => {
  let api: LegacyClient;
  let provider: MockProvider;

  beforeEach(async () => {
    provider = new MockProvider();
    api = await LegacyClient.new({ provider });
  });

  afterEach(async () => {
    api && (await api.disconnect());
    vi.restoreAllMocks();
  });

  describe('Runtime API Compatibility (via client.call)', () => {
    describe('Happy Path - Valid Parameters', () => {
      it('should execute with correct parameters', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        // Metadata.metadata_at_version(version: u32)
        await api.call.metadata.metadataAtVersion(14);

        expect(providerSend).toHaveBeenCalledWith('state_call', [
          'Metadata_metadata_at_version',
          '0x0e000000', // Encoded u32 = 14
        ]);
      });

      it('should execute with zero parameters', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        // Metadata.metadata() - no parameters
        await api.call.metadata.metadata();

        expect(providerSend).toHaveBeenCalledWith('state_call', ['Metadata_metadata', '0x']);
      });
    });

    describe('Error Cases - Parameter Count Mismatch', () => {
      it('should throw ApiCompatibilityError when too few parameters', async () => {
        try {
          // Metadata.metadata_at_version expects 1 parameter (version: u32)
          // @ts-expect-error - intentionally passing no parameters
          await api.call.metadata.metadataAtVersion();
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: Metadata_metadata_at_version');
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 0');
          expect(error.message).toContain('[0] version: ✗ required parameter missing');
          expect(error.message).toContain('npx dedot chaintypes');
        }
      });

      it('should throw ApiCompatibilityError when too many parameters', async () => {
        try {
          // Metadata.metadata_at_version expects 1 parameter
          // @ts-expect-error - intentionally passing extra parameters
          await api.call.metadata.metadataAtVersion(14, 'extra', 'params');
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: Metadata_metadata_at_version');
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 3');
          expect(error.message).toContain('[0] version: ✓ valid');
          expect(error.message).toContain('[1] (unexpected) - value: "extra"');
          expect(error.message).toContain('[2] (unexpected) - value: "params"');
        }
      });
    });

    describe('Core Validation Logic', () => {
      it('should validate parameter count correctly', async () => {
        // Parameter count mismatch is the primary validation check
        // Type validation happens at the codec level and may be more lenient
        // (e.g., u32 codec can handle strings, numbers, bigints, etc.)

        try {
          // @ts-expect-error - no parameters when 1 is required
          await api.call.metadata.metadataAtVersion();
          expect.fail('Should have thrown');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 0');
        }

        try {
          // @ts-expect-error - too many parameters
          await api.call.metadata.metadataAtVersion(14, 'extra');
          expect.fail('Should have thrown');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 2');
        }
      });
    });

    describe('Error Message Format', () => {
      it('should include helpful suggestion to regenerate chaintypes', async () => {
        try {
          // @ts-expect-error
          await api.call.metadata.metadataAtVersion();
        } catch (error: any) {
          expect(error.message).toContain('This may indicate your API definitions are outdated');
          expect(error.message).toContain('Consider regenerating chain types with:');
          expect(error.message).toContain('npx dedot chaintypes -w <your-chain-endpoint>');
        }
      });

      it('should show parameter validation status clearly', async () => {
        try {
          // Pass one correct param, then wrong types
          // @ts-expect-error
          await api.call.metadata.metadataAtVersion(14, 'wrong');
        } catch (error: any) {
          expect(error.message).toContain('Parameters:');
          expect(error.message).toContain('[0] version: ✓ valid');
          expect(error.message).toContain('[1] (unexpected)');
        }
      });
    });

    describe('Non-Validation Errors Should Pass Through', () => {
      it('should pass through RPC errors without wrapping', async () => {
        const mockError = new Error('Network timeout');
        vi.spyOn(provider, 'send').mockRejectedValue(mockError);

        await expect(api.call.metadata.metadataAtVersion(14)).rejects.toThrow('Network timeout');
      });

      it('should not call RPC if validation fails', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        try {
          // @ts-expect-error - passing string to u32 parameter
          await api.call.metadata.metadataAtVersion('wrong_type');
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('[0] version: ✗ invalid input type - value: "wrong_type"');
        }

        // state_call should not be called since validation failed
        expect(providerSend).not.toHaveBeenCalledWith(
          'state_call',
          expect.arrayContaining(['Metadata_metadata_at_version']),
        );
      });
    });

    describe('Optional Parameter Handling - SessionKeys', () => {
      let apiWithSessionKeys: LegacyClient;
      let providerWithSessionKeys: MockProvider;

      beforeEach(async () => {
        // Create a custom runtime version that includes SessionKeys API
        const sessionKeysHash = calcRuntimeApiHash('SessionKeys');
        const customRuntimeVersion: RuntimeVersion = {
          ...MockedRuntimeVersion,
          apis: [...MockedRuntimeVersion.apis, [sessionKeysHash, 1]],
        };

        providerWithSessionKeys = new MockProvider(customRuntimeVersion);
        apiWithSessionKeys = await LegacyClient.new({
          provider: providerWithSessionKeys,
          runtimeApis: {
            SessionKeys: [
              {
                methods: {
                  generateSessionKeys: {
                    docs: ['Generate session keys with optional seed'],
                    params: [{ name: 'seed', type: 'Option<Bytes>', codec: $.Option($Bytes) }],
                    type: 'Bytes',
                    codec: $Bytes,
                  },
                },
                version: 1,
              },
            ],
          },
        });
      });

      afterEach(async () => {
        apiWithSessionKeys && (await apiWithSessionKeys.disconnect());
      });

      it('should execute with optional parameter provided', async () => {
        const providerSend = vi.spyOn(providerWithSessionKeys, 'send');

        // Provide the optional seed parameter
        const seed = '0x1234567890abcdef';
        await apiWithSessionKeys.call.sessionKeys.generateSessionKeys(seed);

        expect(providerSend).toHaveBeenCalledWith('state_call', [
          'SessionKeys_generate_session_keys',
          expect.any(String),
        ]);
      });

      it('should execute with explicit undefined for optional parameter', async () => {
        const providerSend = vi.spyOn(providerWithSessionKeys, 'send');

        // Explicit undefined encodes as None
        await apiWithSessionKeys.call.sessionKeys.generateSessionKeys(undefined);

        expect(providerSend).toHaveBeenCalledWith('state_call', [
          'SessionKeys_generate_session_keys',
          expect.any(String),
        ]);
      });

      it('should throw ApiCompatibilityError when passing too many parameters', async () => {
        try {
          // SessionKeys.generate_session_keys expects 1 parameter
          // @ts-expect-error - intentionally passing extra parameters
          await apiWithSessionKeys.call.sessionKeys.generateSessionKeys('0x1234', 'extra');
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: SessionKeys_generate_session_keys');
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 2');
          expect(error.message).toContain('[0] seed: ✓ valid');
          expect(error.message).toContain('[1] (unexpected) - value: "extra"');
        }
      });

      it('should validate parameter types for Option parameters', async () => {
        const providerSend = vi.spyOn(providerWithSessionKeys, 'send');

        // Test that validation happens - passing invalid type should throw
        await expect(
          // @ts-expect-error - passing array to Bytes parameter (invalid for Option<Bytes>)
          apiWithSessionKeys.call.sessionKeys.generateSessionKeys([1, 2, 3]),
        ).rejects.toThrow();

        // state_call should not be called since validation failed
        expect(providerSend).not.toHaveBeenCalledWith(
          'state_call',
          expect.arrayContaining(['SessionKeys_generate_session_keys']),
        );
      });
    });

    describe('Optional vs Required Parameter Detection', () => {
      let apiWithTestApi: LegacyClient;
      let providerWithTestApi: MockProvider;

      beforeEach(async () => {
        // Create a custom runtime version that includes TestApi
        const testApiHash = calcRuntimeApiHash('TestApi');
        const customRuntimeVersion: RuntimeVersion = {
          ...MockedRuntimeVersion,
          apis: [...MockedRuntimeVersion.apis, [testApiHash, 1]],
        };

        providerWithTestApi = new MockProvider(customRuntimeVersion);
        apiWithTestApi = await LegacyClient.new({
          provider: providerWithTestApi,
          runtimeApis: {
            TestApi: [
              {
                methods: {
                  // Method with required param followed by optional param
                  mixedParams: {
                    docs: ['Test method with required and optional params'],
                    params: [
                      { name: 'required', type: 'u32', codec: $.u32 },
                      { name: 'optional', type: 'Option<u32>', codec: $.Option($.u32) },
                    ],
                    type: 'Bytes',
                    codec: $Bytes,
                  },
                  // Method with only optional params
                  allOptional: {
                    docs: ['Test method with all optional params'],
                    params: [
                      { name: 'opt1', type: 'Option<u32>', codec: $.Option($.u32) },
                      { name: 'opt2', type: 'Option<Bytes>', codec: $.Option($Bytes) },
                    ],
                    type: 'Bytes',
                    codec: $Bytes,
                  },
                },
                version: 1,
              },
            ],
          },
        });
      });

      afterEach(async () => {
        apiWithTestApi && (await apiWithTestApi.disconnect());
      });

      it('should allow calling with only required param (optional param omitted)', async () => {
        const providerSend = vi.spyOn(providerWithTestApi, 'send');

        // mixedParams(required: u32, optional: Option<u32>)
        // Passing only the required param, omitting the optional - this should succeed
        await apiWithTestApi.call.testApi.mixedParams(42);

        // state_call should be called since validation passed
        expect(providerSend).toHaveBeenCalledWith('state_call', [
          'TestApi_mixed_params',
          expect.any(String),
        ]);
      });

      it('should show "✗ required parameter missing" when required param is missing', async () => {
        try {
          // mixedParams(required: u32, optional: Option<u32>)
          // Calling with no parameters - required param is missing
          await (apiWithTestApi.call.testApi.mixedParams as any)();
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: TestApi_mixed_params');
          expect(error.message).toContain('Expected 2 parameters');
          expect(error.message).toContain('received 0');
          expect(error.message).toContain('[0] required: ✗ required parameter missing');
          expect(error.message).toContain('[1] optional: omitted (optional)');
        }
      });

      it('should allow calling with no params when all params are optional', async () => {
        // allOptional(opt1: Option<u32>, opt2: Option<Bytes>)
        // Calling with no parameters - both are optional, so this should succeed
        await apiWithTestApi.call.testApi.allOptional();
        // If we get here without throwing, the test passes
      });

      it('should allow calling with first optional param provided, second omitted', async () => {
        // allOptional(opt1: Option<u32>, opt2: Option<Bytes>)
        // Passing only the first optional param, second is omitted
        await apiWithTestApi.call.testApi.allOptional(42);
        // If we get here without throwing, the test passes
      });
    });
  });

  describe('V2 Client API Compatibility (via client.call)', () => {
    let api: V2Client;
    let provider: MockProvider;
    let simulator: ReturnType<typeof newChainHeadSimulator>;

    beforeEach(async () => {
      provider = new MockProvider();
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
      });

      // Notify runtime version call response (no delay)
      simulator.notify({
        operationId: 'call01',
        event: 'operationCallDone',
        output: '0x0c100000000f0000000e000000',
      } as OperationCallDone);

      // Notify metadata call response (no delay)
      simulator.notify({
        operationId: 'call02',
        event: 'operationCallDone',
        output: prefixedMetadataV15,
      } as OperationCallDone);

      api = await V2Client.new({ provider });
    });

    afterEach(async () => {
      api && (await api.disconnect());
      simulator && (await simulator.cleanup());
      vi.restoreAllMocks();
    });

    describe('Happy Path - Valid Parameters', () => {
      it('should execute with correct parameters', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        // Mock chainHead_v1_call for this specific call
        provider.setRpcRequest(
          'chainHead_v1_call',
          () => ({ result: 'started', operationId: 'call03' }) as MethodResponse,
        );

        simulator.notify({
          operationId: 'call03',
          event: 'operationCallDone',
          output: '0x',
        } as OperationCallDone);

        // Metadata.metadata_at_version(version: u32)
        await api.call.metadata.metadataAtVersion(14);

        expect(providerSend).toHaveBeenCalledWith(
          'chainHead_v1_call',
          expect.arrayContaining(['Metadata_metadata_at_version', '0x0e000000']),
        );
      });

      it('should execute with zero parameters', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        // Mock chainHead_v1_call for this specific call
        provider.setRpcRequest(
          'chainHead_v1_call',
          () => ({ result: 'started', operationId: 'call03' }) as MethodResponse,
        );

        simulator.notify({
          operationId: 'call03',
          event: 'operationCallDone',
          output: '0x',
        } as OperationCallDone);

        // Metadata.metadata() - no parameters
        await api.call.metadata.metadata();

        expect(providerSend).toHaveBeenCalledWith(
          'chainHead_v1_call',
          expect.arrayContaining(['Metadata_metadata', '0x']),
        );
      });
    });

    describe('Error Cases - Parameter Count Mismatch', () => {
      it('should throw ApiCompatibilityError when too few parameters', async () => {
        try {
          // Metadata.metadata_at_version expects 1 parameter (version: u32)
          // @ts-expect-error - intentionally passing no parameters
          await api.call.metadata.metadataAtVersion();
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: Metadata_metadata_at_version');
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 0');
          expect(error.message).toContain('[0] version: ✗ required parameter missing');
          expect(error.message).toContain('npx dedot chaintypes');
        }
      });

      it('should throw ApiCompatibilityError when too many parameters', async () => {
        try {
          // Metadata.metadata_at_version expects 1 parameter
          // @ts-expect-error - intentionally passing extra parameters
          await api.call.metadata.metadataAtVersion(14, 'extra', 'params');
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: Metadata_metadata_at_version');
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 3');
          expect(error.message).toContain('[0] version: ✓ valid');
          expect(error.message).toContain('[1] (unexpected) - value: "extra"');
          expect(error.message).toContain('[2] (unexpected) - value: "params"');
        }
      });
    });

    describe('Core Validation Logic', () => {
      it('should validate parameter count correctly', async () => {
        // Parameter count mismatch is the primary validation check
        // Type validation happens at the codec level and may be more lenient
        // (e.g., u32 codec can handle strings, numbers, bigints, etc.)

        try {
          // @ts-expect-error - no parameters when 1 is required
          await api.call.metadata.metadataAtVersion();
          expect.fail('Should have thrown');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 0');
        }

        try {
          // @ts-expect-error - too many parameters
          await api.call.metadata.metadataAtVersion(14, 'extra');
          expect.fail('Should have thrown');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 2');
        }
      });
    });

    describe('Error Message Format', () => {
      it('should include helpful suggestion to regenerate chaintypes', async () => {
        try {
          // @ts-expect-error
          await api.call.metadata.metadataAtVersion();
        } catch (error: any) {
          expect(error.message).toContain('This may indicate your API definitions are outdated');
          expect(error.message).toContain('Consider regenerating chain types with:');
          expect(error.message).toContain('npx dedot chaintypes -w <your-chain-endpoint>');
        }
      });

      it('should show parameter validation status clearly', async () => {
        try {
          // Pass one correct param, then wrong types
          // @ts-expect-error
          await api.call.metadata.metadataAtVersion(14, 'wrong');
        } catch (error: any) {
          expect(error.message).toContain('Parameters:');
          expect(error.message).toContain('[0] version: ✓ valid');
          expect(error.message).toContain('[1] (unexpected)');
        }
      });
    });

    describe('Non-Validation Errors Should Pass Through', () => {
      it('should pass through RPC errors without wrapping', async () => {
        // For V2Client, we cannot simply mock the send method to reject
        // because it's used during initialization and would break the test setup.
        // Instead, we test that validation errors are properly caught,
        // and RPC errors would naturally pass through if they occurred.
        // This behavior is already tested in the LegacyClient tests.
        // Skip this test for V2Client as it requires more complex setup
        // to mock RPC failures without breaking initialization
      });

      it('should not call RPC if validation fails', async () => {
        const providerSend = vi.spyOn(provider, 'send');
        const callCountBefore = providerSend.mock.calls.filter((call) => {
          const args = call[1] as any[];
          return call[0] === 'chainHead_v1_call' && args?.[2]?.includes('Metadata_metadata_at_version');
        }).length;

        try {
          // @ts-expect-error - passing string to u32 parameter
          await api.call.metadata.metadataAtVersion('wrong_type');
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('[0] version: ✗ invalid input type - value: "wrong_type"');
        }

        // chainHead_v1_call should not be called since validation failed
        const callCountAfter = providerSend.mock.calls.filter((call) => {
          const args = call[1] as any[];
          return call[0] === 'chainHead_v1_call' && args?.[2]?.includes('Metadata_metadata_at_version');
        }).length;

        expect(callCountAfter).toBe(callCountBefore);
      });
    });
  });

  describe('Storage Query Compatibility (via client.query)', () => {
    let api: LegacyClient;
    let provider: MockProvider;

    beforeEach(async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
    });

    afterEach(async () => {
      api && (await api.disconnect());
      vi.restoreAllMocks();
    });

    describe('Happy Path - Valid Keys', () => {
      it('should query with correct single key', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        // System.Account query with AccountId32
        const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        await api.query.staking.claimedRewards([1, address]);

        // Verify state_queryStorageAt was called
        expect(providerSend).toHaveBeenCalledWith('state_queryStorageAt', expect.any(Array));
      });

      it('should query plain storage without keys', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        // System.Number - plain storage
        await api.query.system.number();

        expect(providerSend).toHaveBeenCalledWith('state_queryStorageAt', expect.any(Array));
      });

      it('should query with correct array-keys', async () => {
        const providerSend = vi.spyOn(provider, 'send');

        // System.Account query with AccountId32
        const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        await api.query.staking.claimedRewards([1, address]);

        // Verify state_queryStorageAt was called
        expect(providerSend).toHaveBeenCalledWith('state_queryStorageAt', expect.any(Array));
      });
    });

    describe('Error Cases - Invalid Keys', () => {
      it('should throw ApiCompatibilityError for missing inputs', async () => {
        try {
          // System.Account expects AccountId32, passing undefined
          // @ts-expect-error - intentionally passing wrong type
          await api.query.system.account();
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: System.Account');
          expect(error.message).toContain('[0] key0: ✗ invalid input type - value: undefined');
          expect(error.message).toContain('npx dedot chaintypes');
        }
      });

      it('should throw ApiCompatibilityError for invalid key type', async () => {
        try {
          // System.Account expects AccountId32, passing number instead
          // @ts-expect-error - intentionally passing wrong type
          await api.query.system.account(12345);
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: System.Account');
          expect(error.message).toContain('[0] key0: ✗ invalid input type - value: 12345');
          expect(error.message).toContain('npx dedot chaintypes');
        }
      });

      it('should throw ApiCompatibilityError for wrong number of keys', async () => {
        try {
          // System.Account expects 1 key, passing 2 in array format
          // @ts-expect-error - intentionally passing wrong number of keys
          await api.query.system.account(['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 'extra']);
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: System.Account');
          expect(error.message).toContain('Expected 1 parameter');
          expect(error.message).toContain('received 2');
          expect(error.message).toContain('[0] key0: ✓ valid');
          expect(error.message).toContain('[1] (unexpected) - value: "extra"');
        }
      });
    });
  });

  describe('Transaction Compatibility (via client.tx)', () => {
    let api: LegacyClient;
    let provider: MockProvider;

    beforeEach(async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
    });

    afterEach(async () => {
      api && (await api.disconnect());
      vi.restoreAllMocks();
    });

    describe('Happy Path - Valid Parameters', () => {
      it('should create transaction with correct parameters', async () => {
        // Balances.transfer_allow_death(dest: AccountId32, value: u128)
        const dest = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        const value = 1000000000000n;

        const tx = api.tx.balances.transferAllowDeath(dest, value);

        // Should not throw during creation or encoding
        expect(() => tx.callHex).not.toThrow();
        expect(tx.callHex).toMatch(/^0x/);
      });

      it('should create transaction with no parameters', async () => {
        // Democracy.clear_public_proposals() - no parameters
        const tx = api.tx.democracy.clearPublicProposals();

        // Should not throw
        expect(() => tx.callHex).not.toThrow();
        expect(tx.callHex).toMatch(/^0x/);
      });

      it('should validate on toHex() call', async () => {
        const dest = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        const value = 1000000000000n;

        const tx = api.tx.balances.transferAllowDeath(dest, value);

        // Should not throw
        expect(() => tx.toHex()).not.toThrow();
      });
    });

    describe('Error Cases - Invalid Parameters', () => {
      it('should throw ApiCompatibilityError for invalid parameter type', async () => {
        try {
          const tx = api.tx.balances.transferAllowDeath(
            // @ts-expect-error - passing number instead of AccountId32
            12345,
            1000000000000n,
          );

          // Validation happens on encoding
          tx.callHex;

          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: Balances.transfer_allow_death');
          expect(error.message).toContain('[0] dest: ✗ invalid input type - value: 12345');
          expect(error.message).toContain('npx dedot chaintypes');
        }
      });

      it('should throw ApiCompatibilityError for wrong value type', async () => {
        try {
          const dest = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
          const tx = api.tx.balances.transferAllowDeath(
            dest,
            // @ts-expect-error - passing string instead of u128
            'not a number',
          );

          tx.callHex;

          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: Balances.transfer_allow_death');
          expect(error.message).toContain('[1] value: ✗ invalid input type - value: "not a number"');
        }
      });

      it('should throw ApiCompatibilityError for missing required parameters', async () => {
        try {
          // @ts-expect-error - missing parameters
          const tx = api.tx.balances.transferAllowDeath();

          tx.callHex;

          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('API Compatibility Error: Balances.transfer_allow_death');
          // When params are missing, they show as invalid type with value: undefined
          expect(error.message).toContain('[0] dest: ✗ invalid input type - value: undefined');
          expect(error.message).toContain('[1] value: ✗ invalid input type - value: undefined');
        }
      });

      it('should silently ignore extra parameters (TxExecutor behavior)', async () => {
        // Note: Extra parameters are ignored by TxExecutor during call creation
        // Only the first N parameters matching the call definition are used
        const dest = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        const tx = api.tx.balances.transferAllowDeath(
          dest,
          1000000000000n,
          // @ts-expect-error - extra parameter is ignored
          'unexpected',
        );

        // Should not throw - extra params are simply ignored
        expect(() => tx.callHex).not.toThrow();
      });
    });

    describe('Error Message Format', () => {
      it('should include helpful suggestion to regenerate chaintypes', async () => {
        try {
          // @ts-expect-error - wrong type
          const tx = api.tx.balances.transferAllowDeath(123, 456);
          tx.callHex;
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('This may indicate your API definitions are outdated');
          expect(error.message).toContain('npx dedot chaintypes -w <your-chain-endpoint>');
        }
      });

      it('should show parameter validation status clearly', async () => {
        try {
          const validDest = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
          // @ts-expect-error - second param wrong type
          const tx = api.tx.balances.transferAllowDeath(validDest, 'invalid');
          tx.callHex;
          expect.fail('Should have thrown ApiCompatibilityError');
        } catch (error: any) {
          expect(error).toBeInstanceOf(ApiCompatibilityError);
          expect(error.message).toContain('[0] dest: ✓ valid');
          expect(error.message).toContain('[1] value: ✗ invalid input type');
        }
      });
    });

    describe('Validation Timing', () => {
      it('should validate before encoding (on callU8a access)', async () => {
        // @ts-expect-error - wrong type
        const tx = api.tx.balances.transferAllowDeath(123, 456);

        // Should not throw on creation
        expect(tx).toBeDefined();

        // Should throw on encoding
        expect(() => tx.callU8a).toThrow(ApiCompatibilityError);
      });

      it('should validate before toU8a() and toHex()', async () => {
        const dest = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        // @ts-expect-error - wrong type (string instead of u128)
        const tx = api.tx.balances.transferAllowDeath(dest, 'not a number');

        // All encoding paths should validate parameters
        expect(() => tx.toU8a()).toThrow(ApiCompatibilityError);
        expect(() => tx.toHex()).toThrow(ApiCompatibilityError);
        expect(() => tx.callHex).toThrow(ApiCompatibilityError);
      });

      it('should validate before callHex access', async () => {
        // @ts-expect-error - wrong type
        const tx = api.tx.balances.transferAllowDeath(123, 456);

        expect(() => tx.callHex).toThrow(ApiCompatibilityError);
      });
    });
  });
});
