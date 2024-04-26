import { BlockHash, RuntimeApiMethodDefLatest } from '@dedot/codecs';
import type { AnyShape } from '@dedot/shape';
import { Metadata, toRuntimeApiMethods, toRuntimeApiSpecs } from '@dedot/specs';
import type {
  GenericRuntimeApiMethod,
  GenericSubstrateApi,
  RuntimeApiMethodParamSpec,
  RuntimeApiMethodSpec,
  RuntimeApiName,
  RuntimeApiSpec,
} from '@dedot/types';
import {
  assert,
  calcRuntimeApiHash,
  concatU8a,
  HexString,
  isNumber,
  stringPascalCase,
  stringSnakeCase,
  u8aToHex,
  UnknownApiError,
} from '@dedot/utils';
import { Executor } from './Executor.js';

export const FallbackRuntimeApis: Record<string, number> = { '0x37e397fc7c91f5e4': 2 };

export const FallbackRuntimeApiSpecs = { Metadata };

export interface StateCallParams {
  func: string;
  params: HexString;
  at?: BlockHash;
}

/**
 * @name RuntimeApiExecutor
 * @description Execute a runtime api call,
 * runtime api definitions/specs are either from Metadata V15
 * or defined externally when initializing `Dedot` instance
 * via `ApiOptions.runtimeApis` option.
 */
export class RuntimeApiExecutor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(runtimeApi: string, method: string): GenericRuntimeApiMethod {
    const runtimeApiName = stringPascalCase(runtimeApi);
    const methodName = stringSnakeCase(method);

    const callName = this.#callName({ runtimeApiName, methodName });
    const callSpec = this.#findRuntimeApiMethodSpec(runtimeApiName, methodName);

    assert(callSpec, new UnknownApiError(`Runtime api spec not found for ${callName}`));

    const callFn: GenericRuntimeApiMethod = async (...args: any[]) => {
      const { params } = callSpec;

      const formattedInputs = params.map((param, index) => this.tryEncode(param, args[index]));
      const bytes = u8aToHex(concatU8a(...formattedInputs));

      const callParams: StateCallParams = {
        func: callName,
        params: bytes,
        at: this.atBlockHash,
      };

      const result = await this.stateCall(callParams);

      return this.tryDecode(callSpec, result);
    };

    callFn.meta = callSpec;

    return callFn;
  }

  protected stateCall(callParams: StateCallParams): Promise<HexString> {
    const { func, params, at } = callParams;

    const args = [func, params];
    if (at) args.push(at);

    return this.api.rpc.state_call(...args);
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

    const userDefinedSpec = this.#findDefinedSpec(this.api.options.runtimeApis, runtimeApi, method, targetVersion);
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
    const runtimeApiHash = calcRuntimeApiHash(runtimeApi);
    try {
      return this.api.runtimeVersion.apis[runtimeApiHash] || FallbackRuntimeApis[runtimeApiHash];
    } catch {
      return FallbackRuntimeApis[runtimeApiHash];
    }
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
