type ImportConfig = {
  excludeModules?: string[];
  useSubPaths?: boolean;
};

export class TypeImports {
  // Portable types from chain/metadata
  portableTypes: Set<string>;
  // Known types that has a corresponding codec defined in @dedot/codecs
  codecTypes: Set<string>;
  // Known types that're not codecs or chain/portable types defined in @dedot/types
  knownTypes: Set<string>;
  knownJsonRpcTypes: Set<string>;
  // External types to define explicitly
  outTypes: Set<string>;
  // Know types defined in @dedot/contracts
  contractTypes: Set<string>;
  // Know types defined in @dedot/api/chaintypes or dedot/chaintypes
  chainTypes: Set<string>;

  constructor() {
    this.portableTypes = new Set<string>();
    this.codecTypes = new Set<string>();
    this.knownTypes = new Set<string>();
    this.knownJsonRpcTypes = new Set<string>();
    this.outTypes = new Set<string>();
    this.contractTypes = new Set<string>();
    this.chainTypes = new Set<string>();
  }

  clear() {
    this.portableTypes.clear();
    this.codecTypes.clear();
    this.knownTypes.clear();
    this.knownJsonRpcTypes.clear();
    this.outTypes.clear();
    this.contractTypes.clear();
    this.chainTypes.clear();
  }

  toImports(config?: ImportConfig) {
    const { excludeModules = [], useSubPaths = false } = config || {};

    // TODO generate outTypes!
    const prefix = useSubPaths ? '' : '@';

    const toImports: [Set<string>, string][] = [
      [this.knownTypes, `${prefix}dedot/types`],
      [this.knownJsonRpcTypes, `${prefix}dedot/types/json-rpc`],
      [this.codecTypes, `${prefix}dedot/codecs`],
      [this.contractTypes, `${prefix}dedot/contracts`],
      [this.chainTypes, prefix ? '@dedot/api/chaintypes' : 'dedot/chaintypes'],
      [this.portableTypes, './types.js'],
    ];

    return toImports
      .filter(([_, module]) => !excludeModules.includes(module))
      .map(([types, module]) => this.#toImportLine(types, module))
      .filter((line) => line.length > 0)
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

  addKnownJsonRpcType(...types: string[]) {
    types.forEach((one) => this.knownJsonRpcTypes.add(one));
  }

  addOutType(...types: string[]) {
    types.forEach((one) => this.outTypes.add(one));
  }

  addContractType(...types: string[]) {
    types.forEach((one) => this.contractTypes.add(one));
  }

  addChainType(...types: string[]) {
    types.forEach((one) => this.chainTypes.add(one));
  }
}
