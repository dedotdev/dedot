import { BaseSubmittableExtrinsic, ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, ISubmittableResult, RpcVersion } from '@dedot/types';
import { assert, isPvm, isUndefined, toHex, toU8a } from '@dedot/utils';
import { encodeDeployData } from 'viem/utils';
import { Contract } from '../../Contract.js';
import {
  ConstructorTxOptions,
  ContractAddress,
  ExecutionOptions,
  GenericConstructorTxCall,
} from '../../types/index.js';
import { CREATE1, CREATE2, ensureContractPresence, ensureParamsLength, toEvmAddress } from '../../utils/index.js';
import { SolConstructorQueryExecutor } from './SolConstructorQueryExecutor.js';
import { SolDeployerExecutor } from './abstract/index.js';

export class SolConstructorTxExecutor extends SolDeployerExecutor {
  doExecute(_: string) {
    const abiConstructor = this.registry.findAbiConstructor();

    // @ts-ignore
    const callFn: GenericConstructorTxCall<ChainApi, any, 'sol'> = (...params: any[]) => {
      const { inputs } = abiConstructor;

      ensureParamsLength(inputs.length, params.length);

      const txCallOptions = (params[inputs.length] || {}) as ConstructorTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit, salt } = txCallOptions;
      assert(
        isUndefined(salt) || toU8a(salt).byteLength == 32,
        'Invalid salt provided in ConstructorCallOptions: expected a 32-byte value as a hex string or a Uint8Array',
      );

      const bytes = encodeDeployData({
        abi: this.abi,
        bytecode: '0x',
        args: params.slice(0, inputs.length),
      });

      const client = this.client as unknown as ISubstrateClient;

      const tx = (() => {
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
      })();

      let deployerAddress: string, deployerNonce: number;

      const calculateContractAddress = async (result: ISubmittableResult): Promise<string> => {
        assert(deployerAddress, 'Deployer address Not Found');
        const { status, dispatchError, events } = result;

        const onChain = status.type === 'BestChainBlockIncluded' || status.type === 'Finalized';
        assert(onChain, 'The deployment transaction has not yet been included in the best chain block or finalized.');

        assert(
          !dispatchError,
          'The deployment transaction failed to execute. Refer to the dispatch error for more information.',
        );

        // Try to get address from events first
        try {
          const event = client.events.revive.Instantiated.find(events);

          if (event) {
            // @ts-ignore
            return event.palletEvent.data.contract;
          }
        } catch {}

        // Fallback to calculate the address if event not found
        if (salt) {
          let code;
          if (isPvm(this.code)) {
            code = this.code;
          } else {
            // Pull the raw code in case we're using a code hash here
            code = await client.query.revive.pristineCode(toHex(this.code));
          }

          assert(code, 'Contract code binary not found');

          return CREATE2(
            toEvmAddress(deployerAddress), // --
            code,
            bytes,
            salt,
          );
        } else {
          return CREATE1(
            toEvmAddress(deployerAddress), // --
            deployerNonce,
          );
        }
      };

      (tx as unknown as BaseSubmittableExtrinsic).withHooks({
        beforeSign: async (tx, signerAddress) => {
          // Set data for next hooks
          deployerAddress = signerAddress;

          if (!salt) {
            deployerNonce = await client.call.accountNonceApi.accountNonce(deployerAddress);
          }

          const callParams = { ...tx.call.palletCall.params };
          const hasGasLimit = !!callParams.gasLimit;
          const hasStorageDepositLimit = !!callParams.storageDepositLimit;

          // Check if current tx provide gas limit and storage deposit limit
          // If not, we need to do a dry run to get the actual value
          const needsDryRun = !hasGasLimit || !hasStorageDepositLimit;
          if (!needsDryRun) return;

          const executor = new SolConstructorQueryExecutor(
            this.client, // --
            this.registry,
            this.code,
            {
              ...this.options,
              defaultCaller: signerAddress,
            },
          );

          const {
            raw: { gasRequired, storageDeposit },
          } = await executor.doExecute('new')(...params);

          // Replace the params with gas limit and storage deposit limit
          if (!hasGasLimit) {
            callParams.gasLimit = gasRequired;
          }

          if (!hasStorageDepositLimit) {
            callParams.storageDepositLimit = storageDeposit.value;
          }

          const newCall = { ...tx.call };
          newCall.palletCall.params = callParams;

          tx.call = newCall;
        },
        transformResult: (result) => {
          let cachedAddress: ContractAddress;

          const contractAddress = async () => {
            if (cachedAddress) return cachedAddress;

            cachedAddress = await calculateContractAddress(result);
            return cachedAddress;
          };

          const contract = async (overrideOptions?: ExecutionOptions) => {
            const address = await contractAddress();

            // Check if the contract is existed on chain or not!
            await ensureContractPresence(client, true, address);

            return new Contract(
              client, // --
              this.abi,
              address,
              {
                defaultCaller: deployerAddress,
                ...this.options,
                ...overrideOptions,
              },
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

    callFn.meta = abiConstructor;

    return callFn;
  }
}
