import { RuntimeApiMethodDefLatest } from '@dedot/codecs';
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

      const executeViewFunctionTypeDef = this.#findRuntimeApiMethodDef('RuntimeViewFunction', 'execute_view_function');

      if (!executeViewFunctionTypeDef) {
        throw new Error(`Runtime API method 'execute_view_function' not found in RuntimeViewFunction API`);
      }

      const executeViewFunctionOutputType = this.typesGen.generateType(executeViewFunctionTypeDef.output, 1, true);

      const viewFns = pallet.viewFunctions.map((vf) => {
        const { docs, deprecationInfo } = vf;
        const deprecationComments = getDeprecationComment(deprecationInfo);
        if (deprecationComments.length > 0) {
          docs.push('\n', ...deprecationComments);
        }
        const params = vf.inputs.map(
          (input) => `${stringCamelCase(input.name)}: ${this.typesGen.generateType(input.typeId, 1)}`,
        );
        const paramsDoc = vf.inputs.map(
          (input) => `@param {${this.typesGen.generateType(input.typeId, 1)}} ${stringCamelCase(input.name)}`,
        );
        const outputType = this.typesGen.generateType(vf.output, 1, true);
        return `${commentBlock(docs, ...paramsDoc)}${stringCamelCase(vf.name)}: GenericViewFunction<Rv, (${params.join(', ')}) => Promise<GenericViewFunctionResult<${outputType}, ${executeViewFunctionOutputType}>>>`;
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

  #findRuntimeApiMethodDef(runtimeApi: string, method: string): RuntimeApiMethodDefLatest | undefined {
    try {
      for (const api of this.metadata.apis) {
        if (api.name !== runtimeApi) continue;

        for (const apiMethod of api.methods) {
          if (apiMethod.name === method) return apiMethod;
        }
      }
    } catch {}
  }
}
