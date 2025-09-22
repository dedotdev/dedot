import { BaseSubmittableExtrinsic, ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, ISubmittableResult, RpcVersion } from '@dedot/types';
import { assert, isPvm, isUndefined, toHex, toU8a } from '@dedot/utils';
import { FormatTypes } from '@ethersproject/abi';
import { Contract } from '../../Contract';
import {
  ConstructorTxOptions,
  ContractAddress,
  ExecutionOptions,
  GenericConstructorTxCall,
} from '../../types/index.js';
import {
  CREATE1,
  CREATE2,
  ensureContractPresenceOnRevive,
  ensureParamsLength,
  toEvmAddress,
} from '../../utils/index.js';
import { SolConstructorQueryExecutor } from './SolConstructorQueryExecutor';
import { SolDeployerExecutor } from './abstract/index.js';

export class SolConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends SolDeployerExecutor<ChainApi> {
  doExecute(_: string) {
    const fragment = this.findConstructorFragment();
    assert(fragment, `There are no constructor fragment existed in the ABI`);

    // @ts-ignore
    const callFn: GenericConstructorTxCall<ChainApi, any, 'sol'> = (...params: any[]) => {
      const { inputs } = fragment;

      ensureParamsLength(inputs.length, params.length);

      const txCallOptions = (params[inputs.length] || {}) as ConstructorTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit, salt } = txCallOptions;
      assert(
        isUndefined(salt) || toU8a(salt).byteLength == 32,
        'Invalid salt provided in ConstructorCallOptions: expected a 32-byte value as a hex string or a Uint8Array',
      );

      const bytes = this.registry.interf.encodeDeploy(params.slice(0, inputs.length));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

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
        const { status, dispatchError } = result;

        const onChain = status.type === 'BestChainBlockIncluded' || status.type === 'Finalized';
        assert(onChain, 'The deployment transaction has not yet been included in the best chain block or finalized.');

        assert(
          !dispatchError,
          'The deployment transaction failed to execute. Refer to the dispatch error for more information.',
        );

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
              defaultCaller: signerAddress,
              ...this.options,
            },
          );

          const {
            raw: { gasRequired, storageDeposit },
          } = await executor.doExecute(_)(...params);

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
            await ensureContractPresenceOnRevive(client, address);

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

    callFn.meta = JSON.parse(fragment.format(FormatTypes.json));

    return callFn;
  }
}
