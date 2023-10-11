import { Executor } from "./Executor";
import { stringCamelCase } from "@polkadot/util";

export class ConstantExecutor extends Executor {
  execute(pallet: string, constantName: string) {
    const targetPallet = this.getPallet(pallet, true);

    const constantDef = targetPallet.constants.find((one) => stringCamelCase(one.name) === constantName);
    if (!constantDef) {
      throw new Error(`Constant not found: ${constantName} in pallet ${pallet}`)
    }

    const $codec = this.registry.findPortableCodec(constantDef.typeId);

    return $codec.tryDecode(constantDef.value);
  }
}
