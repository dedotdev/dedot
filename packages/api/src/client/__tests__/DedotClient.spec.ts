import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { SubstrateRuntimeVersion } from '@dedot/api';
import { $Metadata, $RuntimeVersion, type RuntimeVersion } from '@dedot/codecs';
import { WsProvider } from '@dedot/providers';
import type { AnyShape } from '@dedot/shape';
import * as $ from '@dedot/shape';
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
import { mockedRuntime, newChainHeadSimulator } from '../../json-rpc/group/__tests__/simulator.js';
import { DedotClient } from '../DedotClient.js';
import MockProvider from './MockProvider.js';

const prefixedMetadataV15 = u8aToHex(
  $.Option($.lenPrefixed($Metadata)).tryEncode($Metadata.tryDecode(staticSubstrateV15)),
);

describe('DedotClient', () => {
  it('should throws error for invalid endpoint', () => {
    expect(async () => {
      await DedotClient.new(new WsProvider('invalid_endpoint'));
    }).rejects.toThrowError(
      'Invalid websocket endpoint invalid_endpoint, a valid endpoint should start with wss:// or ws://',
    );
  });

  describe('api operations', () => {
    let simulator: ReturnType<typeof newChainHeadSimulator>;
    let provider: MockProvider, providerSend: MockInstance;
    beforeEach(async () => {
      provider = new MockProvider();
      providerSend = vi.spyOn(provider, 'send');
      simulator = newChainHeadSimulator({ provider });
      simulator.notify(simulator.initializedEvent);

      provider.setRpcRequests({
        chainSpec_v1_chainName: () => 'MockedChain',
        chainHead_v1_call: () => ({ result: 'started', operationId: 'call01' }) as MethodResponse,
        module_rpc_name: () => '0x',
      });

      simulator.notify({
        operationId: 'call01',
        event: 'operationCallDone',
        output: prefixedMetadataV15,
      } as OperationCallDone);
    });

    describe('cache disabled', () => {
      let api: DedotClient;
      beforeEach(async () => {
        api = await DedotClient.new({ provider });
      });

      afterEach(async () => {
        api && api.status !== 'disconnected' && (await api.disconnect());
      });

      // TODO fallback to chainHead_storage of chainSpec does not support

      it('should create new api instance', async () => {
        expect(providerSend).toBeCalledWith('chainHead_v1_call', [
          simulator.subscriptionId,
          await api.chainHead.bestHash(),
          'Metadata_metadata_at_version',
          '0x0f000000',
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
      });

      it('should unfollow chainHead on disconnect', async () => {
        const providerSend = vi.spyOn(provider, 'send');
        await api.disconnect();
        expect(providerSend).toBeCalledWith('chainHead_v1_unfollow', [simulator.subscriptionId]);
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

              // @ts-ignore
              expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].keys).toBeUndefined();

              if (entry.storageType.type === 'Map') {
                // @ts-ignore
                expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].multi).toBeDefined();
                // @ts-ignore
                expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].entries).toBeDefined();
              } else {
                // @ts-ignore
                expect(api.query[stringCamelCase(pallet.name)][stringCamelCase(entry.name)].multi).toBeUndefined();
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
            const event = api.metadata.latest.types[pallet.event];
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
          await api.rpc.chainSpec_v1_chainName();
          expect(providerSend).toBeCalledWith('chainSpec_v1_chainName', []);

          await api.rpc.rpc_methods();
          expect(providerSend).toBeCalledWith('rpc_methods', []);
        });

        it('should call arbitrary rpc', async () => {
          await api.rpc.module_rpc_name('param_1', 'param_2');
          expect(providerSend).toBeCalledWith('module_rpc_name', ['param_1', 'param_2']);
        });
      });

      describe('runtime apis call', () => {
        it('should works properly', async () => {
          // First call
          provider.setRpcRequest(
            'chainHead_v1_call',
            () => ({ result: 'started', operationId: 'call01' }) as MethodResponse,
          );

          simulator.notify({
            operationId: 'call01',
            event: 'operationCallDone',
            output: '0x',
          } as OperationCallDone);

          await api.call.metadata.metadata();
          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            await api.chainHead.bestHash(),
            'Metadata_metadata',
            '0x',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call01']);

          // Second call
          provider.setRpcRequest(
            'chainHead_v1_call',
            () => ({ result: 'started', operationId: 'call02' }) as MethodResponse,
          );

          simulator.notify({
            operationId: 'call02',
            event: 'operationCallDone',
            output: '0x',
          } as OperationCallDone);

          await api.call.metadata.metadataAtVersion(14);
          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            await api.chainHead.bestHash(),
            'Metadata_metadata_at_version',
            '0x0e000000',
          ]); // $.u32.decode(14) = '0x0e000000'

          expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
            simulator.subscriptionId,
            'call02',
          ]);
        });

        it('should throws error if runtime not support or call spec not found', async () => {
          expect(() => api.call.metadata.notFound()).toThrowError('Runtime api spec not found for Metadata_not_found');
          expect(() => api.call.notFound.notFound()).toThrowError('Runtime api spec not found for NotFound_not_found');
        });
      });

      describe('tx calls', () => {
        it('should be available', async () => {
          api.metadata.latest.pallets.forEach((pallet) => {
            if (!pallet.calls) return;
            const calls = api.metadata.latest.types[pallet.calls];
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

        describe('should track tx status', () => {
          beforeEach(() => {
            let counter = 0;
            provider.setRpcRequests({
              transaction_v1_broadcast: () => 'tx01',
              transaction_v1_stop: () => null,
              chainHead_v1_body: (_, hash) => {
                counter += 1;
                return { result: 'started', operationId: `body${counter}` } as MethodResponse;
              },
              chainHead_v1_call: () => {
                counter += 1;
                return { result: 'started', operationId: `call${counter}` } as MethodResponse;
              },
              chainHead_v1_storage: () => {
                counter += 1;
                return { result: 'started', operationId: `storage${counter}` } as MethodResponse;
              },
            });
          });

          it('should valid tx', async () => {
            simulator.notify({
              operationId: 'call1',
              event: 'operationCallDone',
              output: '0x010003', // valid tx
            } as OperationCallDone);

            await expect(api.tx.system.remarkWithEvent('Hello World').send()).rejects.toThrowError(
              'Invalid Tx: Invalid - Stale',
            );
          });

          it('Finalized tx', async () => {
            simulator.notify({
              operationId: 'call1',
              event: 'operationCallDone',
              output:
                '0x000080000000000000000490d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d850200003f0000000000000001', // valid tx
            } as OperationCallDone);

            const txHex = '0x3c0400072c48656c6c6f20576f726c64';
            simulator.notify(
              {
                operationId: 'body2',
                event: 'operationBodyDone',
                value: ['0x01', '0x02', txHex], // valid tx
              } as OperationBodyDone,
              10,
            );

            simulator.notify(
              {
                operationId: 'storage3',
                event: 'operationStorageDone',
              } as OperationStorageDone,
              15,
            );

            const remarkTx = api.tx.system.remarkWithEvent('Hello World');

            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextBestBlock(), 5);
            simulator.notify(simulator.nextFinalized(), 20);

            const defer = deferred<void>();
            const statuses: string[] = [];

            remarkTx.send(({ status }) => {
              statuses.push(status.type);
              if (status.type === 'Finalized') {
                defer.resolve();
              }
            });

            await defer.promise;

            expect(statuses).toEqual(['Validated', 'Broadcasting', 'BestChainBlockIncluded', 'Finalized']);
          });
          it('Invalid tx', async () => {
            simulator.notify({
              operationId: 'call1',
              event: 'operationCallDone',
              output:
                '0x000080000000000000000490d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d850200003f0000000000000001', // valid tx
            } as OperationCallDone);

            simulator.notify(
              {
                operationId: 'body2',
                event: 'operationBodyDone',
                value: ['0x01', '0x02'],
              } as OperationBodyDone,
              10,
            );

            simulator.notify(
              {
                operationId: 'call3',
                event: 'operationCallDone',
                output: '0x010003',
              } as OperationCallDone,
              20,
            );

            const remarkTx = api.tx.system.remarkWithEvent('Hello World');

            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextBestBlock(), 5);
            simulator.notify(simulator.nextFinalized(), 15);

            const defer = deferred<void>();
            const statuses: string[] = [];

            remarkTx.send(({ status }) => {
              statuses.push(status.type);
              if (status.type === 'Invalid' && status.value.error === 'Invalid Tx: Invalid - Stale') {
                defer.resolve();
              }
            });

            await defer.promise;

            expect(statuses).toEqual(['Validated', 'Broadcasting', 'Invalid']);
          });
          it('NoLongerInBestChain tx', async () => {
            simulator.notify({
              operationId: 'call1',
              event: 'operationCallDone',
              output:
                '0x000080000000000000000490d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d850200003f0000000000000001', // valid tx
            } as OperationCallDone);

            const txHex = '0x3c0400072c48656c6c6f20576f726c64';
            simulator.notify(
              {
                operationId: 'body2',
                event: 'operationBodyDone',
                value: ['0x01', '0x02', txHex], // valid tx
              } as OperationBodyDone,
              10,
            );

            simulator.notify(
              {
                operationId: 'storage3',
                event: 'operationStorageDone',
              } as OperationStorageDone,
              12,
            );

            simulator.notify(
              {
                operationId: 'body4',
                event: 'operationBodyDone',
                value: ['0x01', '0x02', '0x03'],
              } as OperationBodyDone,
              35,
            );

            simulator.notify(
              {
                operationId: 'body5',
                event: 'operationBodyDone',
                value: ['0x01', '0x02', txHex],
              } as OperationBodyDone,
              45,
            );

            simulator.notify(
              {
                operationId: 'storage6',
                event: 'operationStorageDone',
              } as OperationStorageDone,
              46,
            );

            simulator.notify(
              {
                operationId: 'call7',
                event: 'operationCallDone',
                output:
                  '0x000080000000000000000490d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d850200003f0000000000000001', // valid tx
              } as OperationCallDone,
              47,
            );

            const remarkTx = api.tx.system.remarkWithEvent('Hello World');

            simulator.notify(simulator.nextNewBlock()); // f
            simulator.notify(simulator.nextNewBlock({ fork: true })); // f-1
            simulator.notify(simulator.nextNewBlock()); // 10 -> f
            simulator.notify(simulator.nextNewBlock({ fork: true, fromWhichParentFork: 1 })); // 10-1 -> f-1
            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextNewBlock());
            simulator.notify(simulator.nextNewBlock());

            simulator.notify(simulator.nextBestBlock(), 5);
            simulator.notify(simulator.nextBestBlock(false, 1), 30);
            simulator.notify(simulator.nextBestBlock(true, 1), 40);

            simulator.notify(simulator.nextFinalized(1), 45);
            simulator.notify(simulator.nextFinalized(1), 50);

            const defer = deferred<void>();
            const statuses: string[] = [];
            let finalizedBlock;

            remarkTx.send(({ status }) => {
              statuses.push(status.type);
              if (status.type === 'Finalized') {
                finalizedBlock = status.value;
                defer.resolve();
              }
            });

            await defer.promise;

            expect(statuses).toEqual([
              'Validated',
              'Broadcasting',
              'BestChainBlockIncluded',
              'NoLongerInBestChain',
              'BestChainBlockIncluded',
              'Finalized',
            ]);
            expect(finalizedBlock).toEqual({ blockHash: '0x10-1', txIndex: 2 });
          });
        });
      });

      describe('create api instance at a specific block', () => {
        it('should fetch runtime version for the block', async () => {
          const providerSend = vi.spyOn(provider, 'send');

          provider.setRpcRequest(
            'chainHead_v1_call',
            () => ({ result: 'started', operationId: 'call03' }) as MethodResponse,
          );

          const newRuntime: RuntimeVersion = {
            specName: 'mock-spec',
            implName: 'mock-spec-impl',
            authoringVersion: 0,
            specVersion: 1,
            implVersion: 0,
            apis: [
              ['0x37e397fc7c91f5e4', 2],
              ['0xdf6acb689907609b', 4],
            ],
            transactionVersion: 25,
            stateVersion: 0,
          };

          simulator.notify({
            operationId: 'call03',
            event: 'operationCallDone',
            output: u8aToHex($RuntimeVersion.tryEncode(newRuntime)),
          } as OperationCallDone);

          const _ = await api.at('0x0d');

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0d',
            'Core_version',
            '0x',
          ]);

          expect(providerSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
            simulator.subscriptionId,
            'call03',
          ]);
        });

        it('should re-fetch metadata if runtime version is changing', async () => {
          const providerSend = vi.spyOn(provider, 'send');

          let counter = 0;
          provider.setRpcRequest('chainHead_v1_call', () => {
            counter += 1;
            return { result: 'started', operationId: `call${counter}` } as MethodResponse;
          });

          const newRuntime: RuntimeVersion = {
            specName: 'mock-spec',
            implName: 'mock-spec-impl',
            authoringVersion: 0,
            specVersion: 2,
            implVersion: 0,
            apis: [
              ['0x37e397fc7c91f5e4', 2],
              ['0xdf6acb689907609b', 4],
            ],
            transactionVersion: 25,
            stateVersion: 0,
          };

          simulator.notify({
            operationId: 'call1',
            event: 'operationCallDone',
            output: u8aToHex($RuntimeVersion.tryEncode(newRuntime)),
          } as OperationCallDone);

          simulator.notify(
            {
              operationId: 'call2',
              event: 'operationCallDone',
              output: prefixedMetadataV15,
            } as OperationCallDone,
            5,
          );

          const _ = await api.at('0x0d');

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0d',
            'Core_version',
            '0x',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call1']);

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0d',
            'Metadata_metadata_at_version',
            '0x0f000000',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call2']);
        });

        it('should define valid props', async () => {
          const apiAt = await api.at('0x0e');

          expect(apiAt.rpcVersion).toEqual('v2');
          expect(apiAt.atBlockHash).toEqual('0x0e');
          expect(apiAt.options).toBeDefined();
          expect(apiAt.runtimeVersion).toBe(simulator.runtime);
          expect(apiAt.registry).toBeDefined();
          expect(apiAt.metadata.version).toEqual('V15');
          expect(apiAt.rpc).toBeDefined();
          expect(apiAt.query).toBeDefined();
          expect(apiAt.events).toBeDefined();
          expect(apiAt.errors).toBeDefined();
          expect(apiAt.consts).toBeDefined();
        });

        it('should execute rpc', async () => {
          const apiAt = await api.at('0x0e');

          await apiAt.rpc.system_chain();
          expect(providerSend).toBeCalledWith('system_chain', []);
        });

        it('should perform query & runtime api', async () => {
          provider.setRpcRequests({
            chainHead_v1_storage: () => ({ result: 'started', operationId: 'storage05' }) as MethodResponse,
            chainHead_v1_call: () => ({ result: 'started', operationId: 'call05' }) as MethodResponse,
          });

          const hash = '0x0e';

          const apiAt = await api.at(hash);
          const key = apiAt.query.system.number.rawKey();

          simulator.notify({
            operationId: 'storage05',
            event: 'operationStorageItems',
            items: [{ key, value: u8aToHex($.u32.encode(42)) }],
          } as OperationStorageItems);

          simulator.notify({
            operationId: 'storage05',
            event: 'operationStorageDone',
          } as OperationStorageDone);

          await expect(apiAt.query.system.number()).resolves.toEqual(42);

          expect(providerSend).toBeCalledWith('chainHead_v1_storage', [
            simulator.subscriptionId,
            hash,
            [{ type: 'value', key }],
            null,
          ]);
          expect(providerSend).toBeCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'storage05']);

          simulator.notify(
            {
              operationId: 'call05',
              event: 'operationCallDone',
              output: u8aToHex($.Array($.u32).tryEncode([14, 15])),
            } as OperationCallDone,
            5,
          );

          await expect(apiAt.call.metadata.metadataVersions()).resolves.toEqual([14, 15]);

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            hash,
            'Metadata_metadata_versions',
            '0x',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call05']);
        });
      });

      describe('runtime versions', () => {
        it('should emit runtimeUpgrade event', async () => {
          const originalRuntime = simulator.runtime;

          const newBlock = simulator.nextNewBlock({ withRuntime: true });
          simulator.notify(newBlock, 100);
          simulator.notify(simulator.nextBestBlock(), 150);

          simulator.notify(
            {
              operationId: 'call01',
              event: 'operationCallDone',
              output: prefixedMetadataV15,
            } as OperationCallDone,
            200,
          );

          assert(newBlock.newRuntime!.type === 'valid');

          await new Promise<void>((resolve, reject) => {
            api.on('runtimeUpgraded', (newRuntime: SubstrateRuntimeVersion) => {
              try {
                // @ts-ignore
                expect(newBlock.newRuntime!.spec).toEqual(newRuntime);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });

          expect(originalRuntime.specVersion + 1).toEqual(newBlock.newRuntime!.spec.specVersion);
          expect(originalRuntime.specVersion + 1).toEqual(api.runtimeVersion.specVersion);
        });

        it('getRuntimeVersion should return the latest version', async () => {
          provider.setRpcRequests({
            chainHead_v1_call: () => ({ result: 'started', operationId: 'call02' }) as MethodResponse,
          });

          const newBlock = simulator.nextNewBlock({ withRuntime: true });
          simulator.notify(newBlock, 100);
          simulator.notify(simulator.nextBestBlock(), 150);

          simulator.notify(
            {
              operationId: 'call02',
              event: 'operationCallDone',
              output: prefixedMetadataV15,
            } as OperationCallDone,
            500,
          );

          const oldVersion = api.runtimeVersion;
          const newVersion = await new Promise<SubstrateRuntimeVersion>((resolve) => {
            setTimeout(async () => {
              resolve(await api.getRuntimeVersion());
            }, 200);
          });

          expect(oldVersion.specVersion + 1).toEqual(newVersion.specVersion);

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            newBlock.blockHash,
            'Metadata_metadata_at_version',
            '0x0f000000',
          ]);
        });
      });
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

        const api = await DedotClient.new({
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

    describe('metadata options', () => {
      it('should use provided metadata from options', async () => {
        const api = await DedotClient.new({
          provider,
          metadata: {
            'RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/1': staticSubstrateV15,
          },
        });

        expect(providerSend).not.toBeCalledWith('chainHead_v1_call', [
          simulator.subscriptionId,
          await api.chainHead.bestHash(),
          'Metadata_metadata_at_version',
          '0x0f000000',
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

    describe('cache enabled', () => {
      let api: DedotClient;
      beforeEach(async () => {
        api = await DedotClient.new({ provider, cacheMetadata: true });
      });

      afterEach(async () => {
        if (api) {
          await api.clearCache();
          await api.disconnect();
        }
      });

      it('should load metadata from cache', async () => {
        const newProvider = new MockProvider();
        const newProviderSend = vi.spyOn(newProvider, 'send');
        const newSimulator = newChainHeadSimulator({ provider });
        newSimulator.notify(newSimulator.initializedEvent);

        const newApi = await DedotClient.new({ provider, cacheMetadata: true });

        expect(newProviderSend).not.toBeCalledWith('chainHead_v1_call', [
          simulator.subscriptionId,
          await api.chainHead.bestHash(),
          'Metadata_metadata_at_version',
          '0x0f000000',
        ]);
        expect(newApi.metadata).toBeDefined();
        expect(newApi.metadata).toEqual(api.metadata);
      });

      describe("refetch metadata if it's outdated", async () => {
        it('should look for metadata options first', async () => {
          const nextMockedRuntime = { ...mockedRuntime, specVersion: mockedRuntime.specVersion + 1 };
          const newProvider = new MockProvider();
          const newProviderSend = vi.spyOn(newProvider, 'send');
          const newSimulator = newChainHeadSimulator({ provider: newProvider, initialRuntime: nextMockedRuntime });
          newSimulator.notify(newSimulator.initializedEvent);

          const newApi = await DedotClient.new({
            provider: newProvider,
            cacheMetadata: true,
            metadata: {
              'RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2': staticSubstrateV15,
            },
          });

          expect(newProviderSend).not.toBeCalledWith('chainHead_v1_call', [
            newSimulator.subscriptionId,
            await newApi.chainHead.bestHash(),
            'Metadata_metadata_at_version',
            '0x0f000000',
          ]);

          expect(newApi.metadata).toBeDefined();
          expect(newApi.currentMetadataKey).toEqual(
            `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2`,
          );
        });

        it('should re-fetch from on-chain', async () => {
          const nextMockedRuntime = { ...mockedRuntime, specVersion: mockedRuntime.specVersion + 1 };
          const newProvider = new MockProvider();
          const newProviderSend = vi.spyOn(newProvider, 'send');
          const newSimulator = newChainHeadSimulator({ provider: newProvider, initialRuntime: nextMockedRuntime });
          newSimulator.notify(newSimulator.initializedEvent);

          newProvider.setRpcRequests({
            chainHead_v1_call: () => ({ result: 'started', operationId: 'callMetadata01' }) as MethodResponse,
          });

          newSimulator.notify({
            operationId: 'callMetadata01',
            event: 'operationCallDone',
            output: prefixedMetadataV15,
          } as OperationCallDone);

          const newApi = await DedotClient.new({ provider: newProvider, cacheMetadata: true });

          expect(newProviderSend).toBeCalledWith('chainHead_v1_call', [
            newSimulator.subscriptionId,
            await newApi.chainHead.bestHash(),
            'Metadata_metadata_at_version',
            '0x0f000000',
          ]);

          expect(newProviderSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
            newSimulator.subscriptionId,
            'callMetadata01',
          ]);

          expect(newApi.metadata).toBeDefined();
          expect(newApi.currentMetadataKey).toEqual(
            `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2`,
          );
        });
      });
    });

    describe('not throwOnUnknownApi', () => {
      let api: DedotClient;
      beforeEach(async () => {
        api = await DedotClient.new({ provider, throwOnUnknownApi: false });
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

      // it('should return undefined if tx not found', async () => {
      //   expect(api.tx.system.notFound).toBeUndefined();
      //   expect(api.tx.notFound.notFound).toBeUndefined();
      // });
    });
  });
});
