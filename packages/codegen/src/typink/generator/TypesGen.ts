import { TypeId } from '@dedot/codecs';
import { ContractMetadata, extractContractTypes } from '@dedot/contracts';
import { checkKnownCodecType, findKnownCodecType, BaseTypesGen, NamedType } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

const IGNORE_TYPES = ['Result', 'Option'];

export class TypesGen extends BaseTypesGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    super(extractContractTypes(contractMetadata));
    this.contractMetadata = contractMetadata;
    this.includedTypes = this.includeTypes();
  }

  generate(): Promise<string> {
    let defTypeOut = '';

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ name, nameOut, id }) => {
        defTypeOut += `export type ${nameOut} = ${this.generateType(id, 0, true)};\n\n`;

        if (this.shouldGenerateTypeIn(id)) {
          defTypeOut += `export type ${name} = ${this.generateType(id)};\n\n`;
        }
      });

    const importTypes = this.typeImports.toImports('./types');
    const template = compileTemplate('typink/templates/types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  getEnumOptions(_typeId: TypeId): { tagKey: string; valueKey: string } {
    return { tagKey: 'tag', valueKey: 'value' };
  }

  includeTypes(): Record<number, NamedType> {
    const types = this.types;
    const typesWithPath = types.filter((one) => one.path.length > 0 && !IGNORE_TYPES.includes(one.path[0]));
    const pathsCount = new Map<string, Array<number>>();
    const typeSuffixes = new Map<TypeId, string>();
    const skipIds: number[] = [];

    typesWithPath.forEach(({ path, id }) => {
      const joinedPath = path.join();
      if (pathsCount.has(joinedPath)) {
        const firstOccurrenceTypeId = pathsCount.get(joinedPath)![0];
        const sameType = this.typeEql(firstOccurrenceTypeId, id);
        if (sameType) {
          skipIds.push(id);
        } else {
          pathsCount.get(joinedPath)!.push(id);
          typeSuffixes.set(
            id,
            this.extractDupTypeSuffix(id, firstOccurrenceTypeId, pathsCount.get(joinedPath)!.length),
          );
        }
      } else {
        pathsCount.set(joinedPath, [id]);
      }
    });

    return typesWithPath.reduce(
      (o, type) => {
        const { path, id } = type;
        const joinedPath = path.join('::');
        const suffix = typeSuffixes.get(id) || '';

        let knownType = false;
        let name, nameOut;

        const [isKnownCodecType, codecName] = checkKnownCodecType(joinedPath);

        if (isKnownCodecType) {
          const codecType = findKnownCodecType(codecName);
          name = codecType.typeIn;
          nameOut = codecType.typeOut;

          knownType = true;
        } else {
          name = this.cleanPath(path);
        }

        if (this.shouldGenerateTypeIn(id)) {
          nameOut = name;
          name = name.endsWith('Like') ? name : `${name}Like`;
        }

        o[id] = {
          name: `${name}${suffix}`,
          nameOut: nameOut ? `${nameOut}${suffix}` : `${name}${suffix}`,
          knownType,
          skip: skipIds.includes(id),
          ...type,
        };

        return o;
      },
      {} as Record<TypeId, NamedType>,
    );
  }

  shouldGenerateTypeIn(id: number) {
    const { messages } = this.contractMetadata.spec;

    return messages.some((message) => message.returnType.type === id);
  }
}
