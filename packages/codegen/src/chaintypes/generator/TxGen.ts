import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import {
  beautifySourceCode,
  commentBlock,
  compileTemplate,
  isReservedWord,
  getVariantDeprecationComment,
} from '../../utils.js';
import { ApiGen } from '../generator/index.js';

export class TxGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
    const { pallets, types } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType(
      'GenericChainTx',
      'GenericTxCall',
      'GenericChainKnownTypes',
      'ISubmittableExtrinsic',
      'ISubmittableResult',
      'IRuntimeTxCall',
    );

    const { callTypeId, addressTypeId, signatureTypeId } = this.metadata.extrinsic;

    const callTypeIn = this.typesGen.generateType(callTypeId, 1);
    const addressTypeIn = this.typesGen.generateType(addressTypeId, 1);
    const signatureTypeIn = this.typesGen.generateType(signatureTypeId, 1);

    this.typesGen.typeImports.addPortableType('FrameSystemEventRecord');
    this.typesGen.typeImports.addCodecType('Extrinsic');
    this.typesGen.addTypeImport([callTypeIn, addressTypeIn, signatureTypeIn]);

    let txDefsOut = '';
    for (let pallet of pallets) {
      if (pallet.calls === undefined) continue;

      const { typeDef } = types[pallet.calls.typeId];

      if (typeDef.type !== 'Enum') continue;

      const isFlatEnum = typeDef.value.members.every((m) => m.fields.length === 0);

      const typedTxs = typeDef.value.members
        .map((one, index) => ({
          functionName: stringCamelCase(one.name),
          params: one.fields.map((f) => ({
            name: stringCamelCase(f.name!),
            normalizedName: this.#normalizeParamName(f.name!),
            type: this.typesGen.generateType(f.typeId, 1),
            docs: f.docs,
          })),
          docs: one.docs,
          index,
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
            .map(({ functionName, params, docs, callInput }, idx) => {
              const deprecationComments = getVariantDeprecationComment(pallet.calls?.deprecationInfo, idx);
              if (deprecationComments.length > 0) {
                deprecationComments.unshift('\n');
              }

              return `${commentBlock(
                docs,
                '\n',
                params.map((p) => `@param {${p.type}} ${p.normalizedName} ${p.docs}`),
                deprecationComments,
              )}${functionName}: GenericTxCall<(${params.map((p) => `${p.normalizedName}: ${p.type}`).join(', ')}) => ChainSubmittableExtrinsic<${callInput}, ChainKnownTypes>>`;
            })
            .join(',\n')}
            
          ${commentBlock('Generic pallet tx call')}[callName: string]: GenericTxCall<TxCall<ChainKnownTypes>>,
        },`;
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });

    const defTypes = `
    export type ChainSubmittableExtrinsic<T extends IRuntimeTxCall = ${callTypeIn}, ChainKnownTypes extends GenericChainKnownTypes = GenericChainKnownTypes> = 
        Extrinsic<${addressTypeIn}, T, ${signatureTypeIn}, ChainKnownTypes['Extra']> & ISubmittableExtrinsic<ISubmittableResult<FrameSystemEventRecord>, ChainKnownTypes['AssetId']>
        
    export type TxCall<ChainKnownTypes extends GenericChainKnownTypes = GenericChainKnownTypes> = (...args: any[]) => ChainSubmittableExtrinsic<${callTypeIn}, ChainKnownTypes>;    
`;
    const template = compileTemplate('chaintypes/templates/tx.hbs');

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
