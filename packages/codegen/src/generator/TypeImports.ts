export class TypeImports {
  // Portable types from chain/metadata
  portableTypes: Set<string>;
  // Known types that has a corresponding codec defined in @dedot/codecs
  codecTypes: Set<string>;
  // Known types that're not codecs or chain/portable types defined in @dedot/types
  knownTypes: Set<string>;
  // External types to define explicitly
  outTypes: Set<string>;

  constructor() {
    this.portableTypes = new Set<string>();
    this.codecTypes = new Set<string>();
    this.knownTypes = new Set<string>();
    this.outTypes = new Set<string>();
  }

  clear() {
    this.portableTypes.clear();
    this.codecTypes.clear();
    this.knownTypes.clear();
    this.outTypes.clear();
  }

  toImports(...excludeModules: string[]) {
    // TODO generate outTypes!

    const toImports: [Set<string>, string][] = [
      [this.knownTypes, '@dedot/types'],
      [this.codecTypes, '@dedot/codecs'],
      [this.portableTypes, './types'],
      [this.outTypes, '../../types'],
    ];

    return toImports
      .filter(([_, module]) => !excludeModules.includes(module))
      .map(([types, module]) => this.#toImportLine(types, module))
      .join('\n');
  }

  #toImportLine(types: Set<string>, module: string) {
    const typesToImports = [...types];
    if (typesToImports.length === 0) return '';

    return `import type {${typesToImports.join(', ')}} from "${module}"`;
  }

  addPortableType(...types: string[]) {
    types.forEach((one) => this.portableTypes.add(one));
  }

  addCodecType(...types: string[]) {
    types.forEach((one) => this.codecTypes.add(one));
  }

  addKnownType(...types: string[]) {
    types.forEach((one) => this.knownTypes.add(one));
  }

  addOutType(...types: string[]) {
    types.forEach((one) => this.outTypes.add(one));
  }
}
