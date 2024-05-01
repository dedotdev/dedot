import { extractContractTypes } from '@dedot/contracts';
import { EnumOptions } from '@dedot/shape';
import { ContractMetadataSupported } from '@dedot/types';
import { TypeRegistry } from './TypeRegistry.js';

export class TypinkRegistry extends TypeRegistry {
  readonly #metadata: ContractMetadataSupported;

  constructor(metadata: ContractMetadataSupported) {
    super(extractContractTypes(metadata));

    this.#metadata = metadata;
  }

  get metadata(): ContractMetadataSupported {
    return this.#metadata;
  }

  getEnumOptions(): EnumOptions {
    return {
      tagKey: 'tag',
      valueKey: 'value',
    };
  }
}
