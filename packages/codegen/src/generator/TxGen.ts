import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import { ApiGen } from '../generator/index.js';
import { beautifySourceCode, commentBlock, compileTemplate, isReservedWord } from './utils.js';

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

    const callTypeIn = this.typesGen.generateType(callTypeId, 1);
    const addressTypeIn = this.typesGen.generateType(addressTypeId, 1);
    const signatureTypeIn = this.typesGen.generateType(signatureTypeId, 1);

    this.typesGen.typeImports.addPortableType('FrameSystemEventRecord');
    this.typesGen.typeImports.addCodecType('Extrinsic', 'TransactionStatus');
    this.typesGen.addTypeImport([callTypeIn, addressTypeIn, signatureTypeIn]);

    let txDefsOut = '';
    for (let pallet of pallets) {
      if (pallet.calls === undefined) continue;

      const { type } = types[pallet.calls];

      if (type.tag !== 'Enum') continue;

      const isFlatEnum = type.value.members.every((m) => m.fields.length === 0);

      const typedTxs = type.value.members
        .map((one) => ({
          functionName: stringCamelCase(one.name),
          params: one.fields.map((f) => ({
            name: stringCamelCase(f.name!),
            normalizedName: this.#normalizeParamName(f.name!),
            type: this.typesGen.generateType(f.typeId, 1),
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
              !isFlatEnum ? f.params.map((p) => `${p.name}: ${p.type}`) : undefined,
            ),
          };
        });

      txDefsOut += commentBlock(`Pallet \`${pallet.name}\`'s transaction calls`);
      txDefsOut += `${stringCamelCase(pallet.name)}: {
          ${typedTxs
            .map(
              ({ functionName, params, docs, callInput }) =>
                `${commentBlock(
                  docs,
                  '\n',
                  params.map((p) => `@param {${p.type}} ${p.normalizedName} ${p.docs}`),
                )}${functionName}: GenericTxCall<(${params.map((p) => `${p.normalizedName}: ${p.type}`).join(', ')}) => ChainSubmittableExtrinsic<${callInput}>>`,
            )
            .join(',\n')}
            
          ${commentBlock('Generic pallet tx call')}[callName: string]: GenericTxCall<TxCall>,
        },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();

    // TODO make explicit separate type for Extra
    const defTypes = `
    export type ChainSubmittableExtrinsic<T extends IRuntimeTxCall = ${callTypeIn}> = 
        Extrinsic<${addressTypeIn}, T, ${signatureTypeIn}, any[]> &
        ISubmittableExtrinsic<ISubmittableResult<FrameSystemEventRecord, TransactionStatus>>
        
    export type TxCall = (...args: any[]) => ChainSubmittableExtrinsic;    
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
