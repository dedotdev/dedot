import { extractContractTypes } from '@dedot/contracts';
import { EnumOptions } from '@dedot/shape';
import { ContractMetadata } from '@dedot/types';
import { TypeRegistry } from './TypeRegistry';

export class TypinkRegistry extends TypeRegistry {
  readonly #metadata: ContractMetadata;

  constructor(metadata: ContractMetadata) {
    super(extractContractTypes(metadata));

    this.#metadata = metadata;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  getEnumOptions(): EnumOptions {
    return {
      tagKey: 'tag',
      valueKey: 'value',
    };
  }
}
