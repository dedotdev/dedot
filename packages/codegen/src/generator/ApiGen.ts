import { TypesGen } from '@delightfuldot/codegen/generator/TypesGen';

export abstract class ApiGen {
  typesGen: TypesGen;
  constructor(typesGen: TypesGen) {
    this.typesGen = typesGen;
  }

  get metadata() {
    return this.typesGen.metadata;
  }
}
