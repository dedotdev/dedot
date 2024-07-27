import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate, isReservedWord } from '../../utils.js';
import { ApiGen } from '../generator/index.js';

export class TxGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
    const { pallets, types } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType(
      'GenericChainTx',
      'GenericTxCall',
      'ISubmittableExtrinsic',
      'ISubmittableResult',
      'IRuntimeTxCall',
      'RpcVersion',
      'RpcV2',
      'ISubmittableExtrinsicLegacy',
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

      const { typeDef } = types[pallet.calls];

      if (typeDef.type !== 'Enum') continue;

      const isFlatEnum = typeDef.value.members.every((m) => m.fields.length === 0);

      const typedTxs = typeDef.value.members
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
                )}${functionName}: GenericTxCall<Rv, (${params.map((p) => `${p.normalizedName}: ${p.type}`).join(', ')}) => ChainSubmittableExtrinsic<Rv, ${callInput}>>`,
            )
            .join(',\n')}
            
          ${commentBlock('Generic pallet tx call')}[callName: string]: GenericTxCall<Rv, TxCall<Rv>>,
        },`;
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });

    // TODO make explicit separate type for Extra
    const defTypes = `
    export type ChainSubmittableExtrinsic<Rv extends RpcVersion, T extends IRuntimeTxCall = ${callTypeIn}> = 
        Extrinsic<${addressTypeIn}, T, ${signatureTypeIn}, any[]> &
        (Rv extends RpcV2
          ? ISubmittableExtrinsic<ISubmittableResult<FrameSystemEventRecord>>
          : ISubmittableExtrinsicLegacy<ISubmittableResult<FrameSystemEventRecord>>)
        
    export type TxCall<Rv extends RpcVersion> = (...args: any[]) => ChainSubmittableExtrinsic<Rv>;    
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
