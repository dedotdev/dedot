import { GenericModuleError, GenericSubstrateApi } from '@delightfuldot/types';
import { SubstrateApi } from '@delightfuldot/chaintypes';
import { Executor } from './Executor';
import { ModuleError } from '@delightfuldot/codecs';
import { assert } from '@delightfuldot/utils';
import { stringCamelCase } from '@polkadot/util';

export class ErrorsExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, variantName: string) {
    const targetPallet = this.getPallet(pallet);

    const error = targetPallet.error;
    assert(error, `Not found error in pallet ${pallet}`);

    const variantMeta = this.#getVariantMeta(error, variantName);

    return {
      meta: variantMeta,
      is: (moduleError: ModuleError) =>
        moduleError.index === targetPallet.index && moduleError.error[0] === variantMeta.index,
      module: pallet,
    } as GenericModuleError;
  }

  #getVariantMeta(errorId: number, variantName: string) {
    const def = this.metadata.types[errorId];
    assert(def, `Error def not found for id ${errorId}`);

    const { tag, value } = def.type;
    assert(tag === 'Enum', `Invalid pallet error type!`);

    const variantMeta = value.members.find(({ name }) => stringCamelCase(name) === variantName);
    assert(variantMeta, `Variant not found: ${variantName}`);

    return {
      ...variantMeta,
      fields: variantMeta.fields.map(({ typeId }) => this.registry.findPortableCodec(typeId)),
    };
  }
}
