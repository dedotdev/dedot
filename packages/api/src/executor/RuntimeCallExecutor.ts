import { Executor } from './Executor';
import { GenericRuntimeCall, GenericSubstrateApi, RuntimeCallParamSpec, RuntimeCallSpec } from '@delightfuldot/types';
import { assert, calculateRuntimeApiHash, stringSnakeCase } from '@delightfuldot/utils';
import { stringPascalCase, u8aConcat, u8aToHex } from '@polkadot/util';
import { findRuntimeCallSpec } from '@delightfuldot/specs';

export class RuntimeCallExecutor<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends Executor<ChainApi> {
  execute(runtimeApi: string, method: string): GenericRuntimeCall {
    runtimeApi = stringPascalCase(runtimeApi);
    const targetRuntimeApiHash = calculateRuntimeApiHash(runtimeApi);
    const targetRuntimeApiVersion = this.api.runtimeVersion.apis
      .find(([supportedRuntimeApiHash]) => targetRuntimeApiHash === supportedRuntimeApiHash)
      ?.at(1) as number;

    assert(targetRuntimeApiVersion, `Connected chain does not support runtime API: ${runtimeApi}`);

    const callName = `${runtimeApi}_${stringSnakeCase(method)}`;
    const callSpec = findRuntimeCallSpec(callName, targetRuntimeApiVersion);

    assert(callSpec, `Runtime call spec not found for ${callName}`);

    const callFn: GenericRuntimeCall = async (...args: any[]) => {
      const { params } = callSpec;

      const formattedInputs = args.map((input, index) => this.tryEncode(params[index], input));
      const bytes = u8aToHex(u8aConcat(...formattedInputs));

      const result = await this.api.rpc.state.call(callName, bytes);

      return this.tryDecode(callSpec, result);
    };

    callFn.meta = callSpec;

    return callFn;
  }

  tryDecode(callSpec: RuntimeCallSpec, raw: any) {
    const { type } = callSpec;

    return this.registry.findCodec(type).tryDecode(raw);
  }

  tryEncode(paramSpec: RuntimeCallParamSpec, value: any): Uint8Array {
    const { type } = paramSpec;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }
}
