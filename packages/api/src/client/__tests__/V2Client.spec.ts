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

describe('V2Client', () => {
  it('should throws error for invalid endpoint', async () => {
    await expect(async () => {
      await V2Client.new(new WsProvider('invalid_endpoint'));
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
      setTimeout(() => {
        simulator.notify(simulator.nextNewBlock()); // 0xf
        simulator.notify(simulator.nextNewBlock()); // 0x10
        simulator.notify(simulator.nextBestBlock()); // 0xf
        simulator.notify(simulator.nextFinalized()); // 0xf
      }, 0);

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
        5,
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

    describe('cache disabled', () => {
      let api: V2Client;
      beforeEach(async () => {
        api = await V2Client.new({ provider });
      });

      afterEach(async () => {
        api && api.status !== 'disconnected' && (await api.disconnect());
      });

      // TODO fallback to chainHead_storage of chainSpec does not support

      it('should create new api instance', async () => {
        expect(providerSend).toBeCalledWith('chainHead_v1_call', [
          simulator.subscriptionId,
          '0x0e',
          'Metadata_metadata_versions',
          '0x',
        ]);

        expect(providerSend).toBeCalledWith('chainHead_v1_call', [
          simulator.subscriptionId,
          '0x0f',
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

        describe('signer should works', () => {
          const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
          let signer: InjectedSigner;

          beforeEach(() => {
            signer = {
              signPayload: vi.fn().mockImplementation(fakeSigner.signPayload!),
            };

            provider.setRpcRequests({
              chainHead_v1_storage: () => ({ result: 'started', operationId: 'storage01' }) as MethodResponse,
            });

            simulator.notify(
              {
                operationId: 'storage01',
                event: 'operationStorageDone',
              } as OperationStorageDone,
              15,
            );
          });

          it('should call custom signer via tx', async () => {
            await api.tx.system.remarkWithEvent('Hello World').sign(ALICE, { signer });
            expect(signer.signPayload).toBeCalled();
          });

          it('should call signer via ApiOptions', async () => {
            api.setSigner(signer);

            await api.tx.system.remarkWithEvent('Hello World').sign(ALICE);
            expect(signer.signPayload).toBeCalled();
          });
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

            // via initialization - f
            simulator.notify(simulator.nextNewBlock({ fork: true })); // f-1
            simulator.notify(simulator.nextNewBlock()); // 0x10 -> f
            simulator.notify(simulator.nextNewBlock({ fork: true, fromWhichParentFork: 1 })); // 0x10-1 -> f-1
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
            expect(finalizedBlock).toEqual({ blockHash: '0x11-1', blockNumber: 17, txIndex: 2 });
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
            '0x0c',
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
              output: '0x0c100000000f0000000e000000',
            } as OperationCallDone,
            5,
          );

          simulator.notify(
            {
              operationId: 'call3',
              event: 'operationCallDone',
              output: prefixedMetadataV15,
            } as OperationCallDone,
            20,
          );

          const _ = await api.at('0x0d');

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0c',
            'Core_version',
            '0x',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call1']);

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0c',
            'Metadata_metadata_versions',
            '0x',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            '0x0c',
            'Metadata_metadata_at_version',
            '0x10000000',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_stopOperation', [simulator.subscriptionId, 'call2']);
        });

        it('should define valid props', async () => {
          const apiAt = await api.at('0x0f');

          expect(apiAt.rpcVersion).toEqual('v2');
          expect(apiAt.atBlockHash).toEqual('0x0f');
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
          const apiAt = await api.at('0x0f');

          await apiAt.rpc.system_chain();
          expect(providerSend).toBeCalledWith('system_chain', []);
        });

        it('should maintain proxy chain independence for events', async () => {
          const apiAt = await api.at('0x0f');

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
          const apiAt = await api.at('0x0f');

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

        it('should perform query & runtime api', async () => {
          provider.setRpcRequests({
            chainHead_v1_storage: () => ({ result: 'started', operationId: 'storage05' }) as MethodResponse,
            chainHead_v1_call: () => ({ result: 'started', operationId: 'call05' }) as MethodResponse,
          });

          const hash = '0x0f';

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
        });

        it('should query multiple storage items at a specific block', async () => {
          // Use the best block hash which should be accessible
          const bestBlock = await api.chainHead.bestBlock();
          const hash = bestBlock.hash;
          const apiAt = await api.at(hash);

          // Mock storage query functions
          const mockQueryFn1 = {
            meta: { pallet: 'system', name: 'number' },
            rawKey: vi.fn().mockReturnValue('0x01'),
          };
          const mockQueryFn2 = {
            meta: { pallet: 'system', name: 'events' },
            rawKey: vi.fn().mockReturnValue('0x02'),
          };
          const mockQueryFn3 = {
            meta: { pallet: 'balances', name: 'totalIssuance' },
            rawKey: vi.fn().mockReturnValue('0x03'),
          };

          // Set up the spy before making the call
          const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');

          // Mock chainHead.storage response
          const mockResults = [
            { key: '0x01', value: '0xvalue1' },
            { key: '0x02', value: '0xvalue2' },
            { key: '0x03', value: '0xvalue3' },
          ];
          chainHeadStorageSpy.mockResolvedValue(mockResults);

          // Mock QueryableStorage
          const mockDecodedValue1 = 42;
          const mockDecodedValue2 = ['event1', 'event2'];
          const mockDecodedValue3 = BigInt(1000000);

          // Use vi.spyOn to mock the QueryableStorage constructor and its decodeValue method
          const originalQueryableStorage = await import('../../storage/QueryableStorage.js').then(
            (m) => m.QueryableStorage,
          );

          vi.spyOn(originalQueryableStorage.prototype, 'decodeValue')
            .mockImplementationOnce(() => mockDecodedValue1)
            .mockImplementationOnce(() => mockDecodedValue2)
            .mockImplementationOnce(() => mockDecodedValue3);

          // Call queryMulti on the at() instance
          const result = await apiAt.queryMulti([
            { fn: mockQueryFn1 as any, args: [] },
            { fn: mockQueryFn2 as any, args: [] },
            { fn: mockQueryFn3 as any, args: [] },
          ]);

          // Verify rawKey was called
          expect(mockQueryFn1.rawKey).toHaveBeenCalled();
          expect(mockQueryFn2.rawKey).toHaveBeenCalled();
          expect(mockQueryFn3.rawKey).toHaveBeenCalled();

          // Verify chainHead.storage was called with the correct parameters and block hash
          expect(api.chainHead.storage).toHaveBeenCalledWith(
            [
              { type: 'value', key: '0x01' },
              { type: 'value', key: '0x02' },
              { type: 'value', key: '0x03' },
            ],
            undefined,
            hash,
          );

          // Verify the result contains the decoded values
          expect(result).toEqual([mockDecodedValue1, mockDecodedValue2, mockDecodedValue3]);
        });

        it('should handle empty query array at a specific block', async () => {
          const bestBlock = await api.chainHead.bestBlock();
          const hash = bestBlock.hash;
          const apiAt = await api.at(hash);

          const result = await apiAt.queryMulti([]);
          expect(result).toEqual([]);
        });

        it('should handle errors from storage service at a specific block', async () => {
          const bestBlock = await api.chainHead.bestBlock();
          const hash = bestBlock.hash;
          const apiAt = await api.at(hash);

          // Mock storage query function
          const mockQueryFn = {
            meta: { pallet: 'system', name: 'number' },
            rawKey: vi.fn().mockReturnValue('0x01'),
          };

          // Set up the spy before making the call
          const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');

          // Mock chainHead.storage to throw an error
          const mockError = new Error('Storage query failed at block');
          chainHeadStorageSpy.mockRejectedValue(mockError);

          // Call queryMulti and expect it to reject with the error
          await expect(apiAt.queryMulti([{ fn: mockQueryFn as any, args: [] }])).rejects.toThrow(mockError);
        });

        it('should use cached api instance for queryMulti', async () => {
          const bestBlock = await api.chainHead.bestBlock();
          const hash = bestBlock.hash;

          // First call to at()
          const apiAt1 = await api.at(hash);

          // Second call to at() with same hash
          const apiAt2 = await api.at(hash);

          // Should be the same instance (cached)
          expect(apiAt1).toBe(apiAt2);

          // Mock storage query functions
          const mockQueryFn = {
            meta: { pallet: 'system', name: 'number' },
            rawKey: vi.fn().mockReturnValue('0x01'),
          };

          // Set up the spy
          const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');

          // Mock chainHead.storage response
          chainHeadStorageSpy.mockResolvedValue([{ key: '0x01', value: '0xvalue1' }]);

          // Mock QueryableStorage
          const originalQueryableStorage = await import('../../storage/QueryableStorage.js').then(
            (m) => m.QueryableStorage,
          );

          vi.spyOn(originalQueryableStorage.prototype, 'decodeValue').mockImplementationOnce(() => 42);

          // Call queryMulti on the cached instance
          const result = await apiAt2.queryMulti([{ fn: mockQueryFn as any, args: [] }]);

          expect(result).toEqual([42]);
          expect(api.chainHead.storage).toHaveBeenCalledWith([{ type: 'value', key: '0x01' }], undefined, hash);
        });

        it('should query multiple storage items with mixed types at a specific block', async () => {
          const bestBlock = await api.chainHead.bestBlock();
          const hash = bestBlock.hash;
          const apiAt = await api.at(hash);

          // Mock storage query functions with different types
          const mockPlainQuery = {
            meta: { pallet: 'system', name: 'number' },
            rawKey: vi.fn().mockReturnValue('0x01'),
          };
          const mockMapQuery = {
            meta: { pallet: 'system', name: 'account' },
            rawKey: vi.fn().mockReturnValue('0x02'),
          };
          const mockDoubleMapQuery = {
            meta: { pallet: 'assets', name: 'account' },
            rawKey: vi.fn().mockReturnValue('0x03'),
          };

          // Set up the spy
          const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');

          // Mock chainHead.storage response with mixed values (some null)
          const mockResults = [
            { key: '0x01', value: '0xvalue1' },
            { key: '0x02', value: null }, // Storage item doesn't exist
            { key: '0x03', value: '0xvalue3' },
          ];
          chainHeadStorageSpy.mockResolvedValue(mockResults as any);

          // Mock QueryableStorage
          const originalQueryableStorage = await import('../../storage/QueryableStorage.js').then(
            (m) => m.QueryableStorage,
          );

          vi.spyOn(originalQueryableStorage.prototype, 'decodeValue').mockImplementation((raw) => {
            if (raw === '0xvalue1') return 100;
            if (raw === null || raw === undefined) return undefined; // Handle null/undefined storage
            if (raw === '0xvalue3') return { balance: BigInt(5000) };
            return undefined;
          });

          // Call queryMulti with mixed query types
          const result = await apiAt.queryMulti([
            { fn: mockPlainQuery as any, args: [] },
            { fn: mockMapQuery as any, args: ['0xalice'] },
            { fn: mockDoubleMapQuery as any, args: [1, '0xbob'] },
          ]);

          // Verify rawKey was called with proper arguments
          expect(mockPlainQuery.rawKey).toHaveBeenCalledWith();
          expect(mockMapQuery.rawKey).toHaveBeenCalledWith('0xalice');
          expect(mockDoubleMapQuery.rawKey).toHaveBeenCalledWith(1, '0xbob');

          // Verify the result handles null values properly (undefined is returned for non-existent storage)
          expect(result).toEqual([100, undefined, { balance: BigInt(5000) }]);
        });
      });

      describe('runtime versions', () => {
        it('should emit runtimeUpgrade event', async () => {
          const originalRuntime = simulator.runtime;

          simulator.notify(simulator.nextBestBlock());

          const newBlock = simulator.nextNewBlock({ withRuntime: true });
          simulator.notify(newBlock, 100);
          simulator.notify(simulator.nextBestBlock(), 150);

          simulator.notify(
            {
              operationId: 'call03',
              event: 'operationCallDone',
              output: '0x0c100000000f0000000e000000',
            } as OperationCallDone,
            50,
          );

          simulator.notify(
            {
              operationId: 'call04',
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
          let counter = 1;
          provider.setRpcRequests({
            chainHead_v1_call: () => {
              counter += 1;
              return { result: 'started', operationId: `call${counter}` } as MethodResponse;
            },
          });

          simulator.notify(simulator.nextBestBlock());

          const newBlock = simulator.nextNewBlock({ withRuntime: true });
          simulator.notify(newBlock, 100);
          simulator.notify(simulator.nextBestBlock(), 150);

          simulator.notify(
            {
              operationId: 'call2',
              event: 'operationCallDone',
              output: '0x0c100000000f0000000e000000',
            } as OperationCallDone,
            350,
          );

          simulator.notify(
            {
              operationId: 'call3',
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
            'Metadata_metadata_versions',
            '0x',
          ]);

          expect(providerSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            newBlock.blockHash,
            'Metadata_metadata_at_version',
            '0x10000000',
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

    describe('queryMulti', () => {
      let api: V2Client;
      beforeEach(async () => {
        api = await V2Client.new({ provider });
      });

      afterEach(async () => {
        api && api.status !== 'disconnected' && (await api.disconnect());
      });

      // it('should query multiple storage items', async () => {
      //   // Mock storage query functions
      //   const mockQueryFn1 = {
      //     meta: { pallet: 'system', name: 'number' },
      //     rawKey: vi.fn().mockReturnValue('0x01'),
      //   };
      //   const mockQueryFn2 = {
      //     meta: { pallet: 'system', name: 'events' },
      //     rawKey: vi.fn().mockReturnValue('0x02'),
      //   };
      //
      //   // Set up the spy before making the call
      //   const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');
      //
      //   // Mock chainHead.storage response
      //   const mockResults = [
      //     { key: '0x01', value: '0xvalue1' },
      //     { key: '0x02', value: '0xvalue2' },
      //   ];
      //   chainHeadStorageSpy.mockResolvedValue(mockResults);
      //
      //   // Mock QueryableStorage
      //   const mockDecodedValue1 = 42;
      //   const mockDecodedValue2 = ['event1', 'event2'];
      //
      //   // Use vi.spyOn to mock the QueryableStorage constructor and its decodeValue method
      //   const originalQueryableStorage = // prettier-end-here
      //     await import('../../storage/QueryableStorage.js').then((m) => m.QueryableStorage);
      //
      //   vi.spyOn(originalQueryableStorage.prototype, 'decodeValue')
      //     .mockImplementationOnce(() => mockDecodedValue1)
      //     .mockImplementationOnce(() => mockDecodedValue2);
      //
      //   // Call queryMulti
      //   const result = await api.queryMulti([
      //     { fn: mockQueryFn1 as any, args: [] },
      //     { fn: mockQueryFn2 as any, args: [] },
      //   ]);
      //
      //   // Verify rawKey was called
      //   expect(mockQueryFn1.rawKey).toHaveBeenCalled();
      //   expect(mockQueryFn2.rawKey).toHaveBeenCalled();
      //
      //   // Verify chainHead.storage was called with the correct parameters
      //   expect(api.chainHead.storage).toHaveBeenCalledWith([
      //     { type: 'value', key: '0x01' },
      //     { type: 'value', key: '0x02' },
      //   ]);
      //
      //   // Verify the result contains the decoded values
      //   expect(result).toEqual([mockDecodedValue1, mockDecodedValue2]);
      // });

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

        // Set up the spies before making the call
        const chainHeadBestBlockSpy = vi.spyOn(api.chainHead, 'bestBlock');
        const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');
        const apiOnSpy = vi.spyOn(api, 'on');

        // Mock chainHead.bestBlock and chainHead.storage
        const mockBestBlock = { hash: '0xbesthash', number: 100, parent: '0xparenthash' } as PinnedBlock;
        chainHeadBestBlockSpy.mockResolvedValue(mockBestBlock);

        const mockInitialResults = [
          { key: '0x01', value: '0xvalue1' },
          { key: '0x02', value: '0xvalue2' },
        ];
        chainHeadStorageSpy.mockResolvedValue(mockInitialResults);

        // Mock api.on
        let onCallback: Function | undefined;
        const mockUnsub = vi.fn();
        apiOnSpy.mockImplementation((event: string, cb: Function) => {
          onCallback = cb;
          return mockUnsub;
        });

        // Mock QueryableStorage
        const mockDecodedValue1 = 42;
        const mockDecodedValue2 = ['event1', 'event2'];

        const originalQueryableStorage = // prettier-end-here
          await import('../../storage/QueryableStorage.js').then((m) => m.QueryableStorage);

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

        // Verify chainHead.bestBlock and api.on were called
        expect(api.chainHead.bestBlock).toHaveBeenCalled();
        expect(api.on).toHaveBeenCalledWith('bestBlock', expect.any(Function));

        // Verify chainHead.storage was called with the correct parameters
        expect(api.chainHead.storage).toHaveBeenCalledWith(
          [
            { type: 'value', key: '0x01' },
            { type: 'value', key: '0x02' },
          ],
          undefined,
          '0xbesthash',
        );

        // Verify the callback was called with the initial values
        expect(callback).toHaveBeenCalledWith([mockDecodedValue1, mockDecodedValue2]);

        // Reset the callback mock
        callback.mockReset();

        // Setup mock response for subsequent storage call
        const mockNewResults = [
          { key: '0x01', value: '0xnewvalue1' },
          { key: '0x02', value: '0xnewvalue2' },
        ];
        chainHeadStorageSpy.mockResolvedValue(mockNewResults);

        // Simulate a new block event
        const mockNewBlock = { hash: '0xnewhash', number: 123, parent: '0xparenthash' } as PinnedBlock;
        if (onCallback) {
          await onCallback(mockNewBlock);
        }

        // Verify chainHead.storage was called with the new block hash
        expect(api.chainHead.storage).toHaveBeenCalledWith(
          [
            { type: 'value', key: '0x01' },
            { type: 'value', key: '0x02' },
          ],
          undefined,
          '0xnewhash',
        );

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

        // Set up the spy before making the call
        const chainHeadStorageSpy = vi.spyOn(api.chainHead, 'storage');

        // Mock chainHead.storage to throw an error
        const mockError = new Error('Storage query failed');
        chainHeadStorageSpy.mockRejectedValue(mockError);

        // Call queryMulti and expect it to reject with the error
        await expect(api.queryMulti([{ fn: mockQueryFn as any, args: [] }])).rejects.toThrow(mockError);
      });
    });

    describe('cache enabled', () => {
      let api: V2Client;
      beforeEach(async () => {
        api = await V2Client.new({ provider, cacheMetadata: true });
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
        newSimulator.notify(newSimulator.nextNewBlock());

        const newApi = await V2Client.new({ provider, cacheMetadata: true });

        expect(newProviderSend).not.toBeCalledWith('chainHead_v1_call', [
          simulator.subscriptionId,
          await api.chainHead.bestHash(),
          'Metadata_metadata_at_version',
          '0x10000000',
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
          newSimulator.notify(newSimulator.nextNewBlock());

          const newApi = await V2Client.new({
            provider: newProvider,
            cacheMetadata: true,
            metadata: {
              'RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2': rawMetadataV15,
            },
          });

          expect(newProviderSend).not.toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            await api.chainHead.bestHash(),
            'Metadata_metadata_versions',
            '0x',
          ]);

          expect(newProviderSend).not.toBeCalledWith('chainHead_v1_call', [
            newSimulator.subscriptionId,
            await newApi.chainHead.bestHash(),
            'Metadata_metadata_at_version',
            '0x10000000',
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

          let counter = 0;
          newProvider.setRpcRequests({
            chainHead_v1_call: () => {
              counter += 1;
              return { result: 'started', operationId: `callMetadata0${counter}` } as MethodResponse;
            },
          });

          newSimulator.notify(
            {
              operationId: 'callMetadata01',
              event: 'operationCallDone',
              output: '0x0c100000000f0000000e000000',
            } as OperationCallDone,
            5,
          );

          newSimulator.notify(
            {
              operationId: 'callMetadata02',
              event: 'operationCallDone',
              output: prefixedMetadataV15,
            } as OperationCallDone,
            20,
          );

          const newApi = await V2Client.new({ provider: newProvider, cacheMetadata: true });

          expect(newProviderSend).toBeCalledWith('chainHead_v1_call', [
            simulator.subscriptionId,
            await newApi.chainHead.bestHash(),
            'Metadata_metadata_versions',
            '0x',
          ]);

          expect(newProviderSend).toBeCalledWith('chainHead_v1_call', [
            newSimulator.subscriptionId,
            await newApi.chainHead.bestHash(),
            'Metadata_metadata_at_version',
            '0x10000000',
          ]);

          expect(newProviderSend).toBeCalledWith('chainHead_v1_stopOperation', [
            newSimulator.subscriptionId,
            'callMetadata01',
          ]);

          expect(newProviderSend).toHaveBeenLastCalledWith('chainHead_v1_stopOperation', [
            newSimulator.subscriptionId,
            'callMetadata02',
          ]);

          expect(newApi.metadata).toBeDefined();
          expect(newApi.currentMetadataKey).toEqual(
            `RAW_META/0x0000000000000000000000000000000000000000000000000000000000000000/2`,
          );
        });
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

      // it('should return undefined if tx not found', async () => {
      //   expect(api.tx.system.notFound).toBeUndefined();
      //   expect(api.tx.notFound.notFound).toBeUndefined();
      // });
    });
  });

  describe('event forwarding', () => {
    let api: V2Client;
    let simulator: ReturnType<typeof newChainHeadSimulator>;
    let provider: MockProvider;

    beforeEach(async () => {
      provider = new MockProvider();
      simulator = newChainHeadSimulator({ provider });
      simulator.notify(simulator.initializedEvent);
      simulator.notify(simulator.nextNewBlock());

      let counter = 0;
      provider.setRpcRequests({
        chainSpec_v1_chainName: () => 'MockedChain',
        chainHead_v1_call: () => {
          counter += 1;
          return { result: 'started', operationId: `call0${counter}` } as MethodResponse;
        },
      });

      simulator.notify(
        {
          operationId: 'call01',
          event: 'operationCallDone',
          output: '0x0c100000000f0000000e000000',
        } as OperationCallDone,
        5,
      );

      simulator.notify(
        {
          operationId: 'call02',
          event: 'operationCallDone',
          output: prefixedMetadataV15,
        } as OperationCallDone,
        10,
      );

      api = await V2Client.new({ provider });
    });

    afterEach(async () => {
      api && api.status !== 'disconnected' && (await api.disconnect());
    });

    it('should forward newBlock events from ChainHead', async () => {
      const newBlockSpy = vi.fn();
      api.on('newBlock', newBlockSpy);

      const newBlock = simulator.nextNewBlock();
      simulator.notify(newBlock);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(newBlockSpy).toHaveBeenCalledTimes(1);
          const pinnedBlock = newBlockSpy.mock.calls[0][0] as PinnedBlock;
          expect(pinnedBlock.hash).toEqual(newBlock.blockHash);
          resolve();
        }, 10);
      });
    });

    it('should forward bestBlock events from ChainHead', async () => {
      const bestBlockSpy = vi.fn();
      api.on('bestBlock', bestBlockSpy);

      // Create a new block first
      simulator.notify(simulator.nextNewBlock());

      // Then make it the best block
      const bestBlock = simulator.nextBestBlock();
      simulator.notify(bestBlock);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(bestBlockSpy).toHaveBeenCalledTimes(1);
          const pinnedBlock = bestBlockSpy.mock.calls[0][0] as PinnedBlock;
          expect(pinnedBlock.hash).toEqual(bestBlock.bestBlockHash);
          resolve();
        }, 10);
      });
    });

    it('should forward finalizedBlock events from ChainHead', async () => {
      const finalizedBlockSpy = vi.fn();
      api.on('finalizedBlock', finalizedBlockSpy);

      // Create a new block first
      const newBlock = simulator.nextNewBlock();
      simulator.notify(newBlock);

      // Then make it the best block
      simulator.notify(simulator.nextBestBlock());

      // Then finalize it
      const finalized = simulator.nextFinalized();
      simulator.notify(finalized);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(finalizedBlockSpy).toHaveBeenCalledTimes(1);
          const pinnedBlock = finalizedBlockSpy.mock.calls[0][0] as PinnedBlock;
          expect(pinnedBlock.hash).toEqual(finalized.finalizedBlockHashes[0]);
          resolve();
        }, 10);
      });
    });

    it('should forward bestChainChanged events from ChainHead', async () => {
      const bestChainChangedSpy = vi.fn();
      api.on('bestChainChanged', bestChainChangedSpy);

      // Create a mock PinnedBlock directly
      const mockPinnedBlock: PinnedBlock = {
        hash: '0xmockblockhash',
        number: 123,
        parent: '0xmockparenthash',
      };

      // Directly emit the bestChainChanged event with our mock block
      api.chainHead.emit('bestChainChanged', mockPinnedBlock);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(bestChainChangedSpy).toHaveBeenCalledTimes(1);
          const emittedBlock = bestChainChangedSpy.mock.calls[0][0] as PinnedBlock;
          expect(emittedBlock).toBe(mockPinnedBlock);
          expect(emittedBlock.hash).toEqual('0xmockblockhash');
          resolve();
        }, 100); // Increased timeout to ensure event propagation
      });
    });

    it('should forward multiple events in sequence', async () => {
      const events: string[] = [];

      api.on('newBlock', () => events.push('newBlock'));
      api.on('bestBlock', () => events.push('bestBlock'));
      api.on('finalizedBlock', () => events.push('finalizedBlock'));

      // Create a new block
      simulator.notify(simulator.nextNewBlock());

      // Make it the best block
      simulator.notify(simulator.nextBestBlock());

      // Finalize it
      simulator.notify(simulator.nextFinalized());

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(events).toEqual(['newBlock', 'bestBlock', 'finalizedBlock']);
          resolve();
        }, 10);
      });
    });
  });

  describe('clearCache', () => {
    let api: V2Client;
    let provider: MockProvider;
    let simulator: ReturnType<typeof newChainHeadSimulator>;

    beforeEach(async () => {
      provider = new MockProvider();
      simulator = newChainHeadSimulator({ provider });
      simulator.notify(simulator.initializedEvent);
      simulator.notify(simulator.nextNewBlock());

      let counter = 0;
      provider.setRpcRequests({
        chainSpec_v1_chainName: () => 'MockedChain',
        chainHead_v1_call: () => {
          counter += 1;
          return { result: 'started', operationId: `call0${counter}` } as MethodResponse;
        },
      });

      simulator.notify(
        {
          operationId: 'call01',
          event: 'operationCallDone',
          output: '0x0c100000000f0000000e000000',
        } as OperationCallDone,
        5,
      );

      simulator.notify(
        {
          operationId: 'call02',
          event: 'operationCallDone',
          output: prefixedMetadataV15,
        } as OperationCallDone,
        10,
      );

      api = await V2Client.new({ provider });
    });

    afterEach(async () => {
      // Restore mocks first to avoid issues with disconnect
      vi.restoreAllMocks();

      if (api && api.status !== 'disconnected') {
        try {
          await api.disconnect();
        } catch (error) {
          // Ignore disconnect errors in tests, they're expected in some cases
          console.log('Ignoring expected disconnect error in test cleanup:', error);
        }
      }
    });

    it('should call parent clearCache and chainHead clearCache when keepMetadataCache=false (default)', async () => {
      // Spy on parent method and chainHead clearCache
      const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
      const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

      // Call clearCache with default parameter (false)
      await api.clearCache();

      // Verify parent method was called with false
      expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);
      expect(parentClearCacheSpy).toHaveBeenCalledWith(false);

      // Verify chainHead clearCache was called
      expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
    });

    it('should call parent clearCache and chainHead clearCache when keepMetadataCache=false explicitly', async () => {
      // Spy on parent method and chainHead clearCache
      const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
      const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

      // Call clearCache with explicit false parameter
      await api.clearCache(false);

      // Verify parent method was called with false
      expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);
      expect(parentClearCacheSpy).toHaveBeenCalledWith(false);

      // Verify chainHead clearCache was called
      expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
    });

    it('should call parent clearCache and chainHead clearCache when keepMetadataCache=true', async () => {
      // Spy on parent method and chainHead clearCache
      const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
      const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

      // Call clearCache with keepMetadataCache=true
      await api.clearCache(true);

      // Verify parent method was called with true
      expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);
      expect(parentClearCacheSpy).toHaveBeenCalledWith(true);

      // Verify chainHead clearCache was still called
      expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when chainHead is undefined', async () => {
      // Spy on parent method first before disconnecting
      const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');

      // Disconnect first to avoid cleanup issues
      await api.disconnect();

      // Set chainHead to undefined after disconnection
      (api as any)._chainHead = undefined;

      // Call clearCache - should not throw
      await expect(api.clearCache()).resolves.toBeUndefined();
      await expect(api.clearCache(true)).resolves.toBeUndefined();

      // Verify parent method was called both times
      expect(parentClearCacheSpy).toHaveBeenCalledTimes(2);
      expect(parentClearCacheSpy).toHaveBeenNthCalledWith(1, false);
      expect(parentClearCacheSpy).toHaveBeenNthCalledWith(2, true);
    });

    it('should propagate parent clearCache errors', async () => {
      // Make parent clearCache throw an error
      const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');
      parentClearCacheSpy.mockRejectedValue(new Error('Parent cache clear failed'));

      // Spy on chainHead clearCache
      const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');

      // Call clearCache - should propagate the error
      await expect(api.clearCache()).rejects.toThrow('Parent cache clear failed');

      // Verify parent method was called
      expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);

      // Verify chainHead clearCache was not called due to the error
      expect(chainHeadClearCacheSpy).not.toHaveBeenCalled();
    });

    it('should propagate chainHead clearCache errors after clearing parent cache', async () => {
      // Spy on parent method
      const parentClearCacheSpy = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(api)), 'clearCache');

      // Make chainHead clearCache throw an error
      const chainHeadClearCacheSpy = vi.spyOn(api.chainHead, 'clearCache');
      chainHeadClearCacheSpy.mockImplementation(() => {
        throw new Error('ChainHead cache clear failed');
      });

      // Call clearCache - the error from chainHead should propagate
      await expect(api.clearCache()).rejects.toThrow('ChainHead cache clear failed');

      // Verify parent method was called first
      expect(parentClearCacheSpy).toHaveBeenCalledTimes(1);

      // Verify chainHead clearCache was called and failed
      expect(chainHeadClearCacheSpy).toHaveBeenCalledTimes(1);
    });
  });
});
