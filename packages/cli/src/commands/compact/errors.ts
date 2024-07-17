import { TypeDef } from '@dedot/codecs';
import { DedotError } from '@dedot/utils';

export class UndeterminedSizeType extends DedotError {
  typeDef: TypeDef;

  constructor(typeDef: TypeDef) {
    super();
    this.typeDef = typeDef;
  }
}
