import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { getDeprecationComment } from '../../utils.js';
import { ApiGen } from './ApiGen.js';

export class ViewFunctionGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType(
      'GenericChainViewFunctions',
      'GenericViewFunction',
      'RpcVersion',
      'GenericViewFunctionResult',
    );

    let defTypeOut = '';

    for (let pallet of pallets) {
      if (!pallet.viewFunctions || pallet.viewFunctions.length === 0) continue;

      const viewFns = pallet.viewFunctions.map((vf) => {
        const { docs, deprecationInfo } = vf;
        const paramsDoc = vf.inputs.map(
          (input) => `@param {${this.typesGen.generateType(input.typeId, 1)}} ${stringCamelCase(input.name)}`,
        );
        if (paramsDoc.length > 0) {
          docs.push('\n', ...paramsDoc);
        }

        const deprecationComments = getDeprecationComment(deprecationInfo);
        if (deprecationComments.length > 0) {
          docs.push('\n', ...deprecationComments);
        }

        const params = vf.inputs.map(
          (input) => `${stringCamelCase(input.name)}: ${this.typesGen.generateType(input.typeId, 1)}`,
        );

        const outputType = this.typesGen.generateType(vf.output, 1, true);
        return `${commentBlock(docs)}${stringCamelCase(vf.name)}: GenericViewFunction<Rv, (${params.join(', ')}) => Promise<${outputType}>>`;
      });

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s view functions`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${viewFns.join(',\n')}
        
        ${commentBlock('Generic pallet view function')}[name: string]: GenericViewFunction<Rv>;
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('chaintypes/templates/view-function.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }
}
