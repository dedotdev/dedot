import { GenericModuleError, GenericSubstrateApi } from '@delightfuldot/types';
import { SubstrateApi } from '@delightfuldot/chaintypes';
import { Executor } from './Executor';
import { ModuleError } from '@delightfuldot/codecs';
import { assert } from '@delightfuldot/utils';
import { hexToU8a, stringPascalCase } from '@polkadot/util';

export class ErrorExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, errorName: string): GenericModuleError {
    const targetPallet = this.getPallet(pallet);

    const errorTypeId = targetPallet.error;
    assert(errorTypeId, `Not found error with id ${errorTypeId} in pallet ${pallet}`);

    const errorDef = this.#getErrorDef(errorTypeId, errorName);

    return {
      meta: {
        ...errorDef,
        module: targetPallet.name,
        moduleIndex: targetPallet.index,
      },
      is: ({ index, error }: ModuleError) => index === targetPallet.index && hexToU8a(error)[0] === errorDef.index,
    };
  }

  #getErrorDef(errorTypeId: number, errorName: string) {
    const def = this.metadata.types[errorTypeId];
    assert(def, `Error def not found for id ${errorTypeId}`);

    const { tag, value } = def.type;
    assert(tag === 'Enum', `Error type should be an enum, found: ${tag}`);

    const errorDef = value.members.find(({ name }) => stringPascalCase(name) === errorName);
    assert(errorDef, `Error def not found for ${errorName}`);

    return {
      ...errorDef,
      fields: errorDef.fields.map(({ typeId }) => this.registry.findPortableCodec(typeId)),
    };
  }
}
