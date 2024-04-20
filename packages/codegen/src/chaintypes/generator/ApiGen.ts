import { TypesGen } from '../generator/index.js';

export abstract class ApiGen {
  constructor(readonly typesGen: TypesGen) {}

  get metadata() {
    return this.typesGen.metadata;
  }

  get registry() {
    return this.typesGen.registry;
  }
}
