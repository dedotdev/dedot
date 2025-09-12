import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { FormatTypes, Interface } from '@ethersproject/abi';
import { ExecutionOptions, SolABIItem } from '../../../types/index.js';

export abstract class SolExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  protected constructor(
    readonly client: ISubstrateClient<ChainApi>,
    readonly interf: Interface,
    readonly options: ExecutionOptions = {},
  ) {}

  get abiItems(): SolABIItem[] {
    return JSON.parse(this.interf.format(FormatTypes.json) as string);
  }

  abstract doExecute(...paths: string[]): unknown;
}
