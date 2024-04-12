import { AnyFunc, AsyncMethod, ISubmittableExtrinsic, type ISubmittableResult } from '@dedot/types';
import { type Extrinsic, Weight } from '@dedot/codecs';
import type { FrameSystemEventRecord } from '@dedot/cli/codegen/substrateContractsNode';

export type ChainSubmittableExtrinsic = Extrinsic & ISubmittableExtrinsic<ISubmittableResult<FrameSystemEventRecord>>;

export type TxCall = (...args: any[]) => ChainSubmittableExtrinsic;

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

export type GenericContractTxCall<F extends AnyFunc = TxCall> = F & {
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
}

export interface ContractMetadata {
  source: ContractSource;
  contract: ContractInformation;
  spec: ContractSpec;
  storage: ContractStorage;
  types: ContractType[];
  version: string;
}

export interface ContractSpec {
  constructors: ContractConstructor[];
  docs: string[];
  environment: ContractEnvironment;
  events: any[];
  langError: ContractLangError;
  messages: ContractMessage[];
}

export interface ContractConstructor {
  args: Arg[];
  default: boolean;
  docs: string[];
  label: string;
  payable: boolean;
  returnType: ReturnType;
  selector: string;
}

export interface ContractSource {
  hash: string;
  language: string;
  compiler: string;
  buildInfo: BuildInfo;
}

export interface ContractInformation {
  name: string;
  version: string;
  authors: string[];
}

export interface BuildInfo {
  buildMode: string;
  cargoContractVersion: string;
  rustToolchain: string;
  wasmOptSettings: WasmOptSettings;
}

export interface WasmOptSettings {
  keepDebugSymbols: boolean;
  optimizationPasses: string;
}

export interface Arg {
  label: string;
  type: Type;
}

export interface Type {
  displayName: string[];
  type: number;
}

export interface ReturnType {
  displayName: string[];
  type: number;
}

export interface ContractEnvironment {
  accountId: AccountId;
  balance: Balance;
  blockNumber: BlockNumber;
  chainExtension: ChainExtension;
  hash: Hash;
  maxEventTopics: number;
  timestamp: Timestamp;
}

export interface AccountId {
  displayName: string[];
  type: number;
}

export interface Balance {
  displayName: string[];
  type: number;
}

export interface BlockNumber {
  displayName: string[];
  type: number;
}

export interface ChainExtension {
  displayName: string[];
  type: number;
}

export interface Hash {
  displayName: string[];
  type: number;
}

export interface Timestamp {
  displayName: string[];
  type: number;
}

export interface ContractLangError {
  displayName: string[];
  type: number;
}

export interface ContractMessage {
  args: Arg[];
  default: boolean;
  docs: string[];
  label: string;
  mutates: boolean;
  payable: boolean;
  returnType: ReturnType;
  selector: string;
}

export interface ContractType {
  id: number;
  type: ContractTypeDef;
}

export interface ContractTypeDef {
  def: Def;
  path?: string[];
  params?: Param[];
}

export interface Def {
  composite?: Composite;
  array?: Array;
  primitive?: string;
  sequence?: Sequence;
  variant?: Variant;
  tuple?: number[];
}

export interface Composite {
  fields: {
    type: number;
    typeName: string;
    name?: string;
  }[];
}

export interface Array {
  len: number;
  type: number;
}

export interface Sequence {
  type: number;
}

export interface Variant {
  variants?: {
    index: number;
    name: string;
    fields?: {
      type: number;
      typeName?: string;
      name?: string;
    }[];
  }[];
}

export interface Param {
  name: string;
  type: number;
}

export interface ContractStorage {
  root: {
    layout: {
      struct: {
        fields: any[];
        name: string;
      };
    };
    root_key: string;
  };
}
