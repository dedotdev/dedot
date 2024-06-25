import { ContractMetadata, extractContractTypes } from '@dedot/contracts';
import { BaseTypesGen } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

const SKIP_TYPES = ['Result', 'Option'];

export class TypesGen extends BaseTypesGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    super(extractContractTypes(contractMetadata));
    this.contractMetadata = contractMetadata;
    this.skipTypes = SKIP_TYPES;
    this.includedTypes = this.includeTypes();
  }

  generate(useSubPaths: boolean = false): Promise<string> {
    let defTypeOut = '';

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ nameOut, id }) => {
        defTypeOut += `export type ${nameOut} = ${this.generateType(id, 0, true)};\n\n`;
      });

    const importTypes = this.typeImports.toImports({ excludeModules: ['./types'], useSubPaths });
    const template = compileTemplate('typink/templates/types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }
}
