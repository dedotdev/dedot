import { GenericSubstrateApi } from '@dedot/types';
import { assert, UnknownApiError, stringCamelCase } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import { Executor } from './Executor.js';

/**
 * @name ConstantExecutor
 *
 * Find & decode the constant value from metadata
 */
export class ConstantExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  doExecute(pallet: string, constantName: string) {
    const targetPallet = this.getPallet(pallet);

    const constantDef = targetPallet.constants.find((one) => stringCamelCase(one.name) === constantName);

    assert(constantDef, new UnknownApiError(`Constant ${constantName} not found in pallet ${pallet}`));

    const $codec = this.registry.findCodec(constantDef.typeId);

    return $codec.tryDecode(constantDef.value);
  }
}
