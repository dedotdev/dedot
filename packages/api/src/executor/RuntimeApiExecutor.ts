import type { AnyShape } from '@dedot/shape';
import type {
  GenericRuntimeApiMethod,
  GenericSubstrateApi,
  RuntimeApiMethodParamSpec,
  RuntimeApiMethodSpec,
  RuntimeApiName,
  RuntimeApiSpec,
} from '@dedot/types';
import { Executor } from './Executor';
import { assert, calculateRuntimeApiHash, stringSnakeCase } from '@dedot/utils';
import { isNumber, stringPascalCase, u8aConcat, u8aToHex } from '@polkadot/util';
import { RuntimeApiMethodDefLatest } from '@dedot/codecs';
import { Metadata, toRuntimeApiMethods, toRuntimeApiSpecs } from '@dedot/specs';

export const FallbackRuntimeApis = [
  ['0x37e397fc7c91f5e4', 2], // Metadata Api v2
];

export const FallbackRuntimeApiSpecs = { Metadata };

export class RuntimeApiExecutor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends Executor<ChainApi> {
  execute(runtimeApi: string, method: string): GenericRuntimeApiMethod {
    const runtimeApiName = stringPascalCase(runtimeApi);
    const methodName = stringSnakeCase(method);

    const callName = this.#callName({ runtimeApiName, methodName });
    const callSpec = this.#findRuntimeApiMethodSpec(runtimeApiName, methodName);

    assert(callSpec, `Runtime api spec not found for ${callName}`);

    const callFn: GenericRuntimeApiMethod = async (...args: any[]) => {
      const { params } = callSpec;

      const formattedInputs = params.map((param, index) => this.tryEncode(param, args[index]));
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
    const $codec = this.#findCodec(callSpec, `Codec not found to decode respond data for ${this.#callName(callSpec)}`);
    return $codec.tryDecode(raw);
  }

  tryEncode(paramSpec: RuntimeApiMethodParamSpec, value: any): Uint8Array {
    const $codec = this.#findCodec(paramSpec, `Codec not found to encode input for param ${paramSpec.name}`);
    return $codec.tryEncode(value);
  }

  #findCodec(spec: { typeId?: number; type?: string; codec?: AnyShape }, error?: string): AnyShape {
    const { codec, typeId, type } = spec;

    if (codec) return codec;

    if (isNumber(typeId)) {
      return this.registry.findCodec(typeId);
    }

    throw new Error(error || 'Codec not found');
  }

  #callName({ runtimeApiName, methodName }: Pick<RuntimeApiMethodSpec, 'runtimeApiName' | 'methodName'>): string {
    return `${runtimeApiName}_${methodName}`;
  }

  #findRuntimeApiMethodSpec(runtimeApi: string, method: string): RuntimeApiMethodSpec | undefined {
    const targetVersion = this.#findTargetRuntimeApiVersion(runtimeApi);

    if (!isNumber(targetVersion)) return undefined;

    const userDefinedSpec = this.#findDefinedSpec(this.api.options.runtime, runtimeApi, method, targetVersion);
    if (userDefinedSpec) return userDefinedSpec;

    const methodDef = this.#findRuntimeApiMethodDef(runtimeApi, method);
    if (methodDef) {
      return this.#toMethodSpec(runtimeApi, methodDef);
    }

    return this.#findDefinedSpec(FallbackRuntimeApiSpecs, runtimeApi, method, targetVersion);
  }

  #findRuntimeApiMethodDef(runtimeApi: string, method: string): RuntimeApiMethodDefLatest | undefined {
    try {
      for (const api of this.metadata.apis) {
        if (api.name !== runtimeApi) continue;

        for (const apiMethod of api.methods) {
          if (apiMethod.name === method) return apiMethod;
        }
      }
    } catch {}
  }

  #toMethodSpec(runtimeApi: string, methodDef: RuntimeApiMethodDefLatest): RuntimeApiMethodSpec {
    const { name, inputs, output, docs } = methodDef;

    return {
      docs,
      runtimeApiName: runtimeApi,
      methodName: name,
      typeId: output,
      params: inputs.map(({ name, typeId }) => ({
        name,
        typeId,
      })),
    };
  }

  #findTargetRuntimeApiVersion(runtimeApi: string): number | undefined {
    const runtimeApiHash = calculateRuntimeApiHash(runtimeApi);
    const runtimeApiVersions = this.api.runtimeVersion?.apis || FallbackRuntimeApis;

    const foundVersion = runtimeApiVersions
      .find(([supportedRuntimeApiHash]) => runtimeApiHash === supportedRuntimeApiHash)
      ?.at(1);

    return foundVersion as number | undefined;
  }

  #findDefinedSpec(
    specs: Record<RuntimeApiName, RuntimeApiSpec[]> | undefined,
    runtimeApi: string,
    method: string,
    runtimeApiVersion: number,
  ): RuntimeApiMethodSpec | undefined {
    if (!specs) return undefined;

    const methodSpecs = toRuntimeApiSpecs(specs).map(toRuntimeApiMethods).flat();

    return methodSpecs.find(
      ({ runtimeApiName, methodName, version }) =>
        `${stringPascalCase(runtimeApiName!)}_${stringSnakeCase(methodName)}` === `${runtimeApi}_${method}` &&
        runtimeApiVersion === version,
    );
  }
}
