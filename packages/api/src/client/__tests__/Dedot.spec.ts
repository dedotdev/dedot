import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Dedot } from '../Dedot.js';
import MockProvider from './MockProvider.js';
import { SubstrateApi } from '@dedot/chaintypes';
import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import { RuntimeVersion } from '@dedot/codecs';
import { AnyShape } from '@dedot/shape';

describe('Dedot', () => {
  it('should throws error for invalid endpoint', () => {
    expect(async () => {
      await Dedot.new('invalid_endpoint');
    }).rejects.toThrowError(
      'Invalid websocket endpoint invalid_endpoint, a valid endpoint should start with wss:// or ws://',
    );
  });

  describe('cache disabled', () => {
    let api: Dedot<SubstrateApi>;
    beforeEach(async () => {
      api = await Dedot.new({ provider: new MockProvider() });
    });

    afterEach(async () => {
      api && (await api.disconnect());
    });

    it('should create new api instance', async () => {
      expect(api.jsonrpc).toBeDefined();
      expect(api.query).toBeDefined();
      expect(api.events).toBeDefined();
      expect(api.errors).toBeDefined();
      expect(api.consts).toBeDefined();
      expect(api.hasMetadata).toEqual(true);
      expect(api.metadata.metadataVersioned.tag).toEqual('V14');
      expect(api.currentMetadataKey).toEqual(
        `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/1`,
      );
    });

    describe('const', () => {
      it('should inspect constants', () => {
        api.metadataLatest.pallets.forEach((pallet) => {
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
        api.metadataLatest.pallets.forEach((pallet) => {
          pallet.storage?.entries.forEach((entry) => {
            expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)]).toBeDefined();
            expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].multi).toBeDefined();
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
        api.metadataLatest.pallets.forEach((pallet) => {
          if (!pallet.error) return;
          const event = api.metadataLatest.types[pallet.error];
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
        api.metadataLatest.pallets.forEach((pallet) => {
          if (!pallet.event) return;
          const event = api.metadataLatest.types[pallet.event];
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

        await api.jsonrpc.state_getMetadata();
        expect(providerSend).toBeCalledWith('state_getMetadata', []);

        await api.jsonrpc.state_getRuntimeVersion();
        expect(providerSend).toBeCalledWith('state_getRuntimeVersion', []);
      });

      it('should call arbitrary rpc', async () => {
        const providerSend = vi.spyOn(api.provider, 'send').mockImplementation(() => vi.fn() as any);

        await api.jsonrpc.module_rpc_name('param_1', 'param_2');
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
        api.metadataLatest.pallets.forEach((pallet) => {
          if (!pallet.calls) return;
          const calls = api.metadataLatest.types[pallet.calls];
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
  });

  describe('cache enabled', () => {
    let api: Dedot<SubstrateApi>;
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
        () => ({ specVersion: 2, specName: 'MockedSpec' }) as RuntimeVersion,
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
    let api: Dedot<SubstrateApi>;
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
