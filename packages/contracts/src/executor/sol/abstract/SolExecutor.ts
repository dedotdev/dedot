import { ISubstrateClient } from '@dedot/api';
import { SolRegistry } from '../../../SolRegistry.js';
import { ExecutionOptions, SolAbi } from '../../../types/index.js';

export abstract class SolExecutor {
  protected constructor(
    readonly client: ISubstrateClient,
    readonly registry: SolRegistry,
    readonly options: ExecutionOptions = {},
  ) {}

  get abi(): SolAbi {
    return this.registry.abi;
  }

  abstract doExecute(...paths: string[]): unknown;
}
