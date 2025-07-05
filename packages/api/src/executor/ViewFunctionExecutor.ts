import type { Bytes, Result, RuntimeApiMethodDefLatest, ViewFunctionDefV16 } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import type { GenericSubstrateApi, GenericViewFunction, GenericViewFunctionResult } from '@dedot/types';
import {
  assert,
  concatU8a,
  HexString,
  stringPascalCase,
  stringCamelCase,
  stringSnakeCase,
  u8aToHex,
  UnknownApiError,
  DedotError,
} from '@dedot/utils';
import { FrameSupportViewFunctionsViewFunctionDispatchError } from '../chaintypes/index.js';
import { Executor } from './Executor.js';
import { StateCallParams } from './RuntimeApiExecutor.js';

/**
 * @name ViewFunctionExecutor
 * @description Execute view functions using the runtimeViewFunction API
 * View functions are defined in metadata v16 under pallets.viewFunctions
 */
export class ViewFunctionExecutor<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends Executor<ChainApi> {
  doExecute(pallet: string, viewFunction: string): GenericViewFunction {
    const palletName = stringPascalCase(pallet);
    const viewFunctionName = stringSnakeCase(viewFunction);

    const viewFunctionDef = this.#findViewFunctionDef(pallet, viewFunction);
    assert(viewFunctionDef, new UnknownApiError(`View function not found: ${palletName}.${viewFunctionName}`));

    const callFn: GenericViewFunction = async (...args: any[]) => {
      const { inputs } = viewFunctionDef;

      const formattedInputs = inputs.map((param, index) =>
        this.registry.findCodec(param.typeId).tryEncode(args[index]),
      );

      const bytes = u8aToHex(concatU8a(viewFunctionDef.id, $.Vec($.u8).tryEncode(concatU8a(...formattedInputs))));

      const func = 'RuntimeViewFunction_execute_view_function';

      const callParams: StateCallParams = {
        func,
        params: bytes,
        at: this.atBlockHash,
      };

      const rawResult = await this.stateCall(callParams);

      const result = this.#decodeResult(rawResult);

      if (result.isErr) {
        throw new DedotError(`ViewFunctionError ${JSON.stringify(result.err)}`);
      }

      const $outputCodec = this.registry.findCodec(viewFunctionDef.output);

      const data = $outputCodec.tryDecode(result.value);

      return {
        data,
        raw: result,
      } as GenericViewFunctionResult;
    };

    callFn.meta = {
      ...viewFunctionDef,
      pallet: palletName,
      palletIndex: this.getPallet(pallet).index,
    };

    return callFn;
  }

  protected stateCall(callParams: StateCallParams): Promise<HexString> {
    const { func, params, at } = callParams;

    const args = [func, params];
    if (at) args.push(at);

    return this.client.rpc.state_call(...args);
  }

  #findViewFunctionDef(palletName: string, viewFunctionName: string): ViewFunctionDefV16 | undefined {
    const pallet = this.getPallet(palletName);

    const viewFunctionDef = pallet.viewFunctions.find((vf) => stringCamelCase(vf.name) === viewFunctionName);

    return viewFunctionDef;
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

  #decodeResult(rawResult: HexString): Result<Bytes, FrameSupportViewFunctionsViewFunctionDispatchError> {
    const runtimeViewFunctionDef = this.#findRuntimeApiMethodDef('RuntimeViewFunction', 'execute_view_function');
    assert(runtimeViewFunctionDef, new UnknownApiError('Runtime view function definition not found'));

    const $runtimeApiCodec = this.registry.findCodec(runtimeViewFunctionDef.output);
    assert($runtimeApiCodec, new UnknownApiError('Runtime API codec not found'));

    const result = $runtimeApiCodec.tryDecode(rawResult);

    return result as any;
  }
}
