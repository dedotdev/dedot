import { assert, stringCamelCase, UnknownApiError } from '@dedot/utils';
import { Executor } from './Executor.js';

/**
 * @name ConstantExecutor
 *
 * Find & decode the constant value from metadata
 */
export class ConstantExecutor extends Executor {
  doExecute(pallet: string, constantName: string) {
    const targetPallet = this.getPallet(pallet);

    const constantDef = targetPallet.constants.find((one) => stringCamelCase(one.name) === constantName);

    assert(constantDef, new UnknownApiError(`Constant ${constantName} not found in pallet ${pallet}`));

    const $codec = this.registry.findCodec(constantDef.typeId);

    return $codec.tryDecode(constantDef.value);
  }
}
