import type { DispatchError, ModuleError } from '@dedot/codecs';
import type { GenericPalletError, GenericSubstrateApi } from '@dedot/types';
import { assert, hexToU8a, isHex, isNumber, isObject, stringPascalCase, UnknownApiError } from '@dedot/utils';
import { Executor } from './Executor.js';

/**
 * @name ErrorExecutor
 * @description Find pallet error information from metadata
 */
export class ErrorExecutor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(pallet: string, errorName: string): GenericPalletError {
    const targetPallet = this.getPallet(pallet);

    const errorTypeId = targetPallet.error;
    assert(errorTypeId, new UnknownApiError(`Not found error with id ${errorTypeId} in pallet ${pallet}`));

    const errorDef = this.#getErrorDef(errorTypeId, errorName);

    return {
      meta: {
        ...errorDef,
        pallet: targetPallet.name,
        palletIndex: targetPallet.index,
      },
      is: (errorInfo: ModuleError | DispatchError) => {
        if (isObject<DispatchError>(errorInfo) && errorInfo.tag === 'Module') {
          errorInfo = errorInfo.value;
        }

        if (isObject<ModuleError>(errorInfo) && isNumber(errorInfo.index) && isHex(errorInfo.error)) {
          return errorInfo.index === targetPallet.index && hexToU8a(errorInfo.error)[0] === errorDef.index;
        }

        return false;
      },
    };
  }

  #getErrorDef(errorTypeId: number, errorName: string) {
    const def = this.metadata.types[errorTypeId];
    assert(def, new UnknownApiError(`Error def not found for id ${errorTypeId}`));

    const { tag, value } = def.type;
    assert(tag === 'Enum', new UnknownApiError(`Error type should be an enum, found: ${tag}`));

    const errorDef = value.members.find(({ name }) => stringPascalCase(name) === errorName);
    assert(errorDef, new UnknownApiError(`Error def not found for ${errorName}`));

    return {
      ...errorDef,
      fieldCodecs: errorDef.fields.map(({ typeId }) => this.registry.findCodec(typeId)),
    };
  }
}
