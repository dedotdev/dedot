import type { Bytes, PalletDefLatest, Result, ViewFunctionDefLatest } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import type { GenericSubstrateApi, GenericViewFunction } from '@dedot/types';
import { assert, concatU8a, HexString, stringCamelCase, u8aToHex, UnknownApiError, DedotError } from '@dedot/utils';
import { FrameSupportViewFunctionsViewFunctionDispatchError } from '../chaintypes/index.js';
import { Executor, StateCallParams } from './Executor.js';

const RUNTIME_API_NAME = 'RuntimeViewFunction';
const METHOD_NAME = 'execute_view_function';

/**
 * @name ViewFunctionExecutor
 * @description Execute view functions using the runtimeViewFunction API
 */
export class ViewFunctionExecutor<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends Executor<ChainApi> {
  doExecute(pallet: string, viewFunction: string): GenericViewFunction {
    const targetPallet = this.getPallet(pallet);

    const viewFunctionDef = this.#findViewFunctionDef(targetPallet, viewFunction);
    assert(viewFunctionDef, new UnknownApiError(`View function not found: ${pallet}.${viewFunction}`));

    const callFn: GenericViewFunction = async (...args: any[]) => {
      const { inputs, id, output } = viewFunctionDef;

      const formattedInputs = inputs.map(({ typeId }, index) => this.registry.findCodec(typeId).tryEncode(args[index]));
      const bytes = u8aToHex(concatU8a(id, $.Vec($.u8).tryEncode(concatU8a(...formattedInputs))));

      const func = `${RUNTIME_API_NAME}_${METHOD_NAME}`;
      const callParams: StateCallParams = {
        func,
        params: bytes,
        at: this.atBlockHash,
      };

      const rawResult = await this.stateCall(callParams);

      const result = this.#decodeRawResult(rawResult);
      if (result.isErr) {
        throw new DedotError(`Error when calling view function (type: ${result.err.type})`);
      }

      return this.registry.findCodec(output).tryDecode(result.value);
    };

    callFn.meta = {
      ...viewFunctionDef,
      pallet: targetPallet.name,
      palletIndex: targetPallet.index,
    };

    return callFn;
  }

  #findViewFunctionDef(pallet: PalletDefLatest, viewFunctionName: string): ViewFunctionDefLatest | undefined {
    return pallet.viewFunctions.find((vf) => stringCamelCase(vf.name) === viewFunctionName);
  }

  #decodeRawResult(rawResult: HexString): Result<Bytes, FrameSupportViewFunctionsViewFunctionDispatchError> {
    const runtimeViewFunctionDef = this.metadata.apis
      .find((api) => api.name === RUNTIME_API_NAME)
      ?.methods.find((method) => method.name === METHOD_NAME);
    assert(runtimeViewFunctionDef, new UnknownApiError('RuntimeViewFunction definition not found'));

    const $codec = this.registry.findCodec(runtimeViewFunctionDef.output);
    const result = $codec.tryDecode(rawResult);

    return result as any;
  }
}
