import { ApiGen } from '../generator';
import { stringCamelCase, stringPascalCase } from '@polkadot/util';
import { beautifySourceCode, commentBlock, compileTemplate, isReservedWord } from './utils';
import { IRuntimeTxCall } from '@delightfuldot/types';

export class TxGen extends ApiGen {
  generate() {
    const { pallets, types } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType(
      'GenericChainTx',
      'GenericTxCall',
      'ISubmittableExtrinsic',
      'ISubmittableResult',
      'IRuntimeTxCall',
    );

    const { callTypeId, addressTypeId, signatureTypeId } = this.metadata.extrinsic;

    const callTypeOut = this.typesGen.generateType(callTypeId, 1, true);
    const addressTypeOut = this.typesGen.generateType(addressTypeId, 1, true);
    const signatureTypeOut = this.typesGen.generateType(signatureTypeId, 1, true);

    this.typesGen.typeImports.addPortableType('FrameSystemEventRecord');
    this.typesGen.typeImports.addCodecType('Extrinsic');
    this.typesGen.addTypeImport(callTypeOut);
    this.typesGen.addTypeImport(addressTypeOut);
    this.typesGen.addTypeImport(signatureTypeOut);

    let txDefsOut = '';
    for (let pallet of pallets) {
      if (pallet.calls === undefined) continue;

      const { type } = types[pallet.calls];

      if (type.tag === 'Enum') {
        const isFlatEnum = type.value.members.every((m) => m.fields.length === 0);

        const typedTxs = type.value.members
          .map((one) => ({
            functionName: stringCamelCase(one.name),
            params: one.fields.map((f) => ({
              name: stringCamelCase(f.name!),
              normalizedName: this.#normalizeParamName(f.name!),
              typeIn: this.typesGen.generateType(f.typeId, 1, false),
              typeOut: this.typesGen.generateType(f.typeId, 1, true),
              docs: f.docs,
            })),
            docs: one.docs,
          }))
          .map((f) => {
            return {
              ...f,
              callInput: this.#generateCallInput(
                stringPascalCase(pallet.name),
                stringPascalCase(f.functionName),
                isFlatEnum ? undefined : f.params.map((p) => `${p.name}: ${p.typeOut}`),
              ),
            };
          });

        txDefsOut += `${stringCamelCase(pallet.name)}: {
        ${typedTxs
          .map(
            ({ functionName, params, docs, callInput }) =>
              `${commentBlock(
                docs,
                '\n',
                params.map((p) => `@param ${p.normalizedName} ${p.docs}`),
              )}${functionName}: GenericTxCall<(${params.map((p) => `${p.normalizedName}: ${p.typeIn}`).join(', ')}) => ChainSubmittableExtrinsic<${callInput}>>`,
          )
          .join(',\n')}
          
        ${commentBlock('Generic pallet tx call')}[callName: string]: GenericTxCall<(...args: any[]) => ChainSubmittableExtrinsic>,
      },`;
      }
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const defTypes = `
    type ChainSubmittableExtrinsic<T extends IRuntimeTxCall = ${callTypeOut}> = 
        Extrinsic<${addressTypeOut}, T, ${signatureTypeOut}, any[]> &
        ISubmittableExtrinsic<ISubmittableResult<FrameSystemEventRecord>>
`;
    const template = compileTemplate('tx.hbs');

    return beautifySourceCode(template({ importTypes, defTypes, txDefsOut }));
  }

  #normalizeParamName(name: string) {
    name = stringCamelCase(name);
    return isReservedWord(name) ? `${name}_` : name;
  }

  #generateCallInput(palletName: string, callName: string, params: string[] | undefined): string {
    if (!params) {
      return `
        {
          pallet: '${palletName}',
          palletCall: '${callName}'
        }
      `;
    }

    const paramsOut = params.length > 0 ? `params: { ${params.join(',')} }` : '';

    return `
      {
        pallet: '${palletName}',
        palletCall: {
          name: '${callName}',
          ${paramsOut}
        }
      }
    `;
  }
}
