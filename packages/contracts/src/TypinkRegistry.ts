import { TypeRegistry } from '@dedot/codecs';
import { ContractMetadata } from './types/index.js';
import { extractContractTypes } from './utils.js';

export class TypinkRegistry extends TypeRegistry {
  readonly #metadata: ContractMetadata;

  constructor(metadata: ContractMetadata) {
    super(extractContractTypes(metadata));

    this.#metadata = metadata;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }
}
