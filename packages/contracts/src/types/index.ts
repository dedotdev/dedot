import { BytesLike, Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, GenericSubstrateApi } from '@dedot/types';
import { ContractMessage } from './shared.js';
import { ContractMetadataV4 } from './v4.js';
import { ContractMetadataV5 } from './v5.js';

export * from './shared.js';

export type ContractMetadata = ContractMetadataV4 | ContractMetadataV5;

export type ContractResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['call']>
>;

// Now we are using this one for api.tx.contract.instantiate, api.tx.contract.instantiateWithCode and api.tx.contract.call
// TODO: Write types for api.tx.contract.instantiate and api.tx.contract.instantiateWithCode
export type ChainSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['call']
>;

export type ConstructorOptions = ContractOptions & {
  salt: BytesLike | null;
};

export type ContractOptions = {
  value: bigint;
  gasLimit: Weight | undefined;
  storageDepositLimit: bigint | undefined;
};

export interface GenericContractResult<DecodedData, ContractResult> {
  data?: DecodedData;
  result: ContractResult;
}

export type GenericContractQueryCall<F extends AsyncMethod = AsyncMethod> = F & {
  meta: ContractMessage;
};

export type GenericContractTxCall<F extends AnyFunc = AnyFunc> = F & {
  meta: ContractMessage;
};

export interface GenericContractQuery {
  [method: string]: GenericContractQueryCall;
}

export interface GenericContractTx {
  [method: string]: GenericContractTxCall;
}

export interface GenericContractApi {
  query: GenericContractQuery;
  tx: GenericContractTx;
  constructor: GenericContractTx;
}
