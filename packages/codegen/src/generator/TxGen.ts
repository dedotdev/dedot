import { ApiGen } from '../generator';
import { stringCamelCase } from '@polkadot/util';
import { beautifySourceCode, commentBlock, compileTemplate, isReservedWord } from './utils';

export class TxGen extends ApiGen {
  generate() {
    const { pallets, types } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainTx', 'ISubmittableExtrinsic');

    let txDefsOut = '';
    for (let pallet of pallets) {
      if (pallet.calls === undefined) continue;

      const { type } = types[pallet.calls];

      if (type.tag === 'Enum') {
        const typedTxs = type.value.members.map((one) => ({
          functionName: stringCamelCase(one.name),
          params: one.fields.map((f) => ({
            name: this.#normalizeParamName(f.name!),
            type: this.typesGen.generateType(f.typeId, 1, false),
            docs: f.docs,
          })),
          docs: one.docs,
        }));

        txDefsOut += `${stringCamelCase(pallet.name)}: {
        ${typedTxs
          .map(
            ({ functionName, params, docs }) =>
              `${commentBlock(
                docs,
                '\n',
                params.map((p) => `@param ${p.name} ${p.docs}`),
              )}${functionName}(${params.map((p) => `${p.name}: ${p.type}`).join(', ')}): ISubmittableExtrinsic`,
          )
          .join(',\n')}
          
        ${commentBlock('Generic pallet tx call')}[callName: string]: (...args: any[]) => ISubmittableExtrinsic,
      },`;
      }
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('tx.hbs');

    return beautifySourceCode(template({ importTypes, txDefsOut }));
  }

  #normalizeParamName(name: string) {
    name = stringCamelCase(name);
    return isReservedWord(name) ? `${name}_` : name;
  }
}
