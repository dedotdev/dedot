import { RuntimeVersion, $Bytes } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { ApiCompatibilityError, calcRuntimeApiHash } from '@dedot/utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LegacyClient } from '../../client/LegacyClient.js';
import MockProvider, { MockedRuntimeVersion } from '../../client/__tests__/MockProvider.js';

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
          expect(error.message).toContain('[0] version: missing');
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
          expect(error.message).toContain('[1] (unexpected)');
          expect(error.message).toContain('[2] (unexpected)');
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
          expect(error.message).toContain('[0] version: ✗ invalid input type');
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
          expect(error.message).toContain('[1] (unexpected)');
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
  });
});
