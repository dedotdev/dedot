import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { stringCamelCase } from '@polkadot/util';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { Executor } from './Executor';

export class ConstantExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, constantName: string) {
    const targetPallet = this.getPallet(pallet, true);

    const constantDef = targetPallet.constants.find((one) => stringCamelCase(one.name) === constantName);
    if (!constantDef) {
      throw new Error(`Constant not found: ${constantName} in pallet ${pallet}`);
    }

    const $codec = this.registry.findPortableCodec(constantDef.typeId);

    return $codec.tryDecode(constantDef.value);
  }
}
