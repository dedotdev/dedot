import { GenericModuleError, GenericSubstrateApi } from '@delightfuldot/types';
import { SubstrateApi } from '@delightfuldot/chaintypes';
import { Executor } from './Executor';
import { ModuleError } from '@delightfuldot/codecs';

export class ErrorsExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, variantName: string) {
    const targetPallet = this.getPallet(pallet);

    const error = targetPallet.error;
    if (!error) {
      throw new Error(`Not found error in pallet ${pallet}`);
    }

    const variantMeta = this.#getVariantMeta(error, variantName);

    return {
      meta: variantMeta,
      is: (moduleError: ModuleError) =>
        moduleError.index === targetPallet.index && moduleError.error[0] === variantMeta.index,
    } as GenericModuleError;
  }

  #getVariantMeta(errorId: number, variantName: string) {
    const def = this.metadata.types[errorId];
    if (!def) {
      throw new Error(`Error def not found: ${JSON.stringify(def)}`);
    }

    const { tag, value } = def.type;
    if (tag !== 'Enum') {
      throw new Error(`Invalid pallet error type!`);
    }

    const variantMeta = value.members.find(({ name }) => name == variantName);
    if (!variantMeta) {
      throw new Error(`Variant not found: ${variantName}`);
    }

    return {
      ...variantMeta,
      fields: variantMeta.fields.map(({ typeId }) => this.registry.findPortableCodec(typeId)),
    };
  }
}
