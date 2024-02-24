import { Executor } from './Executor';
import {
  GenericRuntimeApiMethod,
  GenericSubstrateApi,
  RuntimeApiMethodSpec,
  RuntimeApiMethodParamSpec,
} from '@delightfuldot/types';
import { assert, calculateRuntimeApiHash, stringSnakeCase } from '@delightfuldot/utils';
import { isNumber, stringPascalCase, u8aConcat, u8aToHex } from '@polkadot/util';
import { extractRuntimeApisModule, extractRuntimeApiSpec, findRuntimeApiMethodSpec } from '@delightfuldot/specs';
import { RuntimeApiMethodDefLatest } from '@delightfuldot/codecs';

export const FallbackRuntimeApis = [
  ['0x37e397fc7c91f5e4', 2], // Metadata Api v2
];

export class RuntimeApiExecutor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends Executor<ChainApi> {
  execute(runtimeApi: string, method: string): GenericRuntimeApiMethod {
    runtimeApi = stringPascalCase(runtimeApi);
    method = stringSnakeCase(method);

    const callName = `${runtimeApi}_${method}`;
    const callSpec = this.#findRuntimeApiMethodSpec(runtimeApi, method);

    assert(callSpec, `Runtime Api not found: ${callName}`);

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
    const { type, typeId, codec, methodName, runtimeApiName } = callSpec;

    assert(codec || typeId || type, `Cannot decode return data of ${runtimeApiName}_${methodName}: ${raw}`);

    const $codec =
      codec || (isNumber(typeId) ? this.registry.findPortableCodec(typeId) : this.registry.findCodec(type!));

    return $codec.tryDecode(raw);
  }

  tryEncode(paramSpec: RuntimeApiMethodParamSpec, value: any): Uint8Array {
    const { type, typeId, codec, name } = paramSpec;

    assert(codec || typeId || type, `Cannot encode type ${name}${value}`);

    const $codec =
      codec || (isNumber(typeId) ? this.registry.findPortableCodec(typeId) : this.registry.findCodec(type!));

    return $codec.tryEncode(value);
  }

  #findRuntimeApiMethodSpec(runtimeApi: string, method: string): RuntimeApiMethodSpec | undefined {
    const targetRuntimeApiVersion = this.#findTargetRuntimeApiVersion(runtimeApi);

    if (!isNumber(targetRuntimeApiVersion)) {
      return undefined;
    }

    const spec = this.#findRuntimeApiMethodUserDefinedSpec(runtimeApi, method, targetRuntimeApiVersion);

    if (spec) {
      return spec;
    }

    const methodDef = this.#findRuntimeApiMethodDef(runtimeApi, method);

    if (methodDef) {
      return this.#toMethodSpec(runtimeApi, methodDef);
    }

    return this.#findRuntimeApiMethodExternalSpec(runtimeApi, method, targetRuntimeApiVersion);
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

  #toMethodSpec(runtimeApi: string, methodDef?: RuntimeApiMethodDefLatest): RuntimeApiMethodSpec | undefined {
    if (!methodDef) return undefined;

    const { name, inputs, output, docs } = methodDef;

    return {
      docs,
      runtimeApiName: runtimeApi,
      methodName: name,
      type: '', // TODO generate type name
      typeId: output,
      params: inputs.map(({ name, typeId }) => ({
        name,
        type: '', // TODO generate type name
        typeId,
      })),
    };
  }

  #findTargetRuntimeApiVersion(runtimeApi: string): number | undefined {
    const targetRuntimeApiHash = calculateRuntimeApiHash(runtimeApi);

    const runtimeApiVersions = this.api.runtimeVersion?.apis || FallbackRuntimeApis;
    const targetRuntimeApiVersion = runtimeApiVersions
      .find(([supportedRuntimeApiHash]) => targetRuntimeApiHash === supportedRuntimeApiHash)
      ?.at(1) as number | undefined;

    return targetRuntimeApiVersion;
  }

  #findRuntimeApiMethodExternalSpec(
    runtimeApi: string,
    method: string,
    targetRuntimeApiVersion: number,
  ): RuntimeApiMethodSpec | undefined {
    return findRuntimeApiMethodSpec(`${runtimeApi}_${method}`, targetRuntimeApiVersion);
  }

  #findRuntimeApiMethodUserDefinedSpec(
    runtimeApi: string,
    method: string,
    targetRuntimeApiVersion: number,
  ): RuntimeApiMethodSpec | undefined {
    const userDefinedRuntime = this.api.options.runtime;
    if (!userDefinedRuntime) {
      return undefined;
    }

    const runtimeApiMethodSpecs = extractRuntimeApisModule(userDefinedRuntime).map(extractRuntimeApiSpec).flat();

    return runtimeApiMethodSpecs.find(
      (one) =>
        `${one.runtimeApiName}_${stringSnakeCase(one.methodName)}` === `${runtimeApi}_${method}` &&
        targetRuntimeApiVersion === one.version,
    );
  }
}
