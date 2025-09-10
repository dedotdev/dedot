import type { ISubstrateClient } from '@dedot/api';
import { type SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, assertFalse, isPvm, isUndefined, toHex, toU8a } from '@dedot/utils';
import { ContractInstantiateDispatchError } from '../../errors.js';
import {
  ConstructorCallOptions,
  ContractCode,
  ContractInstantiateResult,
  GenericConstructorCallResult,
  GenericConstructorQueryCall,
} from '../../types/index.js';
import { toReturnFlags } from '../../utils/index.js';
import { SolDeployerExecutor } from './abstract/index.js';

export class SolConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends SolDeployerExecutor<ChainApi> {
  doExecute(_: string) {
    const fragment = this.findConstructorFragment();
    assert(fragment, `There are no constructor fragment existed in the ABI`);

    const callFn: GenericConstructorQueryCall<ChainApi> = async (...params: any[]) => {
      const { inputs } = fragment;

      assertFalse(params.length < inputs.length, `Expected at least ${inputs.length} arguments, got ${params.length}`);
      assertFalse(
        params.length > inputs.length + 1,
        `Expected at most ${inputs.length + 1} arguments, got ${params.length}`,
      );

      const callOptions = (params[inputs.length] || {}) as ConstructorCallOptions;
      const {
        caller = this.options.defaultCaller, // --
        value = 0n,
        gasLimit,
        storageDepositLimit,
        salt,
      } = callOptions;
      assert(caller, 'Expected a valid caller address in ConstructorCallOptions');
      assert(
        isUndefined(salt) || toU8a(salt).byteLength == 32,
        'Invalid salt provided in ConstructorCallOptions: expected a 32-byte value as a hex string or a Uint8Array',
      );

      const bytes = this.interf.encodeDeploy(params.slice(0, inputs.length));
      const isUpload = isPvm(this.code);
      const code = {
        type: isUpload ? 'Upload' : 'Existing',
        value: this.code,
      } as ContractCode;

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const raw: ContractInstantiateResult<ChainApi> = await (async () => {
        const raw = await client.call.reviveApi.instantiate(
          caller, // --
          value,
          gasLimit,
          storageDepositLimit,
          code,
          bytes,
          salt ? toHex(salt) : undefined,
        );

        const result = raw.result;
        if (result.isOk) {
          // @ts-ignore
          result.value.address = result.value.addr;

          // @ts-ignore
          delete result.value.addr;
        }

        return {
          gasConsumed: raw.gasConsumed,
          gasRequired: raw.gasRequired,
          storageDeposit: raw.storageDeposit,
          result,
        } as ContractInstantiateResult<ChainApi>;
      })();

      if (raw.result.isErr) {
        throw new ContractInstantiateDispatchError(raw.result.err, raw);
      }

      // TODO: Check it, sol contract does not return data here.
      const data = undefined;

      // TODO: Check if it has lang error.

      const bits = raw.result.value.result.flags.bits;

      return {
        data,
        raw,
        address: raw.result.value.address,
        flags: toReturnFlags(bits),
        inputData: bytes,
      } as GenericConstructorCallResult;
    };

    callFn.meta = fragment;

    return callFn;
  }
}
