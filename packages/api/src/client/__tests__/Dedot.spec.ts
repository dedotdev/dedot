import type { RuntimeVersion } from '@dedot/codecs';
import type { AnyShape } from '@dedot/shape';
import * as $ from '@dedot/shape';
import { stringCamelCase, stringPascalCase, u8aToHex } from '@dedot/utils';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Dedot } from '../Dedot.js';
import MockProvider, { MockedRuntimeVersion } from './MockProvider.js';

describe('Dedot', () => {
  it('should throws error for invalid endpoint', () => {
    expect(async () => {
      await Dedot.new('invalid_endpoint');
    }).rejects.toThrowError(
      'Invalid websocket endpoint invalid_endpoint, a valid endpoint should start with wss:// or ws://',
    );
  });

  describe('cache disabled', () => {
    let api: Dedot, provider: MockProvider;
    beforeEach(async () => {
      provider = new MockProvider();
      api = await Dedot.new({ provider });
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
      expect(api.metadata.version).toEqual('V14');
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

            if (entry.type.tag === 'Map') {
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].multi).toBeDefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].keys).toBeDefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].entries).toBeDefined();
            } else {
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].multi).toBeUndefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].keys).toBeUndefined();
              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].entries).toBeUndefined();
            }
          });
        });
      });

      it('should throws error if query entry not found', () => {
        expect(async () => {
          await api.query.palletName.notFound();
        }).rejects.toThrowError(new Error('Pallet not found: palletName'));

        expect(async () => {
          // @ts-ignore
          await api.query.system.notFound();
        }).rejects.toThrowError(new Error(`Storage item not found: notFound`));
      });
    });

    describe('errors', () => {
      it('should inspect errors', () => {
        api.metadata.latest.pallets.forEach((pallet) => {
          if (!pallet.error) return;
          const event = api.metadata.latest.types[pallet.error];
          if (event.type.tag === 'Enum') {
            event.type.value.members.forEach((m) => {
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
          const event = api.metadata.latest.types[pallet.event];
          if (event.type.tag === 'Enum') {
            event.type.value.members.forEach((m) => {
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

        api = await Dedot.create({
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
          const calls = api.metadata.latest.types[pallet.calls];
          if (calls.type.tag === 'Enum') {
            calls.type.value.members.forEach((m) => {
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

        expect(providerSend).toBeCalledWith('state_getRuntimeVersion', ['0x12345678']);
        // runtime version is not changing, so the metadata can be re-use
        expect(providerSend).not.toBeCalledWith('state_call', [
          'Metadata_metadata_at_version',
          '0x0f000000',
          '0x12345678',
        ]);
      });

      it('should re-fetch metadata if runtime version is changing', async () => {
        provider.setRpcRequest(
          'state_getRuntimeVersion',
          () => ({ ...MockedRuntimeVersion, specVersion: 0 }) as RuntimeVersion,
        );

        const providerSend = vi.spyOn(provider, 'send');
        const _ = await api.at('0x12345678');

        expect(providerSend).toBeCalledWith('state_getRuntimeVersion', ['0x12345678']);
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata_at_version', '0x0f000000', '0x12345678']); // $.u32.decode(15) = '0x0f000000'
        expect(providerSend).toBeCalledWith('state_call', ['Metadata_metadata_at_version', '0x0e000000', '0x12345678']); // $.u32.decode(15) = '0x0f000000'
      });

      it('should define valid props', async () => {
        const apiAt = await api.at('0x12345678');

        expect(apiAt.atBlockHash).toEqual('0x12345678');
        expect(apiAt.options).toBeDefined();
        expect(apiAt.runtimeVersion).toBeDefined();
        expect(apiAt.registry).toBeDefined();
        expect(apiAt.metadata.version).toEqual('V14');
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
    });
  });

  describe('cache enabled', () => {
    let api: Dedot;
    beforeEach(async () => {
      api = await Dedot.new({ provider: new MockProvider(), cacheMetadata: true });
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
      const newApi = await Dedot.new({ provider, cacheMetadata: true });

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
      const newApi = await Dedot.new({ provider, cacheMetadata: true });

      expect(providerSendSpy).toBeCalledWith('state_getMetadata', []);
      expect(newApi.metadata).toBeDefined();
      expect(newApi.currentMetadataKey).toEqual(
        `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2`,
      );
    });
  });

  describe('not throwOnUnknownApi', () => {
    let api: Dedot;
    beforeEach(async () => {
      api = await Dedot.new({ provider: new MockProvider(), throwOnUnknownApi: false });
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
