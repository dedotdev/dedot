import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, isPvm, isUndefined, toHex, toU8a } from '@dedot/utils';
import { ConstructorTxOptions, GenericConstructorTxCall } from '../../types/index.js';
import { SolDeployerExecutor } from '../abstract/sol/index.js';

export class SolConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends SolDeployerExecutor<ChainApi> {
  doExecute(_: string) {
    const fragment = this.findConstructorFragment();
    assert(fragment, `There are no constructor fragment existed in the ABI`);

    const callFn: GenericConstructorTxCall<ChainApi> = (...params: any[]) => {
      const { inputs } = fragment;
      assert(params.length === inputs.length + 1, `Expected ${inputs.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[inputs.length] as ConstructorTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit, salt } = txCallOptions;
      assert(gasLimit, 'Expected a gas limit in ConstructorTxOptions');
      assert(
        isUndefined(salt) || toU8a(salt).byteLength == 32,
        'Invalid salt provided in ConstructorCallOptions: expected a 32-byte value as a hex string or a Uint8Array',
      );
      assert(!isUndefined(storageDepositLimit), 'Expected a storage deposit limit in ConstructorTxOptions');

      const bytes = this.interf.encodeDeploy(params.slice(0, inputs.length));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      if (isPvm(this.code)) {
        return client.tx.revive.instantiateWithCode(
          value,
          gasLimit,
          storageDepositLimit,
          this.code,
          bytes,
          salt ? toHex(salt) : undefined,
        );
      } else {
        return client.tx.revive.instantiate(
          value,
          gasLimit,
          storageDepositLimit,
          toHex(this.code),
          bytes,
          salt ? toHex(salt) : undefined,
        );
      }
    };

    callFn.meta = fragment;

    return callFn;
  }
}
