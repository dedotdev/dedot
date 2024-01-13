import { Executor } from './Executor';
import { GenericSubstrateApi, RuntimeApiParamSpec, RuntimeApiSpec } from '@delightfuldot/types';
import { assert, stringSnakeCase } from '@delightfuldot/utils';
import { stringPascalCase, u8aConcat, u8aToHex } from '@polkadot/util';
import { findRuntimeApiSpec } from '@delightfuldot/specs';
import { blake2AsHex } from '@polkadot/util-crypto';

export class RuntimeCallExecutor<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends Executor<ChainApi> {
  execute(runtime: string, method: string) {
    runtime = stringPascalCase(runtime);
    const callName = `${runtime}_${stringSnakeCase(method)}`;
    const targetRuntimeVersion = this.api.runtimeVersion.apis.find(
      ([runtimeHash]) => blake2AsHex(runtime, 64) === runtimeHash,
    );

    assert(targetRuntimeVersion, `Chain does not support ${runtime}`);
    const [_, version] = targetRuntimeVersion;

    const callSpec = findRuntimeApiSpec(callName, version);

    assert(callSpec, 'Call spec not found');

    const callFn = async (...args: any[]) => {
      const { params } = callSpec;

      const formattedInputs = args.map((input, index) => this.tryEncode(params[index], input));
      const bytes = u8aToHex(u8aConcat(...formattedInputs));

      const result = await this.provider.send<any>('state_call', [callName, bytes]);

      return this.tryDecode(callSpec, result);
    };

    callFn.meta = callSpec;

    return callFn;
  }

  tryDecode(callSpec: RuntimeApiSpec, raw: any) {
    if (raw === null) {
      // TODO clarify this & improve this
      return undefined;
    }

    const { type } = callSpec;

    return this.registry.findCodec(type).tryDecode(raw);
  }

  tryEncode(paramSpec: RuntimeApiParamSpec, value: any): Uint8Array {
    const { type } = paramSpec;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }
}
