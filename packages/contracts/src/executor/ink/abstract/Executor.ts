import { ISubstrateClient } from '@dedot/api';
import { TypinkRegistry } from '../../../TypinkRegistry.js';
import { ContractMessage, ContractMessageArg, ContractMetadata, ExecutionOptions } from '../../../types/index.js';

export abstract class Executor {
  constructor(
    readonly client: ISubstrateClient,
    readonly registry: TypinkRegistry,
    readonly options: ExecutionOptions = {},
  ) {}

  get metadata(): ContractMetadata {
    return this.registry.metadata;
  }

  abstract doExecute(...paths: string[]): unknown;

  tryEncode(param: ContractMessageArg, value: any) {
    const { type } = param.type;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }

  tryDecode(meta: ContractMessage, raw: any) {
    const {
      returnType: { type },
    } = meta;

    const $codec = this.registry.findCodec(type);

    return $codec.tryDecode(raw);
  }
}
