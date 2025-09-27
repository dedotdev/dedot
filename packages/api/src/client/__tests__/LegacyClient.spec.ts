import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { SubstrateRuntimeVersion } from '@dedot/api';
import type { RuntimeVersion } from '@dedot/codecs';
import { WsProvider } from '@dedot/providers';
import type { AnyShape } from '@dedot/shape';
import * as $ from '@dedot/shape';
import { HexString, stringCamelCase, stringPascalCase, u8aToHex } from '@dedot/utils';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { LegacyClient } from '../LegacyClient.js';
import MockProvider, { MockedRuntimeVersion } from './MockProvider.js';

describe('LegacyClient', () => {
  it('should throws error for invalid endpoint', async () => {
    await expect(async () => {
      await LegacyClient.new(new WsProvider('invalid_endpoint'));
    }).rejects.toThrowError(
      'Invalid websocket endpoint invalid_endpoint, a valid endpoint should start with wss:// or ws://',
    );
  });

  describe('cache disabled', () => {
    let api: LegacyClient, provider: MockProvider;
    beforeEach(async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
    });

    afterEach(async () => {
      api && (await api.disconnect());
    });

    it('should create new api instance', async () => {
      expect(api.rpc).toBeDefined();
      expect(api.query).toBeDefined();
      expect(api.events).toBeDefined();
      expect(api.errors).toBeDefined();
      expect(api.consts).toBeDefined();
      expect(api.metadata.version).toEqual('V15');
      expect(api.currentMetadataKey).toEqual(
        `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/1`,
      );
    });

    describe('const', () => {
      it('should inspect constants', () => {
        api.metadata.latest.pallets.forEach((pallet) => {
          pallet.constants.forEach((cnst) => {
            expect(() => api.consts[stringCamelCase(pallet.name)][stringCamelCase(cnst.name)]).not.toThrowError();
          });
        });
      });

      it('should throw error if constants not found', () => {
        expect(() => {
          api.consts.palletName.notFound;
        }).toThrowError(new Error('Pallet not found: palletName'));

        expect(() => {
          api.consts.system.notFound;
        }).toThrowError(new Error('Constant notFound not found in pallet system'));
      });
    });

    describe('storage query', () => {
      it('should query storage', () => {
        api.metadata.latest.pallets.forEach((pallet) => {
          pallet.storage?.entries.forEach((entry) => {
            expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)]).toBeDefined();
            expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].meta).toBeDefined();
            expectTypeOf(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].rawKey).toBeFunction();

            if (entry.storageType.type === 'Map') {
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].multi).toBeDefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].pagedKeys).toBeDefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].pagedEntries).toBeDefined();
            } else {
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].multi).toBeUndefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].pagedKeys).toBeUndefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].pagedEntries).toBeUndefined();
            }
          });
        });
      });

      it('should throws error if query entry not found', async () => {
        await expect(async () => {
          await api.query.palletName.notFound();
        }).rejects.toThrowError(new Error('Pallet not found: palletName'));

        await expect(async () => {
          // @ts-ignore
          await api.query.system.notFound();
        }).rejects.toThrowError(new Error(`Storage item not found: notFound`));
      });
    });

    describe('errors', () => {
      it('should inspect errors', () => {
        api.metadata.latest.pallets.forEach((pallet) => {
          if (!pallet.error) return;
          const event = api.metadata.latest.types[pallet.error.typeId];
          if (event.typeDef.type === 'Enum') {
            event.typeDef.value.members.forEach((m) => {
              expect(api.errors[stringCamelCase(pallet.name)][stringPascalCase(m.name)]).toHaveProperty(['is']);
            });
          }
        });
      });

      it('should throws error if error not found', () => {
        expect(() => {
          // @ts-ignore
          api.errors.palletName.notFound;
        }).toThrowError(new Error('Pallet not found: palletName'));

        expect(() => {
          // @ts-ignore
          api.errors.system.notFound;
        }).toThrowError(new Error(`Error def not found for notFound`));
      });
    });

    describe('events', () => {
      it('should inspect events', () => {
        api.metadata.latest.pallets.forEach((pallet) => {
          if (!pallet.event) return;
          const event = api.metadata.latest.types[pallet.event.typeId];
          if (event.typeDef.type === 'Enum') {
            event.typeDef.value.members.forEach((m) => {
              expect(api.events[stringCamelCase(pallet.name)][stringPascalCase(m.name)]).toHaveProperty(['is']);
            });
          }
        });
      });

      it('should throws error if event not found', () => {
        expect(() => {
          // @ts-ignore
          api.events.palletName.notFound;
        }).toThrowError(new Error('Pallet not found: palletName'));

        expect(() => {
          // @ts-ignore
          api.events.system.notFound;
        }).toThrowError(new Error(`Event def not found for notFound`));
      });
    });

    describe('rpc', () => {
      it('should call rpc methods', async () => {
        const providerSend = vi.spyOn(api.provider, 'send');

        await api.rpc.state_getMetadata();
        expect(providerSend).toBeCalledWith('state_getMetadata', []);

        await api.rpc.state_getRuntimeVersion();
        expect(providerSend).toBeCalledWith('state_getRuntimeVersion', []);
      });

      it('should call arbitrary rpc', async () => {
        const providerSend = vi.spyOn(api.provider, 'send').mockImplementation(() => vi.fn() as any);

        await api.rpc.module_rpc_name('param_1', 'param_2');
        expect(providerSend).toBeCalledWith('module_rpc_name', ['param_1', 'param_2']);
      });
    });

    describe('runtime apis call', () => {
      it('should works properly', async () => {
        const providerSend = vi.spyOn(api.provider, 'send');

        await api.call.metadata.metadata();
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata', '0x']);

        await api.call.metadata.metadataAtVersion(14);
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata_at_version', '0x0e000000']); // $.u32.decode(14) = '0x0e000000'
      });

      it('should throws error if runtime not support or call spec not found', async () => {
        expect(() => api.call.metadata.notFound()).toThrowError('Runtime api spec not found for Metadata_not_found');
        expect(() => api.call.notFound.notFound()).toThrowError('Runtime api spec not found for NotFound_not_found');
      });
    });

    describe('custom runtime apis call', () => {
      it('should works properly', async () => {
        const $testParamCodec = {
          tryDecode: vi.fn(),
          tryEncode: vi.fn(() => new Uint8Array()),
        };
        const $mockCodec = {
          tryDecode: vi.fn(),
          tryEncode: vi.fn(() => new Uint8Array()),
        };

        api = await LegacyClient.create({
          provider: new MockProvider(),
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

        await api.call.metadata.testMethod('hello');

        expect($testParamCodec.tryEncode).toBeCalledWith('hello');
        expect($mockCodec.tryDecode).toBeCalled();
      });
    });

    describe('tx calls', () => {
      it('should be available', async () => {
        api.metadata.latest.pallets.forEach((pallet) => {
          if (!pallet.calls) return;
          const calls = api.metadata.latest.types[pallet.calls.typeId];
          if (calls.typeDef.type === 'Enum') {
            calls.typeDef.value.members.forEach((m) => {
              const tx = api.tx[stringCamelCase(pallet.name)][stringCamelCase(m.name)];
              expectTypeOf(tx).toBeFunction();
              expect(tx).toHaveProperty(['meta']);
            });
          }
        });
      });

      it('should throws error', async () => {
        expect(() => api.tx.system.notFound()).toThrowError(`Tx call spec not found for system.notFound`);
        expect(() => api.tx.notFound.notFound()).toThrowError(`Pallet not found: notFound`);
      });
    });

    describe('create api instance at a specific block', () => {
      it('should fetch runtime version for the block', async () => {
        const providerSend = vi.spyOn(provider, 'send');
        const _ = await api.at('0x12345678');

        // Now fetches runtime version from parent block (0x0c according to chain_getHeader mock)
        expect(providerSend).toBeCalledWith('chain_getHeader', ['0x12345678']);
        expect(providerSend).toBeCalledWith('state_getRuntimeVersion', ['0x0c']);
        // runtime version is not changing, so the metadata can be re-use
        expect(providerSend).not.toBeCalledWith('state_call', [
          'Metadata_metadata_at_version',
          '0x10000000',
          '0x0c',
        ]);
      });

      it('should re-fetch metadata if runtime version is changing', async () => {
        provider.setRpcRequest(
          'state_getRuntimeVersion',
          () => ({ ...MockedRuntimeVersion, specVersion: 0 }) as RuntimeVersion,
        );

        provider.setRpcRequest('state_call', async (params) => {
          return new Promise<HexString>((resolve) => {
            setTimeout(() => {
              if (params[0] === 'Metadata_metadata_versions') {
                resolve('0x0c100000000f0000000e000000');
              } else {
                resolve('0x');
              }
            }, 300);
          });
        });

        const providerSend = vi.spyOn(provider, 'send');
        const _ = await api.at('0x12345678');

        // Now fetches runtime version from parent block (0x0c according to chain_getHeader mock)
        expect(providerSend).toBeCalledWith('chain_getHeader', ['0x12345678']);
        expect(providerSend).toBeCalledWith('state_getRuntimeVersion', ['0x0c']);
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata_versions', '0x', '0x0c']); // $.u32.decode(16) = '0x10000000'
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata_at_version', '0x10000000', '0x0c']); // $.u32.decode(16) = '0x10000000'
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata_at_version', '0x0f000000', '0x0c']); // $.u32.decode(15) = '0x0f000000'
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata_at_version', '0x0e000000', '0x0c']); // $.u32.decode(14) = '0x0e000000'
      });

      it('should define valid props', async () => {
        const apiAt = await api.at('0x12345678');

        expect(apiAt.rpcVersion).toEqual('legacy');
        expect(apiAt.atBlockHash).toEqual('0x12345678');
        expect(apiAt.options).toBeDefined();
        expect(apiAt.runtimeVersion).toBeDefined();
        expect(apiAt.registry).toBeDefined();
        expect(apiAt.metadata.version).toEqual('V15');
        expect(apiAt.rpc).toBeDefined();
        expect(apiAt.query).toBeDefined();
        expect(apiAt.events).toBeDefined();
        expect(apiAt.errors).toBeDefined();
        expect(apiAt.consts).toBeDefined();
      });

      it('should call/query api with block hash', async () => {
        provider.setRpcRequest('state_getStorage', () => u8aToHex($.u32.encode(123)));

        const providerSend = vi.spyOn(api.provider, 'send');

        const atHash = '0x12345678';

        const apiAt = await api.at(atHash);

        await apiAt.rpc.system_chain();
        expect(providerSend).toBeCalledWith('system_chain', []);

        const key = apiAt.query.system.number.rawKey();
        await apiAt.query.system.number();
        expect(providerSend).toBeCalledWith('state_queryStorageAt', [[key], atHash]);

        await apiAt.call.metadata.metadata();
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata', '0x', atHash]);
      });

      it('should maintain proxy chain independence for events', async () => {
        const apiAt = await api.at('0x12345678');

        // Access multiple events - they should be independent
        const eventRefs = [
          apiAt.events.system.ExtrinsicSuccess,
          apiAt.events.system.ExtrinsicFailed,
          apiAt.events.system.CodeUpdated,
          apiAt.events.balances.Transfer,
        ];

        // Each should have independent metadata
        expect(eventRefs[0].meta.name).toEqual('ExtrinsicSuccess');
        expect(eventRefs[1].meta.name).toEqual('ExtrinsicFailed');
        expect(eventRefs[2].meta.name).toEqual('CodeUpdated');
        expect(eventRefs[3].meta.name).toEqual('Transfer');

        // Access them again in different order - should still work
        const eventRefs2 = [
          apiAt.events.system.ExtrinsicFailed,
          apiAt.events.system.ExtrinsicSuccess,
          apiAt.events.balances.Transfer,
        ];

        expect(eventRefs2[0].meta.name).toEqual('ExtrinsicFailed');
        expect(eventRefs2[1].meta.name).toEqual('ExtrinsicSuccess');
        expect(eventRefs2[2].meta.name).toEqual('Transfer');
      });

      it('should maintain proxy chain independence for errors', async () => {
        const apiAt = await api.at('0x12345678');

        // Access multiple errors - they should be independent
        const errorRefs = [
          apiAt.errors.system.InvalidSpecName,
          apiAt.errors.system.SpecVersionNeedsToIncrease,
          apiAt.errors.balances.InsufficientBalance,
        ];

        // Each should have independent metadata
        expect(errorRefs[0].meta.name).toEqual('InvalidSpecName');
        expect(errorRefs[1].meta.name).toEqual('SpecVersionNeedsToIncrease');
        expect(errorRefs[2].meta.name).toEqual('InsufficientBalance');
      });
    });

    describe('queryMulti', () => {
      it('should query multiple storage items', async () => {
        // Mock storage query functions
        const mockQueryFn1 = {
          meta: { pallet: 'system', name: 'number' },
          rawKey: vi.fn().mockReturnValue('0x01'),
        };
        const mockQueryFn2 = {
          meta: { pallet: 'system', name: 'events' },
          rawKey: vi.fn().mockReturnValue('0x02'),
        };

        // Set up the spy before making the call
        const providerSend = vi.spyOn(api.provider, 'send');

        // Mock state_queryStorageAt response
        const mockChanges = [
          {
            changes: [
              ['0x01', '0xvalue1'],
              ['0x02', '0xvalue2'],
            ],
          },
        ];
        provider.setRpcRequest('state_queryStorageAt', () => mockChanges);

        // Mock QueryableStorage
        const mockDecodedValue1 = 42;
        const mockDecodedValue2 = ['event1', 'event2'];

        // Use vi.spyOn to mock the QueryableStorage constructor and its decodeValue method
        const originalQueryableStorage = await import('../../storage/QueryableStorage.js').then(
          (m) => m.QueryableStorage,
        );
        vi.spyOn(originalQueryableStorage.prototype, 'decodeValue')
          .mockImplementationOnce(() => mockDecodedValue1)
          .mockImplementationOnce(() => mockDecodedValue2);

        // Call queryMulti
        const result = await api.queryMulti([
          { fn: mockQueryFn1 as any, args: [] },
          { fn: mockQueryFn2 as any, args: [] },
        ]);

        // Verify rawKey was called
        expect(mockQueryFn1.rawKey).toHaveBeenCalled();
        expect(mockQueryFn2.rawKey).toHaveBeenCalled();

        // Verify state_queryStorageAt was called with the correct keys
        expect(providerSend).toHaveBeenCalledWith('state_queryStorageAt', [['0x01', '0x02']]);

        // Verify the result contains the decoded values
        expect(result).toEqual([mockDecodedValue1, mockDecodedValue2]);
      });

      it('should handle subscription-based queries', async () => {
        // Mock storage query functions
        const mockQueryFn1 = {
          meta: { pallet: 'system', name: 'number' },
          rawKey: vi.fn().mockReturnValue('0x01'),
        };
        const mockQueryFn2 = {
          meta: { pallet: 'system', name: 'events' },
          rawKey: vi.fn().mockReturnValue('0x02'),
        };

        // Set up the spy before making the call
        const providerSend = vi.spyOn(api.provider, 'send');

        // Create a mock subscription ID
        const mockSubscriptionId = 'storage-sub-123';

        // Create a mock unsubscribe function
        const mockUnsub = vi.fn();

        // Mock the state_subscribeStorage RPC method to return the subscription ID
        provider.setRpcRequest('state_subscribeStorage', () => mockSubscriptionId);

        // Mock the state_unsubscribeStorage RPC method
        provider.setRpcRequest('state_unsubscribeStorage', () => {
          mockUnsub();
          return true;
        });

        // Mock QueryableStorage
        const mockDecodedValue1 = 42;
        const mockDecodedValue2 = ['event1', 'event2'];

        const originalQueryableStorage = await import('../../storage/QueryableStorage.js').then(
          (m) => m.QueryableStorage,
        );
        vi.spyOn(originalQueryableStorage.prototype, 'decodeValue').mockImplementation((raw) => {
          if (raw === '0xvalue1') return mockDecodedValue1;
          if (raw === '0xvalue2') return mockDecodedValue2;
          if (raw === '0xnewvalue1') return 43;
          if (raw === '0xnewvalue2') return ['event3', 'event4'];
          return undefined;
        });

        // Mock callback
        const callback = vi.fn();

        // Call queryMulti with subscription
        const unsub = await api.queryMulti(
          [
            { fn: mockQueryFn1 as any, args: [] },
            { fn: mockQueryFn2 as any, args: [] },
          ],
          callback,
        );

        // Verify state_subscribeStorage was called with the correct keys
        expect(providerSend).toHaveBeenCalledWith('state_subscribeStorage', expect.any(Array));

        // Simulate a change event by directly calling the callback registered in the provider
        const mockChangeSet = {
          changes: [
            ['0x01', '0xvalue1'],
            ['0x02', '0xvalue2'],
          ],
        };

        // Use the notify method to simulate a subscription update
        provider.notify(mockSubscriptionId, mockChangeSet);

        // Wait for the callback to be called
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Verify the callback was called with the decoded values
        expect(callback).toHaveBeenCalledWith([mockDecodedValue1, mockDecodedValue2]);

        // Simulate another change event with different values
        const mockChangeSet2 = {
          changes: [
            ['0x01', '0xnewvalue1'],
            ['0x02', '0xnewvalue2'],
          ],
        };

        // Reset the mock to check only the new call
        callback.mockReset();

        // Use the notify method to simulate another subscription update
        provider.notify(mockSubscriptionId, mockChangeSet2);

        // Wait for the callback to be called
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Verify the callback was called with the new decoded values
        expect(callback).toHaveBeenCalledWith([43, ['event3', 'event4']]);

        // Verify the unsubscribe function
        expect(typeof unsub).toBe('function');

        // Call the unsubscribe function
        await (unsub as Function)();

        // Verify the mock unsubscribe was called
        expect(mockUnsub).toHaveBeenCalledTimes(1);
      });

      it('should handle empty query array', async () => {
        const result = await api.queryMulti([]);
        expect(result).toEqual([]);
      });

      it('should handle errors from storage service', async () => {
        // Mock storage query functions
        const mockQueryFn = {
          meta: { pallet: 'system', name: 'number' },
          rawKey: vi.fn().mockReturnValue('0x01'),
        };

        // Mock state_queryStorageAt to throw an error
        const mockError = new Error('Storage query failed');
        provider.setRpcRequest('state_queryStorageAt', () => {
          throw mockError;
        });

        // Call queryMulti and expect it to reject with the error
        await expect(api.queryMulti([{ fn: mockQueryFn as any, args: [] }])).rejects.toThrow(mockError);
      });
    });

    describe('runtime versions', () => {
      it('should emit runtimeUpgraded event', async () => {
        const originalRuntime = api.runtimeVersion;
        const nextRuntime = { ...MockedRuntimeVersion, specVersion: originalRuntime.specVersion + 1 } as RuntimeVersion;

        setTimeout(() => {
          provider.notify('runtime-version-subscription-id', nextRuntime);
        }, 100);

        await new Promise<void>((resolve, reject) => {
          api.on('runtimeUpgraded', (newRuntime: SubstrateRuntimeVersion) => {
            try {
              expect(nextRuntime.specVersion).toEqual(newRuntime.specVersion);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });

        expect(nextRuntime.specVersion).toEqual(api.runtimeVersion.specVersion);
        expect(nextRuntime.specVersion).toEqual(originalRuntime.specVersion + 1);
      });

      it('getRuntimeVersion should return the latest version', async () => {
        provider.setRpcRequests({
          state_call: async (params) => {
            return new Promise<HexString>((resolve) => {
              setTimeout(() => {
                if (params[0] === 'Metadata_metadata_at_version') {
                  resolve(staticSubstrateV15);
                } else {
                  resolve('0x');
                }
              }, 300);
            });
          },
        });

        const originalRuntime = api.runtimeVersion;
        const nextRuntime = { ...MockedRuntimeVersion, specVersion: originalRuntime.specVersion + 1 } as RuntimeVersion;
        provider.notify('runtime-version-subscription-id', nextRuntime);

        const newVersion = await new Promise<SubstrateRuntimeVersion>((resolve) => {
          setTimeout(async () => {
            resolve(await api.getRuntimeVersion());
          }, 100);
        });

        expect(originalRuntime.specVersion + 1).toEqual(newVersion.specVersion);
      });
    });
  });

  describe('cache enabled', () => {
    let api: LegacyClient;
    beforeEach(async () => {
      api = await LegacyClient.new({ provider: new MockProvider(), cacheMetadata: true });
    });

    afterEach(async () => {
      if (api) {
        await api.clearCache();
        await api.disconnect();
      }
    });

    it('should load metadata from cache', async () => {
      const provider = new MockProvider();
      const providerSendSpy = vi.spyOn(provider, 'send');
      const newApi = await LegacyClient.new({ provider, cacheMetadata: true });

      expect(providerSendSpy).not.toBeCalledWith('state_getMetadata', []);
      expect(newApi.metadata).toBeDefined();
    });

    it("should refetch metadata if it's outdated", async () => {
      const provider = new MockProvider();

      // Upgrade runtime version
      provider.setRpcRequest(
        'state_getRuntimeVersion',
        () => ({ ...MockedRuntimeVersion, specVersion: 2 }) as RuntimeVersion,
      );

      const providerSendSpy = vi.spyOn(provider, 'send');
      const newApi = await LegacyClient.new({ provider, cacheMetadata: true });

      expect(providerSendSpy).toBeCalledWith('state_getMetadata', []);
      expect(newApi.metadata).toBeDefined();
      expect(newApi.currentMetadataKey).toEqual(
        `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2`,
      );
    });
  });

  describe('not throwOnUnknownApi', () => {
    let api: LegacyClient;
    beforeEach(async () => {
      api = await LegacyClient.new({ provider: new MockProvider(), throwOnUnknownApi: false });
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
});
