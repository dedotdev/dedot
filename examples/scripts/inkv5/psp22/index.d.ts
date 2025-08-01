// Generated by dedot cli

import type { SubstrateApi } from 'dedot/chaintypes';
import type { GenericContractApi, WithLazyStorage } from 'dedot/contracts';
import type { RpcVersion, VersionedGenericSubstrateApi } from 'dedot/types';
import { ConstructorQuery } from './constructor-query.js';
import { ConstructorTx } from './constructor-tx.js';
import { ContractEvents } from './events.js';
import { ContractQuery } from './query.js';
import { ContractTx } from './tx.js';
import type { InkPrimitivesLangError, Psp22Token } from './types.js';

export * from './types.js';

/**
 * @name: Psp22ContractApi
 * @contractName: psp22
 * @contractVersion: 2.0.0
 * @authors: Cardinal
 * @language: ink! 5.0.0
 **/
export interface Psp22ContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends GenericContractApi<Rv, ChainApi> {
  query: ContractQuery<ChainApi[Rv]>;
  tx: ContractTx<ChainApi[Rv]>;
  constructorQuery: ConstructorQuery<ChainApi[Rv]>;
  constructorTx: ConstructorTx<ChainApi[Rv], Psp22ContractApi>;
  events: ContractEvents<ChainApi[Rv]>;
  storage: {
    root(): Promise<Psp22Token>;
    lazy(): WithLazyStorage<Psp22Token>;
  };

  types: {
    RootStorage: Psp22Token;
    LazyStorage: WithLazyStorage<Psp22Token>;
    LangError: InkPrimitivesLangError;
    ChainApi: ChainApi[Rv];
  };
}
