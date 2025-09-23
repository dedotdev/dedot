import { AccountId32Like, Bytes, BytesLike, DispatchError, Extrinsic, H256, Weight } from '@dedot/codecs';
import { Result } from '@dedot/shape';
import { GenericSubstrateApi, ISubmittableExtrinsic, ISubmittableResult } from '@dedot/types';

export type ContractAddress = string; // ss58 or evm address

/**
 * Flags used by a contract to customize exit behaviour.
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/d2fd53645654d3b8e12cbf735b67b93078d70113/substrate/frame/contracts/uapi/src/flags.rs#L23-L26
 */
export type ReturnFlags = {
  bits: number;
  revert: boolean; // 0x0000_0001
};

export interface GenericContractCallResult<DecodedData = any, ContractResult = any> {
  data: DecodedData;
  raw: ContractResult;
  flags: ReturnFlags;
  inputData: Bytes; // Encoded (selector + arguments) input data
}

export interface GenericConstructorCallResult<DecodedData = any, ContractResult = any>
  extends GenericContractCallResult<DecodedData, ContractResult> {
  address: ContractAddress; // Address of the contract will be instantiated
}

export type ContractCode = { type: 'Upload'; value: Bytes } | { type: 'Existing'; value: H256 };
export type WeightV2 = { refTime: bigint; proofSize: bigint };
export type StorageDeposit = { type: 'Refund'; value: bigint } | { type: 'Charge'; value: bigint };
export type ExecReturnValue = { flags: { bits: number }; data: Bytes };

export type InstantiateReturnValue = {
  result: ExecReturnValue;
  address: ContractAddress;
};

export type ContractCallResult<_ extends GenericSubstrateApi> = {
  gasConsumed: WeightV2;
  gasRequired: WeightV2;
  storageDeposit: StorageDeposit;
  debugMessage?: Bytes;
  result: Result<ExecReturnValue, DispatchError>;
};

export type ContractInstantiateResult<_ extends GenericSubstrateApi> = {
  gasConsumed: WeightV2;
  gasRequired: WeightV2;
  storageDeposit: StorageDeposit;
  debugMessage?: Bytes;
  result: Result<InstantiateReturnValue, DispatchError>;
};

export interface ExecutionOptions {
  defaultCaller?: AccountId32Like;
}

export type CallOptions = {
  value?: bigint;
  gasLimit?: Weight | undefined;
  storageDepositLimit?: bigint | undefined;
};

export type ConstructorCallOptions = CallOptions & {
  salt?: BytesLike;
  caller?: AccountId32Like;
};

export type ConstructorTxOptions = CallOptions & {
  salt?: BytesLike;
};

export type ContractCallOptions = CallOptions & {
  caller?: AccountId32Like;
};

export type ContractTxOptions = CallOptions;
