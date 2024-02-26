import { Executor } from './Executor';
import {
  GenericRuntimeApiMethod,
  GenericSubstrateApi,
  RuntimeApiMethodParamSpec,
  RuntimeApiMethodSpec,
} from '@dedot/types';
import { assert, calculateRuntimeApiHash, stringSnakeCase } from '@dedot/utils';
import { isNumber, stringPascalCase, u8aConcat, u8aToHex } from '@polkadot/util';
import { findRuntimeApiMethodSpec } from '@dedot/specs';
import { RuntimeApiMethodDefLatest } from '@dedot/codecs';

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
    const { type, typeId } = callSpec;

    if (isNumber(typeId)) {
      return this.registry.findPortableCodec(typeId).tryDecode(raw);
    }

    return this.registry.findCodec(type).tryDecode(raw);
  }

  tryEncode(paramSpec: RuntimeApiMethodParamSpec, value: any): Uint8Array {
    const { type, typeId } = paramSpec;

    const $codec = isNumber(typeId) ? this.registry.findPortableCodec(typeId) : this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }

  #findRuntimeApiMethodSpec(runtimeApi: string, method: string): RuntimeApiMethodSpec | undefined {
    const methodDef = this.#findRuntimeApiMethodDef(runtimeApi, method);

    if (methodDef) {
      return this.#toMethodSpec(runtimeApi, methodDef);
    }

    return this.#findRuntimeApiMethodExternalSpec(runtimeApi, method);
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

  #findRuntimeApiMethodExternalSpec(runtimeApi: string, method: string): RuntimeApiMethodSpec | undefined {
    const targetRuntimeApiHash = calculateRuntimeApiHash(runtimeApi);

    const runtimeApiVersions = this.api.runtimeVersion?.apis || FallbackRuntimeApis;
    const targetRuntimeApiVersion = runtimeApiVersions
      .find(([supportedRuntimeApiHash]) => targetRuntimeApiHash === supportedRuntimeApiHash)
      ?.at(1) as number | undefined;

    if (!isNumber(targetRuntimeApiVersion)) {
      return undefined;
    }

    return findRuntimeApiMethodSpec(`${runtimeApi}_${method}`, targetRuntimeApiVersion);
  }
}
