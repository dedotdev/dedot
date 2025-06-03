import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import {
  assert,
  assertFalse,
  concatU8a,
  hexToU8a,
  isHex,
  isPvm,
  isU8a,
  isUndefined,
  isWasm,
  toHex,
  u8aToHex,
} from '@dedot/utils';
import { ConstructorTxOptions, GenericConstructorTxCall } from '../types/index.js';
import { DeployerExecutor } from './abstract/index.js';

export class ConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends DeployerExecutor<ChainApi> {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorTxCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[args.length] as ConstructorTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit, salt } = txCallOptions;
      assert(gasLimit, 'Expected a gas limit in ConstructorTxOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      if (this.registry.isRevive()) {
        assert(
          isUndefined(salt) ||
            (isHex(salt) && hexToU8a(salt).byteLength == 32) ||
            (isU8a(salt) && salt.byteLength == 32),
          'Expected a valid salt in ConstructorCallOptions, must be a hex string or Uint8Array of length 32',
        );

        assert(!isUndefined(storageDepositLimit), 'Expected a storage deposit limit in ConstructorTxOptions');

        if (isPvm(this.code)) {
          return client.tx.revive.instantiateWithCode(
            value,
            gasLimit,
            storageDepositLimit,
            this.code,
            bytes,
            isU8a(salt) ? u8aToHex(salt) : salt,
          );
        } else {
          return client.tx.revive.instantiate(
            value,
            gasLimit,
            storageDepositLimit,
            toHex(this.code),
            bytes,
            isU8a(salt) ? u8aToHex(salt) : salt,
          );
        }
      } else {
        if (isWasm(this.code)) {
          return client.tx.contracts.instantiateWithCode(
            value,
            gasLimit,
            storageDepositLimit,
            this.code,
            bytes,
            salt || '0x',
          );
        } else {
          return client.tx.contracts.instantiate(
            value,
            gasLimit,
            storageDepositLimit,
            toHex(this.code),
            bytes,
            salt || '0x',
          );
        }
      }
    };

    callFn.meta = meta;

    return callFn;
  }
}
