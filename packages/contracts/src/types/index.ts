import { AccountId32Like, BytesLike, Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { SubstrateApi } from 'dedot/chaintypes';
import { ContractConstructor, ContractMessage } from './shared.js';
import { ContractMetadataV4 } from './v4.js';
import { ContractMetadataV5 } from './v5.js';

export * from './shared.js';

export type ContractMetadata = ContractMetadataV4 | ContractMetadataV5;

export type ConstructorCallOptions = ConstructorOptions & {
  caller: AccountId32Like;
};

export type ContractCallOptions = ContractOptions & {
  caller: AccountId32Like;
};

export type ConstructorTxOptions = ConstructorOptions & {
  gasLimit: Weight;
};

export type ContractTxOptions = ContractOptions & {
  gasLimit: Weight;
};

export type ConstructorOptions = ContractOptions & {
  salt: BytesLike | null;
};

export type ContractOptions = {
  value: bigint;
  gasLimit?: Weight | undefined;
  storageDepositLimit?: bigint | undefined;
};

export type GenericContractResult<DecodedData, ContractResult> =
  | {
      isOk: true;
      data: DecodedData;
      contractResult: ContractResult;
    }
  | {
      isOk: false;
      contractResult: ContractResult;
    };

export type ContractResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['call']>
>;

// Now we are using this one for api.tx.contract.instantiate, api.tx.contract.instantiateWithCode and api.tx.contract.call
// TODO: Write types for api.tx.contract.instantiate and api.tx.contract.instantiateWithCode
export type ChainSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['call']
>;

export type InstantiateWithCodeSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['instantiateWithCode']
>;

export type InstantiateSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['instantiate']
>;

export type GenericConstructorSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> =
  | InstantiateSubmittableExtrinsic<ChainApi>
  | InstantiateWithCodeSubmittableExtrinsic<ChainApi>;

export type GenericContractQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (...args: any) => Promise<GenericContractResult<unknown, ContractResult<ChainApi>>>,
> = F & {
  meta: ContractMessage;
};

export type GenericContractTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => ChainSubmittableExtrinsic<ChainApi>,
> = F & {
  meta: ContractMessage;
};

export type GenericConstructorQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (...args: any) => Promise<ContractResult<ChainApi>>,
> = F & {
  meta: ContractConstructor;
};

export type GenericConstructorTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => ChainSubmittableExtrinsic<ChainApi>,
> = F & {
  meta: ContractConstructor;
};

export interface GenericContractQuery<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericContractQueryCall<ChainApi>;
}

export interface GenericContractTx<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericContractTxCall<ChainApi>;
}

export interface GenericConstructorQuery<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericConstructorQueryCall<ChainApi>;
}

export interface GenericConstructorTx<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericConstructorTxCall<ChainApi>;
}

export interface GenericContractApi<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  query: GenericContractQuery<ChainApi>;
  tx: GenericContractTx<ChainApi>;
  constructorQuery: GenericConstructorQuery<ChainApi>;
  constructorTx: GenericConstructorTx<ChainApi>;
}
