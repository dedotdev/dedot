import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { ExecutionOptions } from '../../../types/index.js';
import { Interface } from '@ethersproject/abi';

export abstract class SolExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  constructor(
    readonly client: ISubstrateClient<ChainApi>,
    readonly interf: Interface,
    readonly options: ExecutionOptions = {},
  ) { }

  abstract doExecute(...paths: string[]): unknown;
}
