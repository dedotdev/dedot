import { Executor } from './Executor';
import {
  GenericRuntimeApiMethod,
  GenericSubstrateApi,
  RuntimeApiMethodParamSpec,
  RuntimeApiMethodSpec,
} from '@delightfuldot/types';
import { assert, calculateRuntimeApiHash, stringSnakeCase } from '@delightfuldot/utils';
import { stringPascalCase, u8aConcat, u8aToHex } from '@polkadot/util';
import { findRuntimeCallSpec } from '@delightfuldot/specs';

export const FallbackRuntimeApis = [
  ['0x37e397fc7c91f5e4', 2], // Metadata Api v2
];

export class RuntimeApiExecutor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends Executor<ChainApi> {
  execute(runtimeApi: string, method: string): GenericRuntimeApiMethod {
    runtimeApi = stringPascalCase(runtimeApi);
    const targetRuntimeApiHash = calculateRuntimeApiHash(runtimeApi);
    const runtimeApiVersions = this.api.runtimeVersion?.apis || FallbackRuntimeApis;
    const targetRuntimeApiVersion = runtimeApiVersions
      .find(([supportedRuntimeApiHash]) => targetRuntimeApiHash === supportedRuntimeApiHash)
      ?.at(1) as number | undefined;

    assert(typeof targetRuntimeApiVersion === 'number', `Connected chain does not support runtime API: ${runtimeApi}`);

    const callName = `${runtimeApi}_${stringSnakeCase(method)}`;
    const callSpec = findRuntimeCallSpec(callName, targetRuntimeApiVersion);

    assert(callSpec, `Runtime call spec not found for ${callName}`);

    const callFn: GenericRuntimeApiMethod = async (...args: any[]) => {
      const { params } = callSpec;

      const formattedInputs = args.map((input, index) => this.tryEncode(params[index], input));
      const bytes = u8aToHex(u8aConcat(...formattedInputs));

      const callArgs = [callName, bytes];
      if (this.atBlockHash) {
        callArgs.push(this.atBlockHash);
      }

      const result = await this.api.rpc.state.call(...callArgs);

      return this.tryDecode(callSpec, result);
    };

    callFn.meta = callSpec;

    return callFn;
  }

  tryDecode(callSpec: RuntimeApiMethodSpec, raw: any) {
    const { type } = callSpec;

    return this.registry.findCodec(type).tryDecode(raw);
  }

  tryEncode(paramSpec: RuntimeApiMethodParamSpec, value: any): Uint8Array {
    const { type } = paramSpec;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }
}
