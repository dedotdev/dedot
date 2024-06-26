// Generated by dedot cli

import type { SubstrateApi } from 'dedot/chaintypes';
import type { GenericContractApi } from 'dedot/contracts';
import type { RpcV2, RpcVersion, VersionedGenericSubstrateApi } from 'dedot/types';
import { ConstructorQuery } from './constructor-query';
import { ConstructorTx } from './constructor-tx';
import { ContractEvents } from './events';
import { ContractQuery } from './query';
import { ContractTx } from './tx';

export interface FlipperContractApi<
  Rv extends RpcVersion = RpcV2,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends GenericContractApi<Rv, ChainApi> {
  query: ContractQuery<ChainApi[Rv]>;
  tx: ContractTx<ChainApi[Rv]>;
  constructorQuery: ConstructorQuery<ChainApi[Rv]>;
  constructorTx: ConstructorTx<ChainApi[Rv]>;
  events: ContractEvents<ChainApi[Rv]>;
}
