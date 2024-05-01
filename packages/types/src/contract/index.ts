import { BytesLike, Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, ContractMessage, GenericSubstrateApi } from '@dedot/types';

export * from './metadata';

export type ContractResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['call']>
>;

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
  data: DecodedData;
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
