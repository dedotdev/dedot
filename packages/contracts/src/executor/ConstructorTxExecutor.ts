import { BaseSubmittableExtrinsic, ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, concatU8a, hexToU8a, isPvm, isUndefined, isWasm, toHex, toU8a, u8aToHex } from '@dedot/utils';
import { Contract } from '../Contract.js';
import { ConstructorTxOptions, GenericConstructorTxCall } from '../types/index.js';
import { CREATE1, CREATE2, toEvmAddress } from '../utils/index.js';
import { ConstructorQueryExecutor } from './ConstructorQueryExecutor';
import { DeployerExecutor } from './abstract/index.js';

export class ConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends DeployerExecutor<ChainApi> {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    // @ts-ignore
    const callFn: GenericConstructorTxCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[args.length] as ConstructorTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit, salt } = txCallOptions;

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const tx = (() => {
        if (this.registry.isRevive()) {
          assert(
            isUndefined(salt) || toU8a(salt).byteLength == 32,
            'Invalid salt provided in ConstructorCallOptions: expected a 32-byte value as a hex string or a Uint8Array',
          );

          if (isPvm(this.code)) {
            return client.tx.revive.instantiateWithCode(
              value,
              gasLimit!,
              storageDepositLimit!,
              this.code,
              bytes,
              salt ? toHex(salt) : undefined,
            );
          } else {
            return client.tx.revive.instantiate(
              value,
              gasLimit!,
              storageDepositLimit!,
              toHex(this.code),
              bytes,
              salt ? toHex(salt) : undefined,
            );
          }
        } else {
          if (isWasm(this.code)) {
            return client.tx.contracts.instantiateWithCode(
              value,
              gasLimit!,
              storageDepositLimit,
              this.code,
              bytes,
              salt || '0x',
            );
          } else {
            return client.tx.contracts.instantiate(
              value,
              gasLimit!,
              storageDepositLimit,
              toHex(this.code),
              bytes,
              salt || '0x',
            );
          }
        }
      })();

      let deployerAddress: string, deployerNonce: number;

      (tx as unknown as BaseSubmittableExtrinsic).withHooks({
        beforeSign: async (tx, signerAddress) => {
          deployerAddress = signerAddress;

          if (!salt) {
            deployerNonce = await client.call.accountNonceApi.accountNonce(deployerAddress);
          }

          const callParams = { ...tx.call.palletCall.params };

          // TODO check if we should call dry-run

          const executor = new ConstructorQueryExecutor(this.client, this.registry, this.code, this.options);
          const { raw } = await executor.doExecute(constructor)(...params.slice(0, -1), { salt });

          const { gasRequired, storageDeposit } = raw;
          if (!callParams.gasLimit) {
            callParams.gasLimit = gasRequired;
          }

          if (this.registry.isRevive() && !callParams.storageDepositLimit) {
            callParams.storageDepositLimit = storageDeposit.value;
          }

          const newCall = { ...tx.call };
          newCall.palletCall.params = callParams;

          tx.call = newCall;
        },
        transformResult: (result) => {
          const contractAddress = async () => {
            if (this.registry.isRevive()) {
              if (salt) {
                return CREATE2(
                  toEvmAddress(deployerAddress), // --
                  this.code,
                  bytes,
                  salt,
                );
              } else {
                return CREATE1(
                  toEvmAddress(deployerAddress), // --
                  deployerNonce,
                );
              }
            } else {
              const event = client.events.contracts.Instantiated.find(result.events);
              assert(event, 'Contracts.Instantiated event not found');

              return event.palletEvent.data.contract.address();
            }
          };

          const contract = async () => {
            const address = await contractAddress();

            return new Contract(
              client, // --
              this.metadata,
              address,
              this.options,
            );
          };

          Object.assign(result, {
            contractAddress,
            contract,
          });

          return result as any;
        },
      });

      return tx;
    };

    callFn.meta = meta;

    return callFn;
  }
}
