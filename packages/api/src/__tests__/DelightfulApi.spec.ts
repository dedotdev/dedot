import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DelightfulApi from '../DelightfulApi';
import MockProvider from './MockProvider';
import { SubstrateApi } from '@delightfuldot/chaintypes';
import { stringCamelCase, stringPascalCase } from '@polkadot/util';
import { RuntimeVersion } from '@delightfuldot/types';

describe('DelightfulApi', () => {
  describe('cache disabled', () => {
    let api: DelightfulApi<SubstrateApi>;
    beforeEach(async () => {
      api = await DelightfulApi.new({ provider: new MockProvider() });
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
          api.errors.palletName.notFound();
        }).toThrowError(new Error('Pallet not found: palletName'));

        expect(() => {
          // @ts-ignore
          api.errors.system.notFound();
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
          api.events.palletName.notFound();
        }).toThrowError(new Error('Pallet not found: palletName'));

        expect(() => {
          // @ts-ignore
          api.events.system.notFound();
        }).toThrowError(new Error(`Event def not found for notFound`));
      });
    });

    describe('rpc', () => {
      it('should call rpc methods', async () => {
        const providerSend = vi.spyOn(api.provider, 'send');

        await api.rpc.state.getMetadata();
        expect(providerSend).toBeCalledWith('state_getMetadata', []);

        await api.rpc.state.getRuntimeVersion();
        expect(providerSend).toBeCalledWith('state_getRuntimeVersion', []);
      });

      it('should call arbitrary rpc', async () => {
        const providerSend = vi.spyOn(api.provider, 'send').mockImplementation(() => vi.fn() as any);

        await api.rpc.module.rpc_name('param_1', 'param_2');
        expect(providerSend).toBeCalledWith('module_rpc_name', ['param_1', 'param_2']);
      });
    });
  });

  describe('cache enabled', () => {
    let api: DelightfulApi<SubstrateApi>;
    beforeEach(async () => {
      api = await DelightfulApi.new({ provider: new MockProvider(), cacheMetadata: true });
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
      const newApi = await DelightfulApi.new({ provider, cacheMetadata: true });

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
      const newApi = await DelightfulApi.new({ provider, cacheMetadata: true });

      expect(providerSendSpy).toBeCalledWith('state_getMetadata', []);
      expect(newApi.metadata).toBeDefined();
      expect(newApi.currentMetadataKey).toEqual(
        `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2`,
      );
    });
  });
});
