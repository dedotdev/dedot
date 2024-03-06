import type { SubstrateApi } from '@dedot/chaintypes';
import { stringCamelCase } from '@polkadot/util';
import { GenericSubstrateApi } from '@dedot/types';
import { Executor } from './Executor';

/**
 * @name ConstantExecutor
 *
 * Find & decode the constant value from metadata
 */
export class ConstantExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, constantName: string) {
    const targetPallet = this.getPallet(pallet);

    const constantDef = targetPallet.constants.find((one) => stringCamelCase(one.name) === constantName);
    if (!constantDef) {
      throw new Error(`Constant ${constantName} not found in pallet ${pallet}`);
    }

    const $codec = this.registry.findCodec(constantDef.typeId);

    return $codec.tryDecode(constantDef.value);
  }
}
