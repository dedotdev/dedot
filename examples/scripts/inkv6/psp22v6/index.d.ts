// Generated by dedot cli

import type { SubstrateApi } from 'dedot/chaintypes';
import type { GenericContractApi, WithLazyStorage } from 'dedot/contracts';
import type { RpcVersion, VersionedGenericSubstrateApi } from 'dedot/types';
import { ConstructorQuery } from './constructor-query.js';
import { ConstructorTx } from './constructor-tx.js';
import { ContractEvents } from './events.js';
import { ContractQuery } from './query.js';
import { ContractTx } from './tx.js';
import type { InkPrimitivesLangError, Psp22v6Token } from './types.js';

export * from './types.js';

/**
 * @name: Psp22v6ContractApi
 * @contractName: psp22v6
 * @contractVersion: 3.0.0
 * @authors: Cardinal
 * @language: ink! 6.0.0-alpha
 **/
export interface Psp22v6ContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends GenericContractApi<Rv, ChainApi> {
  query: ContractQuery<ChainApi[Rv]>;
  tx: ContractTx<ChainApi[Rv]>;
  constructorQuery: ConstructorQuery<ChainApi[Rv]>;
  constructorTx: ConstructorTx<ChainApi[Rv], Psp22v6ContractApi>;
  events: ContractEvents<ChainApi[Rv]>;
  storage: {
    root(): Promise<Psp22v6Token>;
    lazy(): WithLazyStorage<Psp22v6Token>;
  };

  types: {
    RootStorage: Psp22v6Token;
    LazyStorage: WithLazyStorage<Psp22v6Token>;
    LangError: InkPrimitivesLangError;
    ChainApi: ChainApi[Rv];
  };
}
