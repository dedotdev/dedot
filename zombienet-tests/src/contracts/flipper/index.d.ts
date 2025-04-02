// Generated by dedot cli

import type { SubstrateApi } from 'dedot/chaintypes';
import type { GenericContractApi } from 'dedot/contracts';
import type { RpcVersion, VersionedGenericSubstrateApi } from 'dedot/types';
import { ConstructorQuery } from './constructor-query.js';
import { ConstructorTx } from './constructor-tx.js';
import { ContractEvents } from './events.js';
import { ContractQuery } from './query.js';
import { ContractTx } from './tx.js';
import type { InkPrimitivesLangError } from './types.js';

export * from './types.js';

/**
 * @name: FlipperContractApi
 * @contractName: flipper
 * @contractVersion: 5.0.0
 * @authors: Parity Technologies <admin@parity.io>
 * @language: ink! 5.0.0
 **/
export interface FlipperContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends GenericContractApi<Rv, ChainApi> {
  query: ContractQuery<ChainApi[Rv]>;
  tx: ContractTx<ChainApi[Rv]>;
  constructorQuery: ConstructorQuery<ChainApi[Rv]>;
  constructorTx: ConstructorTx<ChainApi[Rv]>;
  events: ContractEvents<ChainApi[Rv]>;

  types: {
    LangError: InkPrimitivesLangError;
    ChainApi: ChainApi[Rv];
  };
}
