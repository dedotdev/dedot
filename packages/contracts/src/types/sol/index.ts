import { SubstrateApi } from '@dedot/api/chaintypes/index.js';
import {
  AnyFunc,
  AsyncMethod,
  GenericSubstrateApi,
  IEventRecord,
  RpcVersion,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/codecs/types';
import { ISubmittableResult } from '@dedot/types';
import { ConstructorFragment, EventFragment, FunctionFragment } from '@ethersproject/abi';
import { SolContract } from '../../SolContract.js';
import {
  ContractAddress,
  ContractCallResult,
  ContractInstantiateResult,
  ContractSubmittableExtrinsic,
  ExecutionOptions,
  GenericConstructorCallResult,
  GenericContractCallResult,
  SubmittableExtrinsic,
} from '../shared.js';

export * from './abi.js';

export interface ISolContractInstantiateSubmittableResult<
  ContractApi extends SolGenericContractApi = SolGenericContractApi, // --
> extends ISubmittableResult {
  /**
   * Get deployed contract address
   */
  contractAddress(): Promise<ContractAddress>;

  /**
   * Get deployed contract instance
   */
  contract(options?: ExecutionOptions): Promise<SolContract<ContractApi>>;
}

export type SolGenericInstantiateSubmittableExtrinsic<
  _ extends GenericSubstrateApi,
  ContractApi extends SolGenericContractApi = SolGenericContractApi,
> = SubmittableExtrinsic<ISolContractInstantiateSubmittableResult<ContractApi>>;

export type SolGenericContractQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (...args: any[]) => Promise<GenericContractCallResult<any, ContractCallResult<ChainApi>>>,
> = F & {
  meta: FunctionFragment;
};

export type SolGenericContractTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => ContractSubmittableExtrinsic<ChainApi>,
> = F & {
  meta: FunctionFragment;
};

export type SolGenericConstructorQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (
    ...args: any[]
  ) => Promise<GenericConstructorCallResult<any, ContractInstantiateResult<ChainApi>>>,
> = F & {
  meta: ConstructorFragment;
};

export type SolGenericConstructorTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => SolGenericInstantiateSubmittableExtrinsic<ChainApi>,
> = F & {
  meta: ConstructorFragment;
};

export interface SolGenericContractQuery<ChainApi extends GenericSubstrateApi> {
  [method: string]: SolGenericContractQueryCall<ChainApi>;
}

export interface SolGenericContractTx<ChainApi extends GenericSubstrateApi> {
  [method: string]: SolGenericContractTxCall<ChainApi>;
}

export interface SolGenericConstructorQuery<ChainApi extends GenericSubstrateApi> {
  [method: string]: SolGenericConstructorQueryCall<ChainApi>;
}

export interface SolGenericConstructorTx<ChainApi extends GenericSubstrateApi> {
  [method: string]: SolGenericConstructorTxCall<ChainApi>;
}

export type SolContractEvent<EventName extends string = string, Data extends any = any> = Data extends undefined
  ? {
      name: EventName;
    }
  : {
      name: EventName;
      data: Data;
    };

export interface SolGenericContractEvent<EventName extends string = string, Data extends any = any> {
  is: (event: IEventRecord | SolContractEvent) => event is SolContractEvent<EventName, Data>;
  find: (events: IEventRecord[] | SolContractEvent[]) => SolContractEvent<EventName, Data> | undefined;
  filter: (events: IEventRecord[] | SolContractEvent[]) => SolContractEvent<EventName, Data>[];
  watch: (callback: (events: SolContractEvent<EventName, Data>[]) => void) => Promise<Unsub>;
  meta: EventFragment;
}

export interface SolGenericContractEvents<_ extends GenericSubstrateApi> {
  [event: string]: SolGenericContractEvent;
}

export interface SolGenericContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> {
  query: SolGenericContractQuery<ChainApi[Rv]>;
  tx: SolGenericContractTx<ChainApi[Rv]>;
  constructorQuery: SolGenericConstructorQuery<ChainApi[Rv]>;
  constructorTx: SolGenericConstructorTx<ChainApi[Rv]>;
  events: SolGenericContractEvents<ChainApi[Rv]>;

  types: {
    ChainApi: ChainApi[Rv];
  };
}
