import { Executor } from './Executor';
import { GenericSubstrateApi, RuntimeApiParamSpec, RuntimeApiSpec } from '@delightfuldot/types';
import { assert, stringSnakeCase } from '@delightfuldot/utils';
import { u8aToHex } from '@polkadot/util';
import { findRuntimeApiSpec } from '@delightfuldot/specs';
import { blake2AsHex } from '@polkadot/util-crypto';

export class CallExecutor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends Executor<ChainApi> {
  execute(runtime: string, method: string) {
    const callName = `${runtime}_${stringSnakeCase(method)}`;
    const runtimeVersion = this.api.runtimeVersion.apis.find(
      ([runtimeHash]) => blake2AsHex(runtime, 64) === runtimeHash,
    );

    assert(runtimeVersion, `Chain does not support ${runtime}`);
    const [_, version] = runtimeVersion;

    const callSpec = findRuntimeApiSpec(callName, version);
    assert(callSpec, 'Call spec not found');

    return async (...args: any[]) => {
      const { params } = callSpec;

      const formattedInputs = args.map((input, index) => this.tryEncode(params[index], input));

      const result = await this.provider.send<any>('state_call', [callName, formattedInputs.join()]);

      return this.tryDecode(callSpec, result);
    };
  }

  tryDecode(callSpec: RuntimeApiSpec, raw: any) {
    if (raw === null) {
      // TODO clarify this & improve this
      return undefined;
    }

    const { type } = callSpec;

    return this.registry.findCodec(type).tryDecode(raw);
  }

  tryEncode(paramSpec: RuntimeApiParamSpec, value: any): string {
    const { type } = paramSpec;

    const $codec = this.registry.findCodec(type);

    return u8aToHex($codec.tryEncode(value));
  }
}
