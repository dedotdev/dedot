import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { ExecutionOptions, SolABI } from '../../../types/index.js';

export abstract class SolExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  protected constructor(
    readonly client: ISubstrateClient<ChainApi>,
    readonly abi: SolABI,
    readonly options: ExecutionOptions = {},
  ) {}

  abstract doExecute(...paths: string[]): unknown;
}
